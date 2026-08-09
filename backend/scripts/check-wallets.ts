import "dotenv/config";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const conn = new Connection(
  process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
  "confirmed"
);
const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

async function check(label: string, addr: string) {
  const pk = new PublicKey(addr);
  const sol = await conn.getBalance(pk);
  console.log(`\n${label}: ${pk.toBase58()}`);
  console.log(`  SOL : ${(sol / LAMPORTS_PER_SOL).toFixed(6)}`);
  try {
    const accounts = await conn.getTokenAccountsByOwner(pk, { mint: USDC });
    if (accounts.value.length === 0) {
      console.log("  USDC: NO ATA ACCOUNT");
    } else {
      for (const a of accounts.value) {
        const info = await getAccount(conn, a.pubkey, "confirmed", TOKEN_PROGRAM_ID);
        console.log(`  USDC: ${(Number(info.amount) / 1e6).toFixed(4)} (ATA ${a.pubkey.toBase58()})`);
      }
    }
  } catch (e: any) {
    console.log("  USDC err:", e.message);
  }
}

main().catch((e) => console.error("FATAL:", e));

async function main() {
  await check("CONNECTED (payer in log)", "9bACW4TJ4txRyLxXBcUk2LCoDrkXkkbAcUqxCC3sXu2C");
  await check("SERVER PAYER (payer-key.json)", "CBLJ4AcE9UkMr3s92n6K4y4Yi6WWVbyFR2p8jyNdfPMF");
  await check("SOLVELA payTo", "9QGtTUpvLmhggDuBciAeE67MmhECVFYdFLD7xKD4RSno");
}
