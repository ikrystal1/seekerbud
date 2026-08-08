import { randomBytes } from "node:crypto";
import { Connection, PublicKey } from "@solana/web3.js";
import type { IncomingMessage, ServerResponse } from "http";
import { config, log } from "../lib/config";
import { SYSTEM_PROMPT, userMessage } from "../lib/prompts";
import { TOOLS, runTool, type TransferProposal } from "../lib/tools";
import {
  gatewayTurn,
  gatewayTurnWithPayment,
  llmTurn,
  type LLMMessage,
  type LLMResult,
  type LLMToolDef,
} from "../lib/llm";
import { OverBudgetError, PayerWalletError, PaymentRequiredError } from "../lib/x402";
import { budget } from "../lib/budget";
import { store } from "../lib/store";
import {
  BodyTooLargeError,
  readBody,
  clientIp,
  safeEqual,
} from "../lib/http-utils";
import { rateLimiter } from "../lib/rate-limit";

const MAX_TURNS = 4;

// Client-signed payment sessions: when the gateway asks for payment mid-turn,
// we park the conversation state in the store and hand the payment terms to
// the device. The device signs and resumes the SAME session with the
// signature — so multi-turn agent runs (e.g. "check my balance, then…")
// can request a payment at any turn without re-running tools.
const SESSION_TTL_SECONDS = 600; // 10 min to approve

type ChatSession = {
  v: 1;
  address: string;
  messages: LLMMessage[];
  turn: number;
  totalCostUsd: number;
  priceUsd: number;
  createdAt: number;
};

const sessionKey = (id: string) => `chat:session:${id}`;

function parseSession(raw: string | null): ChatSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ChatSession;
    if (
      parsed.v !== 1 ||
      typeof parsed.address !== "string" ||
      !Array.isArray(parsed.messages) ||
      typeof parsed.turn !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function json(res: ServerResponse, status: number, body: object) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function sendEvent(res: ServerResponse, event: string, data: object) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * POST /api/chat — one user turn. Streams SSE events:
 *   text   → streamed reply text (append to assistant bubble)
 *   tool   → a tool ran {tool, status, cost_usd}
 *   action → transfer proposal {type, id, amount, unit, to, fee_estimate}
 *   payment_request → client must sign {session_id, price_usd, asset,
 *                    amount, pay_to, fee_payer, ...} then resume the SAME
 *                    session with {sessionId, paymentSignature}
 *   done   → {total_cost_usd}
 *   error  → {error, message}
 * Protection: X-App-Key (if configured), per-IP rate limit, body size and
 * content-type enforcement. Vercel-compatible Node handler.
 *
 * Two payment modes:
 *  - client-signed (fundingMode "prepaid" | "user"): the device builds and
 *    signs the exact USDC transfer; the server only relays the signature.
 *  - server-signed (no fundingMode): the server's X402_PAYER_PRIVATE_KEY
 *    pays (legacy/fallback).
 */
export default async function chatHandler(
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

  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.includes("application/json")) {
    return json(res, 415, { error: "unsupported_media_type" });
  }

  let body: {
    address?: unknown;
    message?: unknown;
    sessionId?: unknown;
    history?: unknown;
    name?: unknown;
    fundingMode?: unknown;
    paymentSignature?: unknown;
  };
  try {
    body = JSON.parse(await readBody(req, config.maxBodyBytes));
  } catch (err) {
    if (err instanceof BodyTooLargeError) {
      return json(res, 413, { error: "body_too_large" });
    }
    return json(res, 400, { error: "invalid_json" });
  }

  const rawAddress = typeof body.address === "string" ? body.address : "";
  const rawMessage = typeof body.message === "string" ? body.message : "";

  let address: PublicKey;
  try {
    address = new PublicKey(rawAddress);
  } catch {
    return json(res, 400, { error: "invalid_address" });
  }
  if (!rawMessage.trim()) {
    return json(res, 400, { error: "empty_message" });
  }

  // Payment mode: "prepaid" (on-device agent wallet) and "user" (Seed Vault)
  // are both CLIENT-SIGNED — the device builds and signs the exact USDC
  // payment, the server relays it. Requests without fundingMode fall back
  // to the legacy server-signed path (X402_PAYER_PRIVATE_KEY).
  const rawFundingMode = typeof body.fundingMode === "string" ? body.fundingMode : "";
  const clientSigned = rawFundingMode === "prepaid" || rawFundingMode === "user";
  if (rawFundingMode && !clientSigned) {
    return json(res, 400, { error: "invalid_funding_mode" });
  }
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const paymentSignature =
    typeof body.paymentSignature === "string" ? body.paymentSignature : "";
  if (paymentSignature && !sessionId) {
    return json(res, 400, { error: "missing_session" });
  }

  // The user's display name (from onboarding) — lets the agent be personal.
  // Optional, sanitized: string, trimmed, capped at 50 chars.
  const rawName = typeof body.name === "string" ? body.name.trim() : "";
  const name = rawName.slice(0, 50);

  // Conversation memory: the client replays its recent messages. We only
  // accept user/assistant turns (never system — prompt-injection guard),
  // capped in count and total size so the 32KB body limit holds.
  const MAX_HISTORY = 20;
  const MAX_HISTORY_CHARS = 8000;
  let historyChars = 0;
  const history: LLMMessage[] = [];
  if (Array.isArray(body.history)) {
    for (const item of body.history.slice(-MAX_HISTORY)) {
      if (!item || typeof item !== "object") continue;
      const role = (item as { role?: unknown }).role;
      const content = (item as { content?: unknown }).content;
      if (role !== "user" && role !== "assistant") continue;
      if (typeof content !== "string" || content.trim().length === 0) continue;
      if (content.length > 2000) continue;
      historyChars += content.length;
      if (historyChars > MAX_HISTORY_CHARS) break;
      history.push({ role, content });
    }
  }

  log("info", `chat: ${address.toBase58()} "${rawMessage.slice(0, 80)}" (history: ${history.length})`);

  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });
  res.flushHeaders?.();

  const connection = new Connection(config.solanaRpcUrl, "confirmed");
  const systemPrompt = name
    ? `You are talking to ${name}. Use their name naturally and warmly — e.g. "What would you like to check, ${name}?"\n\n${SYSTEM_PROMPT}`
    : SYSTEM_PROMPT;
  let messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage(address.toBase58(), rawMessage) },
  ];
  const tools: LLMToolDef[] = TOOLS.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  let totalCostUsd = 0;
  const addr = address.toBase58();

  // Phase 2 resume — load the parked conversation and verify ownership.
  let session: ChatSession | null = null;
  if (paymentSignature) {
    log("info", `chat: resuming session=${sessionId} sigLen=${paymentSignature.length}`);
    session = parseSession(await store.get(sessionKey(sessionId)));
    if (!session || session.address !== addr) {
      sendEvent(res, "error", {
        error: "session_expired",
        message: "This payment session expired — send the message again.",
      });
      return res.end();
    }
    messages = session.messages;
    totalCostUsd = session.totalCostUsd;
  }
  const startTurn = session?.turn ?? 0;
  const paidPriceUsd = session?.priceUsd ?? 0;
  let usedSignature = false;

  try {
    for (let turn = startTurn; turn < MAX_TURNS; turn++) {
      const onDelta = (delta: string) => sendEvent(res, "text", { content: delta });

      let outcome: LLMResult["outcome"];
      let costUsd = 0;

      if (clientSigned) {
        if (session && !usedSignature) {
          // First gateway call after a payment — present the signed payment.
          log("info", `chat: sending signed payment session=${sessionId}`);
          const result = await gatewayTurnWithPayment(
            messages,
            tools,
            paymentSignature,
            onDelta,
            addr
          );
          usedSignature = true;
          outcome = result.outcome;
          costUsd = result.costUsd;
          if (outcome.kind !== "error") {
            await budget.spend(paidPriceUsd, addr);
            totalCostUsd += paidPriceUsd;
          }
        } else {
          const r = await gatewayTurn(messages, tools, onDelta, addr);
          if (r.kind === "payment_required") {
            const { requirement } = r;
            if (!(await budget.canAfford(requirement.priceUsd, addr))) {
              throw new OverBudgetError("Daily x402 budget exceeded");
            }
            // Park the conversation so the device can sign and resume it.
            const id = randomBytes(16).toString("hex");
            await store.set(
              sessionKey(id),
              JSON.stringify({
                v: 1,
                address: addr,
                messages,
                turn,
                totalCostUsd,
                priceUsd: requirement.priceUsd,
                createdAt: Date.now(),
              } satisfies ChatSession),
              SESSION_TTL_SECONDS
            );
            log(
              "info",
              `chat: payment requested session=${id} price=${requirement.priceUsd.toFixed(4)} USD`
            );
            sendEvent(res, "payment_request", {
              session_id: id,
              price_usd: requirement.priceUsd,
              x402_version: requirement.x402Version,
              scheme: requirement.scheme,
              network: requirement.network,
              asset: requirement.asset,
              amount: requirement.amount,
              pay_to: requirement.payTo,
              max_timeout_seconds: requirement.maxTimeoutSeconds,
              fee_payer: requirement.feePayer,
            });
            return; // client signs and resumes with a new request
          }
          outcome = r.result.outcome;
          costUsd = r.result.costUsd;
        }
      } else {
        const result = await llmTurn(messages, tools, onDelta, addr);
        outcome = result.outcome;
        costUsd = result.costUsd;
      }

      totalCostUsd += costUsd;

      if (outcome.kind === "error") {
        throw new Error(outcome.message);
      }

      if (outcome.kind === "text") {
        break;
      }

      // Tool calls — run each, emit events, feed results back to the LLM.
      const assistantMsg: LLMMessage = {
        role: "assistant",
        content: null,
        tool_calls: outcome.calls.map((c) => ({
          id: c.id,
          type: "function" as const,
          function: { name: c.function.name, arguments: c.function.arguments },
        })),
      };
      messages.push(assistantMsg);

      for (const call of outcome.calls) {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(call.function.arguments || "{}");
        } catch {
          parsedArgs = {};
        }

        let proposal: TransferProposal | undefined;
        const result = await runTool(
          { id: call.id, name: call.function.name, args: parsedArgs },
          {
            connection,
            address,
            onProposal: (p) => (proposal = p),
          }
        );

        sendEvent(res, "tool", {
          tool: call.function.name,
          status: result.error ? "error" : "ok",
          cost_usd: 0,
        });

        if (proposal) {
          sendEvent(res, "action", {
            type: proposal.type,
            id: proposal.id,
            amount: proposal.amount,
            unit: proposal.unit,
            to: proposal.to,
            fee_estimate: proposal.fee_estimate,
            valid_until: proposal.valid_until,
          });
        }

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result.error
            ? `ERROR: ${result.error}`
            : result.output,
        });

        if (result.error) {
          log("warn", `tool:${call.function.name} → ${result.error}`);
        }
      }
    }

    sendEvent(res, "done", { total_cost_usd: totalCostUsd });
  } catch (err) {
    if (err instanceof OverBudgetError) {
      sendEvent(res, "error", { error: "over_budget", message: err.message });
    } else if (err instanceof PaymentRequiredError) {
      sendEvent(res, "error", {
        error: "payment_rejected",
        message:
          "The payment was not accepted — the paying wallet may need more USDC. Check the balance and try again.",
      });
    } else if (err instanceof PayerWalletError) {
      sendEvent(res, "error", {
        error: "payment_required",
        message: "Agent wallet needs a top-up — ask SeekerBud ops.",
      });
    } else {
      const message = err instanceof Error ? err.message : String(err);
      log("error", `chat failed: ${message}`);
      sendEvent(res, "error", { error: "internal", message });
    }
  } finally {
    res.end();
  }
}
