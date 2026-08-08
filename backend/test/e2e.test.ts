import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "http";
import { Keypair } from "@solana/web3.js";
import chatHandler from "../api/chat";

process.env.X402_GATEWAY_URL = ""; // stub LLM mode — no payments
process.env.X402_PAYER_PRIVATE_KEY = "";

const address = Keypair.generate().publicKey.toBase58();

async function postChat(
  message: string
): Promise<{ status: number; body: string }> {
  const server = createServer((req, res) => {
    chatHandler(req as never, res as never).catch(() => res.end());
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const res = await fetch(`http://127.0.0.1:${port}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, message }),
  });
  const body = await res.text();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return { status: res.status, body };
}

function events(body: string): { event: string; data: string }[] {
  const out: { event: string; data: string }[] = [];
  const lines = body.split("\n");
  let cur: { event: string; data: string } | null = null;
  for (const line of lines) {
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

test("E2E (stub LLM): balance question streams tool + text + done", async () => {
  const { status, body } = await postChat("How much SOL do I have?");
  assert.equal(status, 200);
  const ev = events(body);
  assert.ok(ev.some((e) => e.event === "tool" && /get_sol_balance/.test(e.data)));
  assert.ok(ev.some((e) => e.event === "text"), "expected text events");
  assert.ok(
    ev.some((e) => e.event === "done"),
    "expected a done event with cost"
  );
});

test("E2E (stub LLM): transfer request produces an action proposal", async () => {
  const to = Keypair.generate().publicKey.toBase58();
  const { body } = await postChat(`Send 0.05 SOL to ${to}`);
  const ev = events(body);
  const action = ev.find((e) => e.event === "action");
  if (!action) console.error("NO ACTION EVENT. FULL BODY:\n", body);
  assert.ok(action, "expected an action event");
  const data = JSON.parse(action!.data);
  assert.equal(data.type, "transfer_proposal");
  assert.equal(data.amount, "0.05");
  assert.equal(data.to, to);
  assert.ok(data.fee_estimate);
});

test("E2E (stub LLM): invalid transfer address is refused, no proposal", async () => {
  const { body } = await postChat("Send 0.05 SOL to not_a_valid_address");
  const ev = events(body);
  assert.ok(!ev.some((e) => e.event === "action"), "no action for bad address");
  assert.ok(ev.some((e) => e.event === "text"), "still answers politely");
});
