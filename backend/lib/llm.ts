import { config } from "./config";
import { x402Fetch, lastPaymentCostUsd } from "./x402";
import { stubDecide } from "./stub";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function stubTurn(
  messages: LLMMessage[],
  onDelta?: (delta: string) => void
): Promise<LLMResult> {
  const decision = stubDecide(messages);
  if (decision.kind === "tools") {
    return { outcome: decision, costUsd: 0 };
  }
  const words = decision.text.split(/(\s+)/);
  for (const word of words) {
    await delay(15);
    if (word.length > 0) onDelta?.(word);
  }
  return { outcome: decision, costUsd: 0 };
}

export type ToolCallJSON = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type LLMMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: ToolCallJSON[];
  tool_call_id?: string;
};

export type LLMToolDef = {
  type: "function";
  function: { name: string; description: string; parameters: unknown };
};

export type LLMOutcome =
  | { kind: "text"; text: string }
  | { kind: "tools"; calls: ToolCallJSON[] }
  | { kind: "error"; message: string };

export type LLMResult = {
  outcome: LLMOutcome;
  costUsd: number;
};

/**
 * One LLM turn against the x402 gateway (OpenAI-compatible, streaming).
 * `onDelta` receives text tokens as they arrive. `address` is the user's
 * wallet — used for the per-address daily cost cap.
 */
export async function llmTurn(
  messages: LLMMessage[],
  tools: LLMToolDef[],
  onDelta?: (delta: string) => void,
  address?: string
): Promise<LLMResult> {
  if (!config.x402GatewayUrl) {
    return stubTurn(messages, onDelta);
  }

  const body = {
    model: config.x402Model,
    messages,
    tools,
    stream: true,
  };

  const res = await x402Fetch(
    config.x402GatewayUrl,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    { address }
  );

  if (!res.ok) {
    return {
      outcome: {
        kind: "error",
        message: `Gateway error ${res.status}`,
      },
      costUsd: lastPaymentCostUsd(),
    };
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    const json = (await res.json()) as {
      choices?: Array<{
        message?: { content?: string | null; tool_calls?: ToolCallJSON[] };
      }>;
    };
    return parseJsonCompletion(json);
  }

  return parseSseCompletion(res, onDelta);
}

function parseJsonCompletion(json: {
  choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCallJSON[] } }>;
}): LLMResult {
  const message = json.choices?.[0]?.message;
  if (message?.tool_calls?.length) {
    return { outcome: { kind: "tools", calls: message.tool_calls }, costUsd: lastPaymentCostUsd() };
  }
  return {
    outcome: { kind: "text", text: message?.content ?? "" },
    costUsd: lastPaymentCostUsd(),
  };
}

export async function parseSseCompletion(
  res: Response,
  onDelta?: (delta: string) => void
): Promise<LLMResult> {
  const reader = res.body?.getReader();
  if (!reader) {
    return { outcome: { kind: "error", message: "No response body" }, costUsd: 0 };
  }

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

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const chunk = JSON.parse(data);
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;
        if (typeof delta.content === "string" && delta.content) {
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
      } catch {
        // skip malformed chunk
      }
    }
  }

  const calls = [...toolCalls.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, call]) => call)
    .filter((c) => c.function.name);

  if (calls.length > 0) {
    return { outcome: { kind: "tools", calls }, costUsd: lastPaymentCostUsd() };
  }
  return { outcome: { kind: "text", text }, costUsd: lastPaymentCostUsd() };
}
