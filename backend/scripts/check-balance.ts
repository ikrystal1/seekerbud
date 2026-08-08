import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

const USDC_MINT_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const USDC_MINT_MAINNET = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

const PUBKEY_ARG = process.argv[2];
const RPC_URL = process.argv[3] ?? process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const NETWORK = RPC_URL.includes("devnet") ? "devnet" : RPC_URL.includes("mainnet") ? "mainnet" : RPC_URL;

async function main() {
  if (!PUBKEY_ARG) {
    console.error("Usage: npm run check:balance <publicKey> [rpcUrl]");
    console.error("Example: npm run check:balance CBLJ4AcE9UkMr3s92n6K4y4Yi6WWVbyFR2p8jyNdfPMF");
    process.exit(1);
  }

  const pubkey = new PublicKey(PUBKEY_ARG);
  const connection = new Connection(RPC_URL, "confirmed");

  const sol = await connection.getBalance(pubkey);
  console.log(`Network   : ${NETWORK}`);
  console.log(`Address   : ${pubkey.toBase58()}`);
  console.log(`SOL       : ${(sol / 1e9).toFixed(6)}`);

  for (const [label, mint] of [
    ["USDC (devnet)", USDC_MINT_DEVNET],
    ["USDC (mainnet)", USDC_MINT_MAINNET],
  ] as const) {
    try {
      const ata = await getAssociatedTokenAddress(mint, pubkey);
      const info = await connection.getAccountInfo(ata);
      if (!info) {
        console.log(`${label.padEnd(14)}: 0 (no token account)`);
        continue;
      }
      const { value } = await connection.getTokenAccountBalance(ata);
      console.log(`${label.padEnd(14)}: ${Number(value.uiAmount ?? 0).toFixed(6)}`);
    } catch {
      console.log(`${label.padEnd(14)}: n/a`);
    }
  }
}

main().catch((err) => {
  console.error("check:balance failed:", err.message ?? err);
  process.exit(1);
});
