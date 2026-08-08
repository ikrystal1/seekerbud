import type { IncomingMessage, ServerResponse } from "http";
import { readBody } from "./http-utils";
import { stubDecide } from "./stub";
import type { LLMMessage, ToolCallJSON } from "./llm";

const MOCK_PRICE_UNITS = "4000"; // 0.004 USD (6 decimals)
// Devnet USDC mint + a fixed recipient wallet — the x402 SDK builds a real
// signed TransferChecked tx from these, so they must be valid Solana addresses.
const DEVNET_USDC_MINT =
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const MOCK_RECIPIENT =
  "5oNDL1sF5jP7W6eYd9aRqzXn2U3mBvKj8QwTsLp4ZxCe";

/**
 * Mock x402 LLM gateway for local dev/testing.
 * OpenAI-compatible /v1/chat/completions behind a simulated 402 handshake:
 *   1st call  → 402 + payment-required header (base64 JSON)
 *   2nd call  → payment-signature header accepted → streams a stub LLM reply
 * Set X402_GATEWAY_URL=http://localhost:3000/__mock__/v1/chat/completions
 * to exercise the full payment path without spending real USDC.
 */
export async function mockGatewayHandler(
  req: IncomingMessage,
  res: ServerResponse
) {
  const body = JSON.parse(await readBody(req));
  const messages = (body.messages ?? []) as LLMMessage[];
  const hasPayment = Boolean(req.headers["payment-signature"]);

  if (!hasPayment) {
    const paymentRequired = {
      x402Version: 1,
      accepts: [
        {
          scheme: "exact",
          network: "solana-devnet",
          token: DEVNET_USDC_MINT,
          asset: DEVNET_USDC_MINT,
          maxAmountRequired: MOCK_PRICE_UNITS,
          payTo: MOCK_RECIPIENT,
          description: "LLM completion (mock gateway)",
        },
      ],
    };
    const header = Buffer.from(JSON.stringify(paymentRequired)).toString(
      "base64"
    );
    res.writeHead(402, {
      "content-type": "application/json",
      "payment-required": header,
    });
    res.end(JSON.stringify({ error: "payment_required" }));
    return;
  }

  const decision = stubDecide(messages);

  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });
  res.flushHeaders?.();

  const emitChunk = (chunk: object) => {
    res.write(`data: ${JSON.stringify({ choices: [{ delta: chunk }] })}\n\n`);
  };

  if (decision.kind === "tools") {
    emitChunk({
      tool_calls: decision.calls.map((c: ToolCallJSON, index: number) => ({
        index,
        id: c.id,
        type: c.type,
        function: { name: c.function.name, arguments: c.function.arguments },
      })),
    });
  } else {
    for (const chunk of decision.text.match(/.{1,12}/gs) ?? []) {
      emitChunk({ content: chunk });
    }
  }
  res.write("data: [DONE]\n\n");
  res.end();
}
