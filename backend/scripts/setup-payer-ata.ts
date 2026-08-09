/**
 * One-time payer wallet setup:
 *   1. Funds SOL rent + fee by creating the USDC ATA (requires some SOL first)
 *   2. Verifies the USDC ATA exists
 *
 * Prereq: send SOL (and USDC to fill the balance) to the payer address first.
 */
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "fs";

const RPC =
  process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : "https://api.mainnet-beta.solana.com";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const raw = JSON.parse(fs.readFileSync("payer-key.json", "utf8"));
  const payer = Keypair.fromSecretKey(new Uint8Array(raw));

  const solBal = await conn.getBalance(payer.publicKey);
  console.log("Payer:", payer.publicKey.toBase58());
  console.log("SOL:", solBal / 1e9);
  if (solBal < 0.01 * 1e9) {
    console.error("Not enough SOL — send at least 0.01 SOL to the payer first.");
    process.exit(1);
  }

  const mint = new PublicKey(USDC_MINT);
  const ata = await getAssociatedTokenAddress(mint, payer.publicKey);
  console.log("USDC ATA:", ata.toBase58());

  const info = await conn.getParsedAccountInfo(ata);
  if (info.value) {
    const bal = await conn.getTokenAccountBalance(ata);
    console.log("ATA exists — USDC:", bal.value.uiAmount);
    return;
  }

  console.log("Creating ATA...");
  const tx = new (await import("@solana/web3.js")).Transaction().add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ata,
      payer.publicKey,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );
  const { blockhash } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer);
  const sig = await conn.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 2,
  });
  await conn.confirmTransaction(sig, "confirmed");
  console.log("ATA created:", sig);

  const bal = await conn.getTokenAccountBalance(ata);
  console.log("USDC:", bal.value.uiAmount);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
