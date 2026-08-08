import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccount,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function airdropWithRetry(
  connection: Connection,
  to: PublicKey,
  lamports: number,
  tries = 6
): Promise<void> {
  for (let i = 1; i <= tries; i++) {
    try {
      const sig = await connection.requestAirdrop(to, lamports);
      await connection.confirmTransaction(sig, "confirmed");
      return;
    } catch (err) {
      console.log(`  airdrop attempt ${i}/${tries} failed: ${err instanceof Error ? err.message : err}`);
      await sleep(5000 * i);
    }
  }
  throw new Error("airdrop failed after retries");
}

/**
 * Funds the mock-gateway test wallet on devnet:
 *  - airdrops devnet SOL for fees
 *  - creates a personal token mint + mints 1,000 tokens to the payer ATA
 *  - creates the mock recipient's ATA with a balance
 * The mock gateway points its requirements at this mint so the x402 SDK's
 * transfer simulation succeeds. No Circle faucet needed.
 *
 * Usage: npx tsx scripts/setup-mock.ts
 * Outputs: .env.mock  (point mockGateway at it via X402_MOCK_MINT / X402_MOCK_RECIPIENT)
 */
async function main() {
  const rpc = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(rpc, "confirmed");

  const payer = Keypair.generate();
  console.log("payer:", payer.publicKey.toBase58());

  console.log("airdropping devnet SOL...");
  await airdropWithRetry(connection, payer.publicKey, 2 * LAMPORTS_PER_SOL);
  console.log("airdrop ok");

  console.log("creating token mint...");
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    6
  );
  console.log("mint:", mint.toBase58());

  const payerAta = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );
  console.log("payer ATA:", payerAta.address.toBase58());

  console.log("minting 1,000 tokens to payer...");
  const mintSig = await mintTo(
    connection,
    payer,
    mint,
    payerAta.address,
    payer.publicKey,
    1_000_000_000_000
  );
  await connection.confirmTransaction(mintSig, "confirmed");
  console.log("mint ok:", mintSig.slice(0, 12) + "…");

  const recipient = Keypair.generate();
  console.log("creating recipient ATA...");
  await createAssociatedTokenAccount(
    connection,
    payer,
    mint,
    recipient.publicKey
  );

  const env = [
    `X402_MOCK_MINT=${mint.toBase58()}`,
    `X402_MOCK_RECIPIENT=${recipient.publicKey.toBase58()}`,
    `X402_PAYER_PRIVATE_KEY=${Buffer.from(payer.secretKey).toString("base64")}`,
  ];
  fs.writeFileSync(path.join(__dirname, "..", ".env.mock"), env.join("\n") + "\n");
  console.log("\nwrote .env.mock");
  console.log("mock recipient:", recipient.publicKey.toBase58());
}

main().catch((err) => {
  console.error("setup failed:", err.message);
  process.exit(1);
});
