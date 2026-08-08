import { Connection, PublicKey } from "@solana/web3.js";
import type { IncomingMessage, ServerResponse } from "http";
import { config, log } from "../lib/config";
import {
  getTokenBalances,
  getTransactionHistory,
} from "../lib/solana";
import { clientIp, safeEqual } from "../lib/http-utils";
import { rateLimiter } from "../lib/rate-limit";

/**
 * GET /api/account?address=<pubkey>
 * Read-only wallet snapshot for the Account screen: SOL balance, token
 * holdings, and recent activity. No LLM, no payment — a thin RPC proxy.
 * Protected by the same X-App-Key as /api/chat.
 */
export default async function accountHandler(
  req: IncomingMessage,
  res: ServerResponse
) {
  if (config.appKey) {
    const key = req.headers["x-app-key"];
    if (typeof key !== "string" || !safeEqual(key, config.appKey)) {
      return json(res, 401, { error: "unauthorized" });
    }
  }

  if (!rateLimiter.allow(clientIp(req))) {
    return json(res, 429, { error: "rate_limited" });
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const rawAddress = url.searchParams.get("address") ?? "";

  let address: PublicKey;
  try {
    address = new PublicKey(rawAddress);
  } catch {
    return json(res, 400, { error: "invalid_address" });
  }

  const network = config.solanaRpcUrl.includes("devnet")
    ? "devnet"
    : "mainnet";

  const connection = new Connection(config.solanaRpcUrl, "confirmed");
  const lamports = await connection.getBalance(address);

  let tokens: { mint: string; symbol: string; amount: number }[] = [];
  let history: {
    signature: string;
    blockTime: number | null;
    slot: number;
    err: string | null;
  }[] = [];

  try {
    tokens = (await getTokenBalances(connection, address)).map((t) => ({
      mint: t.mint,
      symbol: t.symbol,
      amount: t.amount,
    }));
  } catch (err) {
    log("warn", `account: token fetch failed for ${address.toBase58()}: ${err instanceof Error ? err.message : String(err)}`);
  }
  try {
    history = (await getTransactionHistory(connection, address, 10)).map(
      (t) => ({ signature: t.signature, blockTime: t.blockTime, slot: t.slot, err: t.err })
    );
  } catch (err) {
    log("warn", `account: history fetch failed for ${address.toBase58()}: ${err instanceof Error ? err.message : String(err)}`);
  }

  return json(res, 200, {
    address: address.toBase58(),
    network,
    sol_balance: lamports / 1e9,
    tokens,
    history,
  });
}

function json(res: ServerResponse, status: number, body: object) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}
