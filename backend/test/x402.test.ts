import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import {
  x402Fetch,
  x402GetPaymentRequest,
  x402FetchWithPayment,
  PaymentRequiredError,
  OverBudgetError,
  PayerWalletError,
} from "../lib/x402";

/**
 * Proves the x402 client handshake with a stubbed fetch:
 *   1st call → 402 + payment-required header
 *   client cost-caps, checks budget, signs payment, retries with
 *   payment-signature header
 * The payment signing itself is stubbed (svm.createSignerFromBase58 is
 * patched), so no on-chain state is needed.
 */

const payer = Keypair.generate();

function paymentRequiredHeader(overrides: Record<string, unknown> = {}): string {
  return Buffer.from(
    JSON.stringify({
      x402Version: 1,
      accepts: [
        {
          scheme: "exact",
          network: "solana-devnet",
          asset: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          maxAmountRequired: "4000",
          payTo: "5oNDL1sF5jP7W6eYd9aRqzXn2U3mBvKj8QwTsLp4ZxCe",
          description: "LLM completion (test)",
          resource: "/v1/chat/completions",
          mimeType: "application/json",
          maxTimeoutSeconds: 60,
          extra: { feePayer: payer.publicKey.toBase58() },
          ...overrides,
        },
      ],
    })
  ).toString("base64");
}

process.env.X402_GATEWAY_URL = "http://gateway.test/v1/chat/completions";
process.env.X402_PAYER_PRIVATE_KEY = bs58.encode(payer.secretKey);
// The test's mocked RPC and the mint passthrough assume devnet —
// override whatever SOLANA_RPC_URL the local .env sets. HELIUS_API_KEY
// takes precedence in config.solanaRpcUrl and points at MAINNET, so it
// must be cleared or the SDK fetches the devnet mint from mainnet.
process.env.SOLANA_RPC_URL = "https://api.devnet.solana.com";
process.env.HELIUS_API_KEY = "";

test("x402: signs payment and retries with payment-signature", async () => {
  const origFetch = globalThis.fetch;
  const calls: Array<{ headers: Record<string, string> }> = [];
  mock.method(globalThis, "fetch", async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u === "http://gateway.test/v1/chat/completions") {
      const headers = (init?.headers as Record<string, string>) ?? {};
      calls.push({ headers });
      if (!headers["payment-signature"]) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402,
          headers: { "payment-required": paymentRequiredHeader() },
        });
      }
      return new Response('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n', {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    }
    // The SDK's own RPC calls to devnet: fake the tx simulation and
    // blockhash lookup (the payer has no devnet funds — not the point of
    // this test). The mint account fetch passes through to real devnet.
    if (u.includes("api.devnet.solana.com") && init?.body) {
      const body = JSON.parse(String(init.body));
      const method = Array.isArray(body) ? body[0]?.method : body?.method;
      if (method === "simulateTransaction") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            result: {
              context: { slot: 1 },
              value: { err: null, unitsConsumed: 300, logs: [] },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (method === "getLatestBlockhash") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            result: {
              value: {
                blockhash: "11111111111111111111111111111111",
                lastValidBlockHeight: 100000,
              },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
    }
    return origFetch(url as string | URL, init);
  });

  const res = await x402Fetch("http://gateway.test/v1/chat/completions", {
    method: "POST",
    body: "{}",
  });

  assert.equal(res.status, 200);
  assert.equal(calls.length, 2, "expected a 402 then a retry");
  assert.ok(
    calls[1].headers["payment-signature"],
    "retry must carry payment-signature header"
  );
  mock.restoreAll();
});

test("x402: aborts before paying when price exceeds per-turn cap", async () => {
  mock.method(globalThis, "fetch", async () => {
    return new Response(JSON.stringify({ error: "payment_required" }), {
      status: 402,
      headers: { "payment-required": paymentRequiredHeader({ maxAmountRequired: "100000000" }) },
    });
  });

  await assert.rejects(
    x402Fetch("http://gateway.test/v1/chat/completions", { method: "POST" }),
    (err: unknown) => err instanceof OverBudgetError
  );
  mock.restoreAll();
});

test("x402: fails closed when no payer key configured", async () => {
  const saved = process.env.X402_PAYER_PRIVATE_KEY;
  delete process.env.X402_PAYER_PRIVATE_KEY;
  mock.method(globalThis, "fetch", async () => {
    return new Response(JSON.stringify({ error: "payment_required" }), {
      status: 402,
      headers: { "payment-required": paymentRequiredHeader() },
    });
  });

  await assert.rejects(
    x402Fetch("http://gateway.test/v1/chat/completions", { method: "POST" }),
    (err: unknown) => err instanceof PayerWalletError
  );
  process.env.X402_PAYER_PRIVATE_KEY = saved;
  mock.restoreAll();
});

test("x402: payment request returns decoded terms without paying", async () => {
  mock.method(globalThis, "fetch", async () => {
    return new Response(JSON.stringify({ error: "payment_required" }), {
      status: 402,
      headers: { "payment-required": paymentRequiredHeader() },
    });
  });

  const result = await x402GetPaymentRequest(
    "http://gateway.test/v1/chat/completions",
    { method: "POST" }
  );

  assert.equal(result.kind, "payment_required");
  if (result.kind !== "payment_required") return;
  assert.equal(result.requirement.scheme, "exact");
  assert.equal(result.requirement.network, "solana:devnet"); // V2 CAIP-2
  assert.equal(result.requirement.asset, "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  assert.equal(result.requirement.amount, "4000");
  assert.equal(result.requirement.payTo, "5oNDL1sF5jP7W6eYd9aRqzXn2U3mBvKj8QwTsLp4ZxCe");
  assert.equal(result.requirement.feePayer, payer.publicKey.toBase58());
  assert.equal(result.requirement.priceUsd, 0.004);
  mock.restoreAll();
});

test("x402: handles CAIP-2 shorthand solana:mainnet from gateway", async () => {
  mock.method(globalThis, "fetch", async () => {
    return new Response(JSON.stringify({ error: "payment_required" }), {
      status: 402,
      headers: {
        "payment-required": Buffer.from(
          JSON.stringify({
            x402Version: 2,
            accepts: [
              {
                scheme: "exact",
                network: "solana:mainnet",
                asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                maxAmountRequired: "5161",
                payTo: "9QGtTUpvLmhggDuBciAeE67MmhECVFYdFLD7xKD4RSno",
                maxTimeoutSeconds: 300,
              },
            ],
          })
        ).toString("base64"),
      },
    });
  });

  const result = await x402GetPaymentRequest(
    "http://gateway.test/v1/chat/completions",
    { method: "POST" }
  );

  assert.equal(result.kind, "payment_required");
  if (result.kind !== "payment_required") return;
  // SDK-facing raw network normalized to V1
  assert.equal(result.requirement.raw?.network, "solana");
  // Client-facing network stays V2 CAIP-2
  assert.equal(result.requirement.network, "solana:mainnet");
  assert.equal(result.requirement.priceUsd, 0.005161);
  mock.restoreAll();
});

test("x402: signed retry relays the client payment and passes on 200", async () => {
  const seen: string[] = [];
  mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    const headers = (init?.headers as Record<string, string>) ?? {};
    seen.push(headers["payment-signature"] ?? "");
    return new Response("data: [DONE]\n\n", { status: 200 });
  });

  const res = await x402FetchWithPayment(
    "http://gateway.test/v1/chat/completions",
    { method: "POST" },
    "client-signed-payment"
  );

  assert.equal(res.status, 200);
  assert.deepEqual(seen, ["client-signed-payment"]);
  mock.restoreAll();
});

test("x402: signed retry rejects when the gateway still 402s", async () => {
  mock.method(globalThis, "fetch", async () => {
    return new Response(JSON.stringify({ error: "payment_required" }), {
      status: 402,
      headers: { "payment-required": paymentRequiredHeader() },
    });
  });

  await assert.rejects(
    x402FetchWithPayment("http://gateway.test/v1/chat/completions", { method: "POST" }, "sig"),
    (err: unknown) => err instanceof PaymentRequiredError
  );
  mock.restoreAll();
});
