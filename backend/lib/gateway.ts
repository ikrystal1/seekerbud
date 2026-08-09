/**
 * SeekerBud x402 LLM Gateway — our own gateway powered by Groq.
 *
 * Flow:
 *   1st call → 402 + payment-required header
 *   2nd call → verify & submit payment → streams Groq LLM reply
 */
import type { IncomingMessage, ServerResponse } from "http";
import { Connection } from "@solana/web3.js";
import { readBody } from "./http-utils";
import { groqTurn } from "./groq";
import type { LLMMessage, LLMToolDef } from "./llm";
import { config, log } from "./config";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const TREASURY = "CBLJ4AcE9UkMr3s92n6K4y4Yi6WWVbyFR2p8jyNdfPMF";
const PRICE_UNITS = "4000"; // 0.004 USDC

export async function gatewayHandler(
  req: IncomingMessage,
  res: ServerResponse
) {
  const body = JSON.parse(await readBody(req));
  const messages = (body.messages ?? []) as LLMMessage[];
  const tools = (body.tools ?? []) as LLMToolDef[];
  const rawSig = req.headers["payment-signature"] as string | undefined;

  // Phase 1: no payment → return 402
  if (!rawSig) {
    const paymentRequired = {
      x402Version: 2,
      accepts: [{
        scheme: "exact",
        network: "solana",
        asset: USDC_MINT,
        maxAmountRequired: PRICE_UNITS,
        payTo: TREASURY,
        maxTimeoutSeconds: 300,
        description: "SeekerBud AI chat turn",
      }],
    };
    const header = Buffer.from(JSON.stringify(paymentRequired)).toString("base64");
    res.writeHead(402, {
      "content-type": "application/json",
      "payment-required": header,
    });
    res.end(JSON.stringify({ error: "Payment required" }));
    return;
  }

  // Phase 2: verify & submit payment, then call Groq
  try {
    const decoded = JSON.parse(Buffer.from(rawSig, "base64").toString("utf8"));
    const txBase64 = decoded?.payload?.transaction;
    if (!txBase64) throw new Error("Invalid payment payload");
    const txBytes = Buffer.from(txBase64, "base64");

    // Submit the signed transaction to Solana
    const connection = new Connection(config.solanaRpcUrl, "confirmed");
    log("info", `gateway: submitting payment tx (${txBytes.length} bytes)`);
    const txSig = await connection.sendRawTransaction(txBytes, {
      skipPreflight: false,
      maxRetries: 3,
    });
    log("info", `gateway: tx submitted ${txSig}`);

    // Wait for confirmation
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const confirm = await connection.confirmTransaction({
      signature: txSig,
      blockhash,
      lastValidBlockHeight,
    }, "confirmed");
    if (confirm.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirm.value.err)}`);
    }
    log("info", `gateway: payment confirmed! tx=${txSig}`);
  } catch (err: any) {
    log("error", `gateway: payment failed — ${err.message}`);
    res.writeHead(402, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Payment rejected", detail: err.message }));
    return;
  }

  // Payment verified — call Groq
  log("info", `gateway: payment ok, calling Groq (${messages.length} msgs)`);
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
          index: i, id: c.id, type: c.type,
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
