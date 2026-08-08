import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import { Readable } from "stream";
import type { ServerResponse } from "http";
import chatHandler from "../api/chat";

const address = Keypair.generate().publicKey.toBase58();

type MockRes = {
  statusCode: number;
  _chunks: string[];
  writeHead(status: number, headers?: Record<string, string>): MockRes;
  write(chunk: string | Buffer): boolean;
  end(chunk?: string | Buffer): void;
  flushHeaders(): void;
};

function callHandler(body: unknown): Promise<{ status: number; json: unknown }> {
  return new Promise((resolve, reject) => {
    const req = Readable.from([Buffer.from(JSON.stringify(body))]) as never;
    (req as { headers: Record<string, string> }).headers = {
      "content-type": "application/json",
    };
    (req as { socket: { remoteAddress: string } }).socket = {
      remoteAddress: "203.0.113.9",
    };
    const res: MockRes = {
      statusCode: 200,
      _chunks: [],
      writeHead(status, _headers) {
        this.statusCode = status;
        return this;
      },
      write(chunk) {
        this._chunks.push(chunk.toString());
        return true;
      },
      end(chunk) {
        if (chunk) this._chunks.push(chunk.toString());
        const raw = this._chunks.join("");
        let json: unknown;
        try {
          json = JSON.parse(raw);
        } catch {
          json = raw;
        }
        resolve({ status: this.statusCode, json });
      },
      flushHeaders() {},
    };
    const resTyped = res as unknown as ServerResponse;

    chatHandler(req, resTyped).catch(reject);
  });
}

test("400 on invalid address", async () => {
  const { status, json } = await callHandler({
    address: "not-an-address",
    message: "hi",
  });
  assert.equal(status, 400);
  assert.equal((json as { error: string }).error, "invalid_address");
});

test("400 on empty message", async () => {
  const { status, json } = await callHandler({ address, message: "  " });
  assert.equal(status, 400);
  assert.equal((json as { error: string }).error, "empty_message");
});

test("400 on invalid json", async () => {
  const { status } = await callHandler("not json");
  assert.equal(status, 400);
});
