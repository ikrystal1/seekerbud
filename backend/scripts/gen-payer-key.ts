import { writeFileSync } from "fs";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

/**
 * Generates the x402 payer wallet keypair using @solana/web3.js and writes
 * it in the standard Solana keypair JSON format (64-byte Uint8Array array)
 * — the same format `solana-keygen new` produces, so it works with the
 * Solana CLI too (e.g. `solana airdrop` into the pubkey).
 *
 * NEVER commit the output (payer-key.json is gitignored).
 */
const OUT = "payer-key.json";

const keypair = Keypair.generate();
const secretArray = Array.from(keypair.secretKey);
const secretBase58 = bs58.encode(keypair.secretKey);

// Standard solana-keygen file format: JSON array of 64 bytes
writeFileSync(OUT, JSON.stringify(secretArray));

console.log("Payer wallet generated → " + OUT + " (solana-keygen format)");
console.log("Public key : " + keypair.publicKey.toBase58());
console.log("Secret b58 : " + secretBase58);
console.log("");
console.log("Next steps:");
console.log(`  1. Set X402_PAYER_PRIVATE_KEY="${secretBase58}" in Railway env`);
console.log("  2. Fund the public key with devnet USDC (test) or mainnet USDC (live)");
console.log("  3. If you install the Solana CLI later: `solana-keygen pubkey payer-key.json`");
