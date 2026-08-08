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

/**
 * The payment terms the backend forwards from the gateway (402). The device
 * must build and sign the exact USDC transfer, then resume the SAME session
 * with { sessionId, paymentSignature }.
 */
export type PaymentRequirement = {
  sessionId: string;
  priceUsd: number;
  x402Version: number;
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  feePayer?: string;
};

export class PaymentCancelledError extends Error {
  constructor() {
    super("Payment cancelled.");
    this.name = "PaymentCancelledError";
  }
}

export type ChatRequestOptions = {
  history?: HistoryItem[];
  name?: string;
  fundingMode?: "prepaid" | "user";
  /**
   * Called when the gateway asks for a payment mid-conversation. Return the
   * payment-signature to resume, or null to cancel.
   *  - "prepaid": signs silently with the on-device agent wallet
   *  - "user":    shows a confirm card, then signs with the Seed Vault
   */
  onPayment?: (requirement: PaymentRequirement) => Promise<string | null>;
};

/**
 * One user turn against the SeekerBud backend (POST /api/chat, SSE).
 * `opts.history` carries the recent conversation and `opts.name` the user's
 * display name so the agent has context — the backend is stateless, the
 * client replays the last turns. `onStream` receives text as it arrives.
 *
 * Client-signed payments: when the gateway asks for a payment the backend
 * ends the stream with a `payment_request` event; we call `opts.onPayment`
 * and resume the same session with the signed payment. This repeats until
 * the reply is done.
 *
 * Throws on transport errors, HTTP errors, backend `error` events, and
 * PaymentCancelledError when the user declines a payment.
 */
export async function sendMessage(
  address: PublicKey,
  text: string,
  opts: ChatRequestOptions = {},
  onStream?: (delta: string) => void
): Promise<ChatEvent[]> {
  let sessionId = "";
  let paymentSignature = "";

  while (true) {
    const res = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-key": APP_KEY },
      body: JSON.stringify({
        address: address.toBase58(),
        message: text,
        history: opts.history ?? [],
        name: opts.name ?? "",
        fundingMode: opts.fundingMode,
        sessionId,
        paymentSignature,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message ?? `Server error (${res.status})`);
    }

    const { events, error, paymentRequired } = await readSseStream(res, onStream);
    if (error) throw error;

    if (paymentRequired) {
      if (!opts.onPayment) {
        throw new Error("This message needs a payment, but no signer is available.");
      }
      const signature = await opts.onPayment(paymentRequired);
      if (signature === null) throw new PaymentCancelledError();
      sessionId = paymentRequired.sessionId;
      paymentSignature = signature;
      continue;
    }

    if (events.length === 0) {
      throw new Error("The server returned no reply — try again.");
    }
    return finishSse(events);
  }
}

type SseBlock = { event: string; data?: unknown };

type SseResult = {
  events: ChatEvent[];
  error?: Error;
  paymentRequired?: PaymentRequirement;
};

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

function parsePaymentRequired(data: unknown): PaymentRequirement | undefined {
  const d = (data ?? {}) as Record<string, unknown>;
  const sessionId = typeof d.session_id === "string" ? d.session_id : "";
  const amount = typeof d.amount === "string" ? d.amount : "";
  const payTo = typeof d.pay_to === "string" ? d.pay_to : "";
  if (!sessionId || !amount || !payTo) return undefined;
  return {
    sessionId,
    priceUsd: typeof d.price_usd === "number" ? d.price_usd : 0,
    x402Version: typeof d.x402_version === "number" ? d.x402_version : 1,
    scheme: typeof d.scheme === "string" ? d.scheme : "exact",
    network: typeof d.network === "string" ? d.network : "",
    asset: typeof d.asset === "string" ? d.asset : "",
    amount,
    payTo,
    maxTimeoutSeconds:
      typeof d.max_timeout_seconds === "number" ? d.max_timeout_seconds : 60,
    feePayer: typeof d.fee_payer === "string" ? d.fee_payer : undefined,
  };
}

function handleBlock(
  block: string,
  onStream?: (delta: string) => void
): SseResult {
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
    case "payment_request": {
      const paymentRequired = parsePaymentRequired(parsed.data);
      if (!paymentRequired) return { events: [] };
      return { events: [], paymentRequired };
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
): Promise<SseResult> {
  const decoder = new TextDecoder();
  const result: SseResult = { events: [] };
  let buffer = "";

  const consume = (chunk: string): void => {
    buffer += chunk;
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const partial = handleBlock(block, onStream);
      result.events.push(...partial.events);
      result.error = result.error ?? partial.error;
      result.paymentRequired = result.paymentRequired ?? partial.paymentRequired;
    }
  };

  const reader = res.body?.getReader();
  if (!reader) {
    // Fallback for clients without stream support: parse the whole body.
    consume(decoder.decode(await res.arrayBuffer()));
    return result;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    consume(decoder.decode(value, { stream: true }));
  }
  consume(decoder.decode());
  return result;
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
