import { writeFileSync } from "fs";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

/**
 * Generates the x402 payer wallet keypair and writes it to payer-key.json.
 *
 * This wallet is OUR cost-of-goods wallet — it pays the LLM gateway the
 * wholesale x402 price so we can capture the margin between what users pay
 * and what the LLM costs.
 *
 * NEVER commit payer-key.json (it is gitignored). Fund it with USDC before
 * enabling X402_GATEWAY_URL.
 */
const OUT = "payer-key.json";

const keypair = Keypair.generate();
const secretBase58 = bs58.encode(keypair.secretKey);

writeFileSync(OUT, JSON.stringify({ publicKey: keypair.publicKey.toBase58(), secretKey: secretBase58 }, null, 2));

console.log("Payer wallet generated → " + OUT);
console.log("Public key : " + keypair.publicKey.toBase58());
console.log("");
console.log("Next steps:");
console.log(`  1. Set X402_PAYER_PRIVATE_KEY="${secretBase58}" in Railway env`);
console.log("  2. Fund the public key with devnet USDC (test) or mainnet USDC (live)");
