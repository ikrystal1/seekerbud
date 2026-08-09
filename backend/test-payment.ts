/**
 * CLI test: sign an x402 payment and send it to the backend.
 * Usage: npx tsx test-payment.ts
 */
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getMint,
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const BACKEND = "https://seekerbud-production.up.railway.app";
const APP_KEY = "BUmeSy1ClJLWfXZE7PNg845aFc6RbATD";
const HELIUS_KEY = "c832634b-d45d-4adb-a2c2-1423faa71996";
const RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;

// Payer key from payer-key.json
const PAYER_BYTES = [49,188,27,161,27,127,119,58,201,164,19,106,119,67,238,228,83,152,21,47,75,53,6,94,240,26,217,149,39,47,84,223,166,22,46,28,193,106,167,230,233,52,249,230,114,199,136,34,142,183,128,68,14,124,11,223,209,85,0,226,22,221,235,254];

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const payer = Keypair.fromSecretKey(new Uint8Array(PAYER_BYTES));
  console.log("Payer:", payer.publicKey.toBase58());

  // Check balances
  const solBal = await conn.getBalance(payer.publicKey);
  console.log("SOL:", solBal / 1e9);

  const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const ata = await getAssociatedTokenAddress(usdcMint, payer.publicKey);
  try {
    const bal = await conn.getTokenAccountBalance(ata);
    console.log("USDC:", bal.value.uiAmount);
  } catch {
    console.log("USDC: no token account");
  }

  // Step 1: Get payment requirement
  console.log("\n--- Step 1: Request payment ---");
  const res1 = await fetch(`${BACKEND}/api/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-app-key": APP_KEY,
    },
    body: JSON.stringify({
      address: payer.publicKey.toBase58(),
      message: "hi",
      fundingMode: "prepaid",
    }),
  });

  const text1 = await res1.text();
  console.log("Response:", text1.slice(0, 300));

  // Parse the payment_request
  const match = text1.match(/data: (\{.*?\})\n\n/);
  if (!match) {
    console.log("No payment_request found");
    return;
  }
  const req = JSON.parse(match[1]);
  console.log("\nPayment requirement:", JSON.stringify(req, null, 2));

  // Step 2: Build and sign the transaction
  console.log("\n--- Step 2: Build & sign transaction ---");
  const mint = new PublicKey(req.asset);
  const payTo = new PublicKey(req.pay_to);
  const feePayer = req.fee_payer ? new PublicKey(req.fee_payer) : payer.publicKey;

  const { decimals } = await getMint(conn, mint);
  const senderAta = await getAssociatedTokenAddress(mint, payer.publicKey);
  const recipientAta = await getAssociatedTokenAddress(mint, payTo);

  const transferIx = createTransferCheckedInstruction(
    senderAta,
    mint,
    recipientAta,
    payer.publicKey,
    BigInt(req.amount),
    decimals,
    [],
    TOKEN_PROGRAM_ID
  );

  const { blockhash } = await conn.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 10000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }),
      transferIx,
    ],
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  tx.sign([payer]);

  // Encode payment
  const txBase64 = Buffer.from(tx.serialize()).toString("base64");
  const payment = {
    x402Version: req.x402_version,
    scheme: req.scheme,
    network: req.network,
    payload: { transaction: txBase64 },
  };
  const signature = Buffer.from(JSON.stringify(payment)).toString("base64");
  console.log("Signature length:", signature.length);

  // Step 3: Resume session with payment
  console.log("\n--- Step 3: Send signed payment ---");
  const res2 = await fetch(`${BACKEND}/api/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-app-key": APP_KEY,
    },
    body: JSON.stringify({
      address: payer.publicKey.toBase58(),
      message: "hi",
      fundingMode: "prepaid",
      sessionId: req.session_id,
      paymentSignature: signature,
    }),
  });

  const text2 = await res2.text();
  console.log("Response:", text2.slice(0, 500));
}

main().catch(console.error);
