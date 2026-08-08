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
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
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
 * Return the devnet USDC balance of the agent wallet (human-readable, e.g. 1.50).
 * Returns 0 if the token account does not exist yet (unfunded).
 */
export async function getAgentWalletUsdcBalance(
  connection: Connection,
  agentPublicKey: string
): Promise<number> {
  try {
    const owner = new PublicKey(agentPublicKey);
    const tokenAddress = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      owner
    );
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
 * Build and sign a USDC transfer on-device using the agent wallet.
 * Returns a base64-encoded signed transaction ready to relay to the backend.
 *
 * This is called silently before every chat message — no auth prompt.
 */
export async function signUsdcPayment(
  connection: Connection,
  wallet: AgentWallet,
  recipientBase58: string,
  amountUsdc: number
): Promise<string> {
  const keypair = Keypair.fromSecretKey(wallet.secretKey);
  const owner = keypair.publicKey;
  const recipient = new PublicKey(recipientBase58);

  const senderAta = await getAssociatedTokenAddress(USDC_MINT_DEVNET, owner);
  const recipientAta = await getAssociatedTokenAddress(USDC_MINT_DEVNET, recipient);

  const amountSmallest = Math.round(amountUsdc * Math.pow(10, USDC_DECIMALS));

  const transferIx = createTransferInstruction(
    senderAta,
    recipientAta,
    owner,
    amountSmallest,
    [],
    TOKEN_PROGRAM_ID
  );

  const { blockhash } = await connection.getLatestBlockhash();
  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: owner,
  }).add(transferIx);

  transaction.sign(keypair);

  return Buffer.from(transaction.serialize()).toString("base64");
}
