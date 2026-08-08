import { Connection, PublicKey } from "@solana/web3.js";
import { runMockIntent } from "./intents";

export const MOCK_MODE = true;

export const BACKEND_URL = "https://localhost:3000"; // TODO: Vercel URL

export type ReplyIcon = "balance" | "tokens" | "activity" | "send" | "info";

export type TransferProposal = {
  id: string;
  amount: string; // SOL
  to: string; // base58
  fee_estimate: string;
};

export type ChatEvent =
  | { type: "text"; content: string; icon?: ReplyIcon; costUsd?: number }
  | { type: "action"; proposal: TransferProposal }
  | { type: "error"; content: string };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text?: string;
  icon?: ReplyIcon;
  isError?: boolean;
  action?: TransferProposal;
  costUsd?: number;
  ts: number;
};

let counter = 0;
export const nextId = () => `m_${++counter}_${Date.now()}`;

/**
 * Entry point. Sends one user message and returns the events to render.
 * Mock mode uses real on-chain data; backend mode streams POST /api/chat.
 */
export async function sendMessage(
  connection: Connection,
  address: PublicKey,
  text: string
): Promise<ChatEvent[]> {
  if (MOCK_MODE) {
    return runMockIntent(connection, address, text);
  }
  return backendChat(text, address);
}

async function backendChat(
  text: string,
  address: PublicKey
): Promise<ChatEvent[]> {
  const res = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: address.toBase58(), message: text }),
  });
  if (!res.ok) {
    throw new Error(`chat failed: ${res.status}`);
  }
  // TODO: parse SSE stream (text/tool/action/done events — see backend/api.md)
  const json = await res.json();
  return [{ type: "text", content: json.reply, costUsd: json.cost_usd }];
}
