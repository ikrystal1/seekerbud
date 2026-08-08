import type { LLMMessage, ToolCallJSON } from "./llm";

export type StubDecision =
  | { kind: "text"; text: string }
  | { kind: "tools"; calls: ToolCallJSON[] };

/**
 * Deterministic stand-in for the LLM — used when no x402 gateway is
 * configured (x402.md §3 decision gate: manual-payment stub for the demo).
 * Mirrors the intents the app knows: balance · tokens · activity · send.
 */
export function stubDecide(messages: LLMMessage[]): StubDecision {
  const last = messages[messages.length - 1];

  if (last.role === "tool") {
    const toolName = messages[messages.length - 2]?.content ?? "";
    if (/prepare_transfer/.test(toolName)) {
      return {
        kind: "text",
        text: "Review the transfer card above — you confirm and sign with your Seed Vault. I never touch your keys.",
      };
    }
    if (/get_sol_balance/.test(toolName)) {
      return { kind: "text", text: `💰 ${last.content}` };
    }
    if (/get_token_balances/.test(toolName)) {
      return { kind: "text", text: `🪙 Here's what you hold:\n${last.content}` };
    }
    if (/get_transaction_history/.test(toolName)) {
      return { kind: "text", text: `🕘 Recent activity:\n${last.content}` };
    }
    return { kind: "text", text: String(last.content) };
  }

  const text = String(last.content ?? "");
  const lower = text.toLowerCase();

  const sendMatch = text.match(
    /(?:send|transfer)\s+([\d.]+)\s*sol\s+(?:to\s+)?([1-9A-HJ-NP-Za-km-z]{32,44})/i
  );
  if (sendMatch) {
    return {
      kind: "tools",
      calls: [
        {
          id: "stub_send",
          type: "function",
          function: {
            name: "prepare_transfer",
            arguments: JSON.stringify({
              amount: Number(sendMatch[1]),
              to: sendMatch[2],
            }),
          },
        },
      ],
    };
  }

  if (/(balance|how much|sol do i have|my sol)/.test(lower)) {
    return stubToolCall("stub_balance", "get_sol_balance", {
      address: addressOf(messages),
    });
  }
  if (/(token|holdings|assets|what do i own|coins)/.test(lower)) {
    return stubToolCall("stub_tokens", "get_token_balances", {
      address: addressOf(messages),
    });
  }
  if (/(activity|history|recent|today|transaction|what did i do)/.test(lower)) {
    return stubToolCall("stub_activity", "get_transaction_history", {
      address: addressOf(messages),
      limit: 5,
    });
  }

  return {
    kind: "text",
    text: 'I\'m not sure what you meant yet. Try: "my balance", "my tokens", "what did I do today", or "send 0.05 SOL to <address>".',
  };
}

function stubToolCall(
  id: string,
  name: string,
  args: Record<string, unknown>
): StubDecision {
  return {
    kind: "tools",
    calls: [
      {
        id,
        type: "function",
        function: { name, arguments: JSON.stringify(args) },
      },
    ],
  };
}

/** The connected wallet address is embedded in the first user message by prompts.userMessage. */
function addressOf(messages: LLMMessage[]): string {
  const match = messages[0]?.content?.match(/\[Wallet: ([^\]]+)\]/);
  return match?.[1] ?? "";
}
