import { Connection, PublicKey } from "@solana/web3.js";
import type { IncomingMessage, ServerResponse } from "http";
import { config, log } from "../lib/config";
import { SYSTEM_PROMPT, userMessage } from "../lib/prompts";
import { TOOLS, runTool, type TransferProposal } from "../lib/tools";
import { llmTurn, type LLMMessage, type LLMToolDef } from "../lib/llm";
import { OverBudgetError, PayerWalletError } from "../lib/x402";
import {
  BodyTooLargeError,
  readBody,
  clientIp,
  safeEqual,
} from "../lib/http-utils";
import { rateLimiter } from "../lib/rate-limit";

const MAX_TURNS = 4;

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
 *   done   → {total_cost_usd}
 *   error  → {error, message}
 * Protection: X-App-Key (if configured), per-IP rate limit, body size and
 * content-type enforcement. Vercel-compatible Node handler.
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

  let body: { address?: unknown; message?: unknown; sessionId?: unknown };
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

  log("info", `chat: ${address.toBase58()} "${rawMessage.slice(0, 80)}"`);

  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });
  res.flushHeaders?.();

  const connection = new Connection(config.solanaRpcUrl, "confirmed");
  const messages: LLMMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage(address.toBase58(), rawMessage) },
  ];
  const tools: LLMToolDef[] = TOOLS.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  let totalCostUsd = 0;

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const { outcome, costUsd } = await llmTurn(messages, tools, (delta) => {
        sendEvent(res, "text", { content: delta });
      }, address.toBase58());
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
