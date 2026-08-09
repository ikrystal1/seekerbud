/**
 * Test: use the OFFICIAL x402 SDK to sign and send a payment directly to Solvela.
 * This bypasses our backend entirely to isolate the issue.
 */
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import * as x402 from "x402/client";
import { svm } from "x402/shared";

const GATEWAY = "https://api.solvela.ai/v1/chat/completions";
const HELIUS_KEY = "c832634b-d45d-4adb-a2c2-1423faa71996";
const RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;

const PAYER_BYTES = new Uint8Array([49,188,27,161,27,127,119,58,201,164,19,106,119,67,238,228,83,152,21,47,75,53,6,94,240,26,217,149,39,47,84,223,166,22,46,28,193,106,167,230,233,52,249,230,114,199,136,34,142,183,128,68,14,124,11,223,209,85,0,226,22,221,235,254]);

async function main() {
  const payerBase58 = bs58.encode(PAYER_BYTES);
  console.log("Payer:", payerBase58.slice(0, 16), "...");

  // Step 1: Hit gateway, get 402
  console.log("\n--- Step 1: Request ---");
  const res1 = await fetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
      stream: false,
    }),
  });
  console.log("Status:", res1.status);
  const body1 = await res1.text();
  console.log("Body:", body1.slice(0, 600));

  if (res1.status !== 402) {
    console.log("Expected 402, got", res1.status);
    return;
  }

  const req = JSON.parse(body1);
  const option = req.accepts[0];

  // Step 2: Use official x402 SDK to create payment header
  console.log("\n--- Step 2: Official x402 SDK sign ---");
  const signer = await svm.createSignerFromBase58(payerBase58);
  console.log("Signer address:", signer.address);

  const paymentRequirements = {
    scheme: option.scheme,
    network: option.network,
    maxAmountRequired: option.amount ?? option.maxAmountRequired,
    asset: option.asset,
    payTo: option.pay_to ?? option.payTo,
    maxTimeoutSeconds: option.max_timeout_seconds ?? 300,
    extra: option.extra ?? {},
  };

  const paymentHeader = await x402.createPaymentHeader(
    signer,
    req.x402_version ?? 2,
    paymentRequirements,
    { svmConfig: { rpcUrl: RPC } }
  );
  console.log("Payment header length:", paymentHeader.length);
  console.log("Preview:", paymentHeader.slice(0, 50), "...", paymentHeader.slice(-20));

  // Decode and show the payload
  const decoded = JSON.parse(Buffer.from(paymentHeader, "base64").toString("utf8"));
  console.log("Payload structure:", {
    x402Version: decoded.x402Version,
    scheme: decoded.scheme,
    network: decoded.network,
    txLen: decoded.payload?.transaction?.length,
  });

  // Step 3: Send payment to gateway
  console.log("\n--- Step 3: Send payment ---");
  const res2 = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "payment-signature": paymentHeader,
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
      stream: false,
    }),
  });
  console.log("Status:", res2.status);
  const body2 = await res2.text();
  console.log("Response:", body2.slice(0, 800));
}

main().catch(console.error);
