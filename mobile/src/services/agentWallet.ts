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
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getMint,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
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
// regardless of which cluster the app UI is pointing at.
const HELIUS_API_KEY = process.env.EXPO_PUBLIC_HELIUS_API_KEY ?? "";

const HELIUS_URL = HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : "";

export const X402_MAINNET_CONNECTION = HELIUS_URL
  ? new Connection(HELIUS_URL, "confirmed")
  : new Connection(
      process.env.EXPO_PUBLIC_MAINNET_RPC ?? "https://api.mainnet-beta.solana.com",
      "confirmed"
    );

const X402_FALLBACK_CONNECTION = new Connection(
  process.env.EXPO_PUBLIC_MAINNET_RPC ?? "https://api.mainnet-beta.solana.com",
  "confirmed"
);

/**
 * Run an RPC call against Helius, falling back to the public mainnet
 * endpoint if it fails (rate limit, network, outage). Each attempt
 * times out after 8s so the fallback kicks in faster.
 */
export async function x402Rpc<T>(
  fn: (connection: Connection) => Promise<T>
): Promise<T> {
  const call = async (conn: Connection): Promise<T> => {
    return Promise.race([
      fn(conn),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("RPC timeout after 8s")), 8_000)
      ),
    ]);
  };

  if (HELIUS_URL) {
    try {
      return await call(X402_MAINNET_CONNECTION);
    } catch (err) {
      console.warn("[x402Rpc] Helius failed, falling back:", (err as Error).message);
    }
  }
  return call(X402_FALLBACK_CONNECTION);
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
 *
 * If the payer's USDC ATA doesn't exist yet, a createAssociatedTokenAccount
 * instruction is prepended (funded by `payer`) so the transfer doesn't fail
 * simulation with AccountNotFound — the x402 SDK never creates token
 * accounts itself.
 */
export async function buildX402PaymentTransaction(
  requirement: X402PaymentRequirement,
  payer: PublicKey
): Promise<VersionedTransaction> {
  const mint = new PublicKey(requirement.asset);
  const payTo = new PublicKey(requirement.payTo);
  const feePayer = requirement.feePayer
    ? new PublicKey(requirement.feePayer)
    : payer;

  const { decimals } = await x402Rpc((c) => getMint(c, mint));
  const senderAta = await getAssociatedTokenAddress(mint, payer);
  const recipientAta = await getAssociatedTokenAddress(mint, payTo);

  const instructions: TransactionInstruction[] = [];

  const senderAtaInfo = await x402Rpc((c) => c.getAccountInfo(senderAta));
  if (!senderAtaInfo) {
    console.log(
      `[pay] payer ATA missing — creating ${senderAta.toBase58()} (funded by ${payer.toBase58()})`
    );
    instructions.push(
      createAssociatedTokenAccountInstruction(
        payer,
        senderAta,
        payer,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  instructions.push(
    createTransferCheckedInstruction(
      senderAta,
      mint,
      recipientAta,
      payer,
      BigInt(requirement.amount),
      decimals,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  const { blockhash } = await x402Rpc((c) => c.getLatestBlockhash());
  // Use VersionedTransaction (v0 message) — matches what @solana/kit sends
  const message = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: senderAtaInfo ? 10000 : 20000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }),
      ...instructions,
    ],
  }).compileToV0Message();
  return new VersionedTransaction(message);
}

/**
 * Encode a signed payment transaction into the payment-signature header the
 * gateway expects: Base64(JSON {x402Version, scheme, network, payload:{transaction}}).
 */
export function encodeX402Payment(
  requirement: X402PaymentRequirement,
  signedTransaction: VersionedTransaction | Transaction
): string {
  // Build the PaymentPayload exactly as the x402 SDK expects
  const txBase64 = Buffer.from(signedTransaction.serialize()).toString("base64");
  const cleanTxBase64 = txBase64.replace(/\s/g, "");

  const payment = {
    x402Version: requirement.x402Version,
    scheme: requirement.scheme,
    network: requirement.network,
    payload: {
      transaction: cleanTxBase64,
    },
  };
  const json = JSON.stringify(payment);
  const encoded = Buffer.from(json, "utf8").toString("base64").replace(/\s/g, "");
  const valid = /^[A-Za-z0-9+/]*={0,2}$/.test(encoded);
  console.log("[pay] json:", json.length, "encoded:", encoded.length, "valid base64:", valid);
  if (!valid) {
    console.error("[pay] WARNING: encoded payment is not valid base64!");
  }
  return encoded;
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
  transaction.sign([keypair]);
  return encodeX402Payment(requirement, transaction);
}
