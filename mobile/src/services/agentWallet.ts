/**
 * Agent wallet service — on-device prepaid wallet for x402 AI payments.
 *
 * The secret key is stored in Android Keystore / iOS Keychain via
 * expo-secure-store (hardware-backed encryption, no auth prompt required).
 * The app can sign x402 USDC payments silently — no fingerprint popup.
 *
 * This wallet holds ONLY a small USDC float (~$1–5) for AI costs.
 * It never touches the user's main Seed Vault wallet.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Buffer } from "buffer";

// ── Storage keys ───────────────────────────────────────────────────────────────
// Secret key → Android Keystore / iOS Keychain (hardware-backed encryption)
const AGENT_KEYPAIR_SECURE_KEY = "agent_wallet_secretkey";
// Public key → plain AsyncStorage (not sensitive — it's public)
const AGENT_PUBKEY_KEY = "agent_wallet_pubkey";

// ── USDC constants ─────────────────────────────────────────────────────────────
export const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);
export const USDC_MINT_MAINNET = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
export const USDC_DECIMALS = 6;

// x402 payments happen on Solana mainnet (the AI gateways live there),
// regardless of which cluster the app UI is pointing at. Helius primary,
// public mainnet RPC as fallback. NOTE: the Helius key ships in the app
// bundle, so it must be rotated before any app-store release (or proxied
// via the backend).
const HELIUS_API_KEY = process.env.EXPO_PUBLIC_HELIUS_API_KEY ?? "";

export const X402_MAINNET_CONNECTION = new Connection(
  `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
  "confirmed"
);
const X402_FALLBACK_CONNECTION = new Connection(
  process.env.EXPO_PUBLIC_MAINNET_RPC ?? "https://api.mainnet-beta.solana.com",
  "confirmed"
);

/**
 * Run an RPC call against Helius, falling back to the public mainnet
 * endpoint if it fails (rate limit, network, outage).
 */
export async function x402Rpc<T>(
  fn: (connection: Connection) => Promise<T>
): Promise<T> {
  try {
    return await fn(X402_MAINNET_CONNECTION);
  } catch {
    return fn(X402_FALLBACK_CONNECTION);
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────
export type AgentWallet = {
  publicKey: string;    // base58 — safe to display / share
  secretKey: Uint8Array; // never leaves the device
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function keypairToWallet(keypair: Keypair): AgentWallet {
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: keypair.secretKey,
  };
}

// ── Core wallet management ─────────────────────────────────────────────────────

/**
 * Generate a new Keypair, persist the secret key to Android Keystore /
 * iOS Keychain, and return the AgentWallet.
 * Any previously stored keypair is overwritten.
 */
export async function generateAgentWallet(): Promise<AgentWallet> {
  const keypair = Keypair.generate();

  // Secret key → hardware-backed secure storage (encrypted at rest, no auth prompt)
  await SecureStore.setItemAsync(
    AGENT_KEYPAIR_SECURE_KEY,
    JSON.stringify(Array.from(keypair.secretKey))
  );

  // Public key → plain AsyncStorage (not sensitive)
  await AsyncStorage.setItem(AGENT_PUBKEY_KEY, keypair.publicKey.toBase58());

  return keypairToWallet(keypair);
}

/**
 * Load an existing agent wallet from secure storage.
 * Returns null if none has been generated yet.
 */
export async function loadAgentWallet(): Promise<AgentWallet | null> {
  try {
    const stored = await SecureStore.getItemAsync(AGENT_KEYPAIR_SECURE_KEY);
    if (!stored) return null;
    const secretKey = new Uint8Array(JSON.parse(stored));
    const keypair = Keypair.fromSecretKey(secretKey);
    return keypairToWallet(keypair);
  } catch (err) {
    console.error("[agentWallet] loadAgentWallet failed:", err);
    return null;
  }
}

/**
 * Load existing or generate a new agent wallet.
 * This is the main entry point — always returns a valid wallet.
 */
export async function getOrCreateAgentWallet(): Promise<AgentWallet> {
  const existing = await loadAgentWallet();
  if (existing) return existing;
  return generateAgentWallet();
}

/**
 * Delete the agent wallet from secure storage (e.g. on disconnect).
 */
export async function clearAgentWallet(): Promise<void> {
  await SecureStore.deleteItemAsync(AGENT_KEYPAIR_SECURE_KEY);
  await AsyncStorage.removeItem(AGENT_PUBKEY_KEY);
}

// ── USDC balance ───────────────────────────────────────────────────────────────

/**
 * Return the USDC balance of the agent wallet (human-readable, e.g. 1.50).
 * Defaults to the mainnet mint (where x402 payments live). Returns 0 if the
 * token account does not exist yet (unfunded).
 */
export async function getAgentWalletUsdcBalance(
  connection: Connection,
  agentPublicKey: string,
  mint: PublicKey = USDC_MINT_MAINNET
): Promise<number> {
  try {
    const owner = new PublicKey(agentPublicKey);
    const tokenAddress = await getAssociatedTokenAddress(mint, owner);
    const accountInfo = await connection.getAccountInfo(tokenAddress);
    if (!accountInfo) return 0;
    const { value } = await connection.getTokenAccountBalance(tokenAddress);
    return Number(value.uiAmount ?? 0);
  } catch {
    return 0;
  }
}

// ── x402 payment signing ───────────────────────────────────────────────────────

/**
 * The payment terms the backend forwarded from the gateway — the fields the
 * exact-SVM scheme needs to build the transfer. Structurally satisfied by
 * PaymentRequirement from services/chat.
 */
export type X402PaymentRequirement = {
  x402Version: number;
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  feePayer?: string;
};

/**
 * Build the EXACT x402 payment transaction (mirrors the official x402 client):
 *  - v0 message with compute unit limit + 1 microlamport priority fee
 *  - fee payer = the gateway's feePayer (the relayer adds its signature)
 *  - transferChecked of exactly `amount` from the payer's ATA → payTo's ATA
 * `payer` is the KEY that signs the transfer (agent wallet or Seed Vault
 * address) — the authority over the USDC being paid.
 */
export async function buildX402PaymentTransaction(
  requirement: X402PaymentRequirement,
  payer: PublicKey
): Promise<Transaction> {
  const mint = new PublicKey(requirement.asset);
  const payTo = new PublicKey(requirement.payTo);
  const feePayer = requirement.feePayer
    ? new PublicKey(requirement.feePayer)
    : payer;

  const { decimals } = await x402Rpc((c) => getMint(c, mint));
  const senderAta = await getAssociatedTokenAddress(mint, payer);
  const recipientAta = await getAssociatedTokenAddress(mint, payTo);

  const transferIx = createTransferCheckedInstruction(
    senderAta,
    mint,
    recipientAta,
    payer,
    BigInt(requirement.amount),
    decimals,
    [],
    TOKEN_PROGRAM_ID
  );

  const { blockhash } = await x402Rpc((c) => c.getLatestBlockhash());
  return new Transaction({ recentBlockhash: blockhash, feePayer })
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 4000 }))
    .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }))
    .add(transferIx);
}

/**
 * Encode a signed payment transaction into the payment-signature header the
 * gateway expects: Base64(JSON {scheme, network, x402Version, payload:{transaction}}).
 */
export function encodeX402Payment(
  requirement: X402PaymentRequirement,
  signedTransaction: Transaction
): string {
  const payment = {
    scheme: requirement.scheme,
    network: requirement.network,
    x402Version: requirement.x402Version,
    payload: {
      transaction: Buffer.from(signedTransaction.serialize()).toString("base64"),
    },
  };
  return Buffer.from(JSON.stringify(payment)).toString("base64");
}

/**
 * Build + sign an x402 payment with the on-device agent wallet.
 * Silent — no auth prompt. Returns the payment-signature header value.
 */
export async function signX402Payment(
  wallet: AgentWallet,
  requirement: X402PaymentRequirement
): Promise<string> {
  const keypair = Keypair.fromSecretKey(wallet.secretKey);
  const transaction = await buildX402PaymentTransaction(requirement, keypair.publicKey);
  transaction.sign(keypair);
  return encodeX402Payment(requirement, transaction);
}
