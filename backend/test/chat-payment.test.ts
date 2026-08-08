import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "http";
import { Keypair } from "@solana/web3.js";
import chatHandler from "../api/chat";

/**
 * Client-signed payment flow (both funding modes) with a stubbed gateway:
 *   phase 1: request without payment → gateway 402 → server emits
 *            `payment_request` with the payment terms (NO payment made)
 *   phase 2: same session resumed with a paymentSignature → gateway 200 →
 *            text + done events
 */

process.env.X402_GATEWAY_URL = "http://gateway.test/v1/chat/completions";
process.env.X402_PAYER_PRIVATE_KEY = ""; // server-signed path must NOT trigger
process.env.APP_KEY = "";
process.env.SOLANA_RPC_URL = "https://api.devnet.solana.com";

const address = Keypair.generate().publicKey.toBase58();

const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const payTo = Keypair.generate().publicKey.toBase58();

function paymentRequiredHeader(): string {
  return Buffer.from(
    JSON.stringify({
      x402Version: 1,
      accepts: [
        {
          scheme: "exact",
          network: "solana-devnet",
          asset: USDC_MINT_DEVNET,
          maxAmountRequired: "4000",
          payTo,
          description: "LLM completion (test)",
          resource: "/v1/chat/completions",
          mimeType: "application/json",
          maxTimeoutSeconds: 60,
        },
      ],
    })
  ).toString("base64");
}

async function postChat(body: object): Promise<{ status: number; body: string }> {
  const server = createServer((req, res) => {
    chatHandler(req as never, res as never).catch(() => res.end());
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const res = await fetch(`http://127.0.0.1:${port}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return { status: res.status, body: text };
}

function events(body: string): { event: string; data: string }[] {
  const out: { event: string; data: string }[] = [];
  let cur: { event: string; data: string } | null = null;
  for (const line of body.split("\n")) {
    if (line.startsWith("event:")) {
      cur = { event: line.slice(6).trim(), data: "" };
    } else if (line.startsWith("data:") && cur) {
      cur.data += line.slice(5).trim();
      out.push(cur);
      cur = null;
    }
  }
  return out;
}

test("client-signed flow: 402 → payment_request → resume → done", async (t) => {
  const origFetch = globalThis.fetch;
  mock.method(globalThis, "fetch", async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (!u.startsWith("http://gateway.test")) return origFetch(url as string | URL, init);
    const headers = (init?.headers as Record<string, string>) ?? {};
    if (!headers["payment-signature"]) {
      return new Response(JSON.stringify({ error: "payment_required" }), {
        status: 402,
        headers: { "payment-required": paymentRequiredHeader() },
      });
    }
    return new Response(
      'data: {"choices":[{"delta":{"content":"paid reply"}}]}\n\ndata: [DONE]\n\n',
      { status: 200, headers: { "content-type": "text/event-stream" } }
    );
  });
  t.after(() => mock.restoreAll());

  // ── Phase 1: no signature → payment_request event, no done ──
  const phase1 = await postChat({
    address,
    message: "tell me something",
    fundingMode: "prepaid",
  });
  assert.equal(phase1.status, 200);
  const ev1 = events(phase1.body);
  const req = ev1.find((e) => e.event === "payment_request");
  assert.ok(req, "expected a payment_request event. Body:\n" + phase1.body);
  const terms = JSON.parse(req!.data);
  assert.equal(terms.price_usd, 0.004);
  assert.equal(terms.asset, USDC_MINT_DEVNET);
  assert.equal(terms.amount, "4000");
  assert.equal(terms.pay_to, payTo);
  assert.equal(terms.scheme, "exact");
  assert.ok(terms.session_id, "payment_request must carry a session_id");
  assert.ok(!ev1.some((e) => e.event === "done"), "no done before payment");

  // ── Phase 2: resume with the signed payment → reply streams ──
  const phase2 = await postChat({
    address,
    message: "tell me something",
    fundingMode: "prepaid",
    sessionId: terms.session_id,
    paymentSignature: "client-signed-payment",
  });
  const ev2 = events(phase2.body);
  assert.ok(
    ev2.some((e) => e.event === "text" && e.data.includes("paid reply")),
    "expected streamed text after payment"
  );
  assert.ok(ev2.some((e) => e.event === "done"), "expected done event");

  mock.restoreAll();
});

test("client-signed flow: resume with a foreign session is refused", async (t) => {
  const other = Keypair.generate().publicKey.toBase58();
  const origFetch = globalThis.fetch;
  mock.method(globalThis, "fetch", async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (!u.startsWith("http://gateway.test")) return origFetch(url as string | URL, init);
    return new Response(JSON.stringify({ error: "payment_required" }), {
      status: 402,
      headers: { "payment-required": paymentRequiredHeader() },
    });
  });
  t.after(() => mock.restoreAll());

  // Borrow a session from `address`, then try to resume it as `other`.
  const phase1 = await postChat({
    address,
    message: "hello",
    fundingMode: "user",
  });
  const req = events(phase1.body).find((e) => e.event === "payment_request");
  assert.ok(req, "expected a payment_request event");
  const terms = JSON.parse(req!.data);

  const phase2 = await postChat({
    address: other,
    message: "hello",
    fundingMode: "user",
    sessionId: terms.session_id,
    paymentSignature: "sig",
  });
  const ev2 = events(phase2.body);
  const err = ev2.find((e) => e.event === "error");
  assert.ok(err, "expected an error event");
  assert.equal(JSON.parse(err!.data).error, "session_expired");
  mock.restoreAll();
});

test("client-signed flow: unknown funding mode is rejected pre-stream", async () => {
  const res = await postChat({
    address,
    message: "hello",
    fundingMode: "bananas",
  });
  assert.equal(res.status, 400);
  assert.ok(res.body.includes("invalid_funding_mode"));
});

test("client-signed flow: paymentSignature without session is rejected", async () => {
  const res = await postChat({
    address,
    message: "hello",
    fundingMode: "prepaid",
    paymentSignature: "sig",
  });
  assert.equal(res.status, 400);
  assert.ok(res.body.includes("missing_session"));
});
