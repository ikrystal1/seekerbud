/**
 * Groq LLM client — OpenAI-compatible chat completions.
 * Free tier, no credit card needed. https://console.groq.com
 */
import { config, log } from "./config";
import type { LLMMessage, LLMResult, LLMToolDef, ToolCallJSON } from "./llm";

const GROQ_BASE = "https://api.groq.com/openai/v1";

async function callGroq(
  messages: LLMMessage[],
  tools: LLMToolDef[],
  stream: boolean
): Promise<Response> {
  const key = config.groqApiKey;
  if (!key) throw new Error("GROQ_API_KEY not set");

  return fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: config.groqModel,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      stream,
    }),
    signal: AbortSignal.timeout(60_000),
  });
}

export async function groqTurn(
  messages: LLMMessage[],
  tools: LLMToolDef[],
  onDelta?: (delta: string) => void
): Promise<LLMResult> {
  const res = await callGroq(messages, tools, true);
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    log("error", `groq: HTTP ${res.status} — ${err.slice(0, 200)}`);
    return { outcome: { kind: "error", message: `Groq error ${res.status}` }, costUsd: 0 };
  }
  return parseSse(res, onDelta);
}

async function parseSse(
  res: Response,
  onDelta?: (delta: string) => void
): Promise<LLMResult> {
  const reader = res.body?.getReader();
  if (!reader) return { outcome: { kind: "error", message: "No body" }, costUsd: 0 };

  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  const toolCalls = new Map<number, ToolCallJSON>();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const chunk = JSON.parse(data);
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta.content) {
          text += delta.content;
          onDelta?.(delta.content);
        }
        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            const existing = toolCalls.get(idx) ?? {
              id: tc.id ?? `call_${idx}`,
              type: "function" as const,
              function: { name: "", arguments: "" },
            };
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.function.name += tc.function.name;
            if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
            toolCalls.set(idx, existing);
          }
        }
      } catch { /* skip malformed */ }
    }
  }

  const calls = [...toolCalls.values()].filter((c) => c.function.name);
  if (calls.length > 0) return { outcome: { kind: "tools", calls }, costUsd: 0 };
  return { outcome: { kind: "text", text }, costUsd: 0 };
}
