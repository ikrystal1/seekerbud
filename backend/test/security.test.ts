import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import { Readable } from "stream";
import type { ServerResponse } from "http";
import chatHandler from "../api/chat";

process.env.APP_KEY = "test-app-key-123";

const address = Keypair.generate().publicKey.toBase58();

type MockRes = {
  statusCode: number;
  _chunks: string[];
  writeHead(status: number, headers?: Record<string, string>): MockRes;
  write(chunk: string | Buffer): boolean;
  end(chunk?: string | Buffer): void;
  flushHeaders(): void;
};

function callHandler(opts: {
  body?: string;
  contentType?: string;
  appKey?: string;
  ip?: string;
}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = Readable.from([Buffer.from(opts.body ?? "")]) as never;
    (req as { headers: Record<string, string> }).headers = {
      "content-type": opts.contentType ?? "application/json",
      "x-forwarded-for": opts.ip ?? "203.0.113.7",
      ...(opts.appKey !== undefined ? { "x-app-key": opts.appKey } : {}),
    };
    (req as { socket: { remoteAddress: string } }).socket = {
      remoteAddress: opts.ip ?? "203.0.113.7",
    };
    const res: MockRes = {
      statusCode: 200,
      _chunks: [],
      writeHead(status) {
        this.statusCode = status;
        return this;
      },
      write(chunk) {
        this._chunks.push(chunk.toString());
        return true;
      },
      end(chunk) {
        if (chunk) this._chunks.push(chunk.toString());
        resolve({ status: this.statusCode, body: this._chunks.join("") });
      },
      flushHeaders() {},
    };
    chatHandler(req as never, res as unknown as ServerResponse).catch(reject);
  });
}

test("401 without app key", async () => {
  const { status, body } = await callHandler({});
  assert.equal(status, 401);
  assert.ok(body.includes("unauthorized"));
});

test("401 with wrong app key", async () => {
  const { status } = await callHandler({ appKey: "wrong-key" });
  assert.equal(status, 401);
});

test("auth passes with correct app key (falls through to validation)", async () => {
  const { status, body } = await callHandler({
    appKey: "test-app-key-123",
    body: JSON.stringify({ address: "not-an-address", message: "hi" }),
  });
  assert.equal(status, 400, "should have passed auth and failed validation");
  assert.ok(body.includes("invalid_address"));
});

test("415 on non-JSON content type", async () => {
  const { status, body } = await callHandler({
    appKey: "test-app-key-123",
    contentType: "text/plain",
    body: "hello",
  });
  assert.equal(status, 415);
  assert.ok(body.includes("unsupported_media_type"));
});

test("413 on oversized body", async () => {
  const big = JSON.stringify({
    address,
    message: "x".repeat(40 * 1024),
  });
  const { status, body } = await callHandler({
    appKey: "test-app-key-123",
    body: big,
  });
  assert.equal(status, 413);
  assert.ok(body.includes("body_too_large"));
});

test("429 rate limited per IP", async () => {
  process.env.RATE_LIMIT_PER_MINUTE = "2";
  try {
    const ip = "198.51.100.42";
    const first = await callHandler({ appKey: "test-app-key-123", ip });
    const second = await callHandler({ appKey: "test-app-key-123", ip });
    const third = await callHandler({ appKey: "test-app-key-123", ip });
    assert.equal(first.status, 400, "first request allowed");
    assert.equal(second.status, 400, "second request allowed");
    assert.equal(third.status, 429, "third request blocked");
  } finally {
    process.env.RATE_LIMIT_PER_MINUTE = "";
  }
});

test("different IPs have independent rate limits", async () => {
  process.env.RATE_LIMIT_PER_MINUTE = "1";
  try {
    const a = await callHandler({ appKey: "test-app-key-123", ip: "10.0.0.1" });
    const b = await callHandler({ appKey: "test-app-key-123", ip: "10.0.0.2" });
    assert.equal(a.status, 400);
    assert.equal(b.status, 400, "second IP not limited by first IP's window");
  } finally {
    process.env.RATE_LIMIT_PER_MINUTE = "";
  }
});
