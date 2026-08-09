/**
 * SeekerBud x402 LLM Gateway — our own gateway powered by Groq.
 *
 * Flow:
 *   1st call → 402 + payment-required header
 *   2nd call → payment-signature accepted → streams real Groq LLM reply
 *
 * This replaces Solvela entirely. Point X402_GATEWAY_URL to this endpoint.
 */
import type { IncomingMessage, ServerResponse } from "http";
import { readBody } from "./http-utils";
import { groqTurn } from "./groq";
import type { LLMMessage, LLMToolDef } from "./llm";
import { log } from "./config";

// Mainnet USDC + treasury wallet that receives user payments
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const TREASURY = "CBLJ4AcE9UkMr3s92n6K4y4Yi6WWVbyFR2p8jyNdfPMF";

// Fixed price per chat turn (0.004 USDC = 4000 atomic units)
const PRICE_UNITS = "4000";

export async function gatewayHandler(
  req: IncomingMessage,
  res: ServerResponse
) {
  const body = JSON.parse(await readBody(req));
  const messages = (body.messages ?? []) as LLMMessage[];
  const tools = (body.tools ?? []) as LLMToolDef[];
  const hasPayment = Boolean(req.headers["payment-signature"]);

  // Phase 1: no payment → return 402
  if (!hasPayment) {
    const paymentRequired = {
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: "solana",
          asset: USDC_MINT,
          maxAmountRequired: PRICE_UNITS,
          payTo: TREASURY,
          maxTimeoutSeconds: 300,
          description: "SeekerBud AI chat turn",
        },
      ],
    };
    const header = Buffer.from(JSON.stringify(paymentRequired)).toString("base64");
    res.writeHead(402, {
      "content-type": "application/json",
      "payment-required": header,
    });
    res.end(JSON.stringify({ error: "Payment required" }));
    return;
  }

  // Phase 2: payment present → call Groq and stream
  log("info", `gateway: payment received, calling Groq (${messages.length} msgs)`);

  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });
  res.flushHeaders?.();

  const emitChunk = (chunk: object) => {
    res.write(`data: ${JSON.stringify({ choices: [{ delta: chunk }] })}\n\n`);
  };

  try {
    const result = await groqTurn(messages, tools, (delta) => {
      emitChunk({ content: delta });
    });

    if (result.outcome.kind === "tools") {
      emitChunk({
        tool_calls: result.outcome.calls.map((c, i) => ({
          index: i,
          id: c.id,
          type: c.type,
          function: { name: c.function.name, arguments: c.function.arguments },
        })),
      });
    }
  } catch (err) {
    log("error", `gateway: Groq failed — ${(err as Error).message}`);
  }

  res.write("data: [DONE]\n\n");
  res.end();
}
