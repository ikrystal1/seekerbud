/**
 * Test: Official x402 SDK with NORMALIZED network ("solana")
 */
import bs58 from "bs58";
import * as x402 from "x402/client";
import { svm } from "x402/shared";

const GATEWAY = "https://api.solvela.ai/v1/chat/completions";
const RPC = "https://mainnet.helius-rpc.com/?api-key=c832634b-d45d-4adb-a2c2-1423faa71996";
const PAYER_BYTES = new Uint8Array([49,188,27,161,27,127,119,58,201,164,19,106,119,67,238,228,83,152,21,47,75,53,6,94,240,26,217,149,39,47,84,223,166,22,46,28,193,106,167,230,233,52,249,230,114,199,136,34,142,183,128,68,14,124,11,223,209,85,0,226,22,221,235,254]);

async function main() {
  // First 32 bytes = secret key
  const secretKey = bs58.encode(PAYER_BYTES.slice(0, 32));
  console.log("Secret key (base58):", secretKey.slice(0, 10) + "...");

  // Also encode full keypair for our hand-rolled version
  const keypairBase58 = bs58.encode(PAYER_BYTES);
  console.log("Keypair (base58):", keypairBase58.slice(0, 10) + "...");

  // Step 1: Get payment requirement
  console.log("\n--- Step 1: Get requirement ---");
  const res1 = await fetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: "openai/gpt-4o-mini", messages: [{ role: "user", content: "hi" }], stream: false }),
  });
  const req = JSON.parse(await res1.text());
  const option = req.accepts[0];
  console.log("Amount:", option.amount);
  console.log("PayTo:", option.pay_to);
  console.log("Asset:", option.asset);

  // Step 2: Sign with official SDK (NORMALIZED network)
  console.log("\n--- Step 2: Official SDK sign ---");
  const signer = await svm.createSignerFromBase58(keypairBase58); // try full keypair
  console.log("Signer address:", signer.address);

  const paymentHeader = await x402.createPaymentHeader(
    signer,
    req.x402_version,
    {
      scheme: "exact",
      network: "solana",
      maxAmountRequired: option.amount,
      asset: option.asset,
      payTo: option.pay_to,
      maxTimeoutSeconds: option.max_timeout_seconds ?? 300,
    },
    { svmConfig: { rpcUrl: RPC } }
  );

  console.log("SDK header len:", paymentHeader.length);
  const decoded = JSON.parse(Buffer.from(paymentHeader, "base64").toString());
  console.log("Payload:", { v: decoded.x402Version, scheme: decoded.scheme, network: decoded.network, txLen: decoded.payload.transaction.length });

  // Step 3: Send to gateway
  console.log("\n--- Step 3: Send payment ---");
  const res2 = await fetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json", "payment-signature": paymentHeader },
    body: JSON.stringify({ model: "openai/gpt-4o-mini", messages: [{ role: "user", content: "hi" }], stream: false }),
  });
  console.log("Status:", res2.status);
  const body2 = await res2.text();
  console.log("Response:", body2.slice(0, 800));
}

main().catch((e) => console.error("FAILED:", e.message));
