import { PublicKey } from "@solana/web3.js";

export const BACKEND_URL = "https://localhost:3000"; // TODO: Railway URL
export const APP_KEY = "BUmeSy1ClJLWfXZE7PNg845aFc6RbATD"; // must match backend env

export type ReplyIcon = "balance" | "tokens" | "activity" | "send" | "info";

export type TransferProposal = {
  id: string;
  amount: string;
  unit: string;
  to: string;
  fee_estimate: string;
  valid_until?: string;
};

export type ChatEvent =
  | { type: "text"; content: string; costUsd?: number }
  | { type: "action"; proposal: TransferProposal };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text?: string;
  icon?: ReplyIcon;
  isError?: boolean;
  retryText?: string;
  action?: TransferProposal;
  costUsd?: number;
  ts: number;
};

let counter = 0;
export const nextId = () => `m_${++counter}_${Date.now()}`;

export type HistoryItem = { role: "user" | "assistant"; content: string };

export type ChatRequestOptions = {
  history?: HistoryItem[];
  name?: string;
};

/**
 * One user turn against the SeekerBud backend (POST /api/chat, SSE).
 * `opts.history` carries the recent conversation and `opts.name` the user's
 * display name so the agent has context — the backend is stateless, the
 * client replays the last turns. `onStream` receives text as it arrives.
 * Throws on transport errors, HTTP errors, and backend `error` events.
 */
export async function sendMessage(
  address: PublicKey,
  text: string,
  opts: ChatRequestOptions = {},
  onStream?: (delta: string) => void
): Promise<ChatEvent[]> {
  const res = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-app-key": APP_KEY },
    body: JSON.stringify({
      address: address.toBase58(),
      message: text,
      history: opts.history ?? [],
      name: opts.name ?? "",
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Server error (${res.status})`);
  }

  const events = await readSseStream(res, onStream);
  if (events.length === 0) {
    throw new Error("The server returned no reply — try again.");
  }
  return events;
}

type SseBlock = { event: string; data?: unknown };

function parseBlock(block: string): SseBlock | null {
  let event = "";
  let data = "";
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("event:")) event = trimmed.slice(6).trim();
    else if (trimmed.startsWith("data:")) data += trimmed.slice(5).trim();
  }
  if (!data) return event ? { event } : null;
  try {
    return { event, data: JSON.parse(data) };
  } catch {
    return null;
  }
}

function handleBlock(
  block: string,
  onStream?: (delta: string) => void
): { events: ChatEvent[]; error?: Error } {
  const parsed = parseBlock(block);
  if (!parsed) return { events: [] };

  switch (parsed.event) {
    case "text": {
      const content = (parsed.data as { content?: string })?.content ?? "";
      if (content) onStream?.(content);
      return { events: [] };
    }
    case "action":
      return { events: [{ type: "action", proposal: parsed.data as TransferProposal }] };
    case "done": {
      const total = (parsed.data as { total_cost_usd?: number })?.total_cost_usd ?? 0;
      return { events: [{ type: "text", content: "", costUsd: total }] };
    }
    case "error": {
      const d = (parsed.data ?? {}) as { message?: string; error?: string };
      return { events: [], error: new Error(d.message ?? d.error ?? "SeekerBud hit an error.") };
    }
    default:
      return { events: [] };
  }
}

async function readSseStream(
  res: Response,
  onStream?: (delta: string) => void
): Promise<ChatEvent[]> {
  const decoder = new TextDecoder();
  const events: ChatEvent[] = [];
  let buffer = "";

  const consume = (chunk: string): Error | undefined => {
    buffer += chunk;
    let error: Error | undefined;
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const result = handleBlock(block, onStream);
      events.push(...result.events);
      error = result.error ?? error;
    }
    return error;
  };

  const reader = res.body?.getReader();
  if (!reader) {
    // Fallback for clients without stream support: parse the whole body.
    const err = consume(decoder.decode(await res.arrayBuffer()));
    if (err) throw err;
    return finishSse(events);
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const err = consume(decoder.decode(value, { stream: true }));
    if (err) throw err;
  }
  const err = consume(decoder.decode());
  if (err) throw err;
  return finishSse(events);
}

function finishSse(events: ChatEvent[]): ChatEvent[] {
  const textEvents = events.filter((e) => e.type === "text") as Array<{
    type: "text";
    content: string;
    costUsd?: number;
  }>;
  const text = textEvents.map((e) => e.content).join("");
  const costUsd = textEvents.find((e) => e.costUsd)?.costUsd;
  const actions = events.filter((e) => e.type === "action");
  const result: ChatEvent[] = [];
  if (text) result.push({ type: "text", content: text, costUsd });
  result.push(...actions);
  return result;
}
