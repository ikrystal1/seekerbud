import { PublicKey } from "@solana/web3.js";
import { BACKEND_URL, APP_KEY } from "./chat";

export type AccountData = {
  address: string;
  network: "mainnet" | "devnet";
  sol_balance: number;
  tokens: { mint: string; symbol: string; amount: number }[];
  history: {
    signature: string;
    blockTime: number | null;
    slot: number;
    err: string | null;
  }[];
};

/**
 * Read-only wallet snapshot for the Account screen (proxied through the
 * backend — the app never talks to an RPC directly).
 */
export async function fetchAccountData(
  address: PublicKey
): Promise<AccountData> {
  const url = `${BACKEND_URL}/api/account?address=${encodeURIComponent(address.toBase58())}`;
  const res = await fetch(url, {
    headers: { "x-app-key": APP_KEY },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Server error (${res.status})`);
  }
  return (await res.json()) as AccountData;
}
