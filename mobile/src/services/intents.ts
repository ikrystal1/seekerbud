import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { ChatEvent } from "./chat";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function solBalance(balance: number) {
  return Math.round((balance / LAMPORTS_PER_SOL) * 10000) / 10000;
}

function ellipsify(str: string, len = 6) {
  if (str.length <= len * 2 + 1) return str;
  return `${str.slice(0, len)}...${str.slice(-len)}`;
}

let counter = 0;
const nextProposalId = () => `t_${++counter}_${Date.now()}`;

/**
 * MOCK intent engine — answers with REAL on-chain data (balance, tokens,
 * signatures) plus canned activity. Replaced by the backend tool loop
 * (backend/api.md) once it's live. No emoji — icons are mapped client-side
 * from the `icon` key.
 */
export async function runMockIntent(
  connection: Connection,
  address: PublicKey,
  text: string
): Promise<ChatEvent[]> {
  await delay(600 + Math.random() * 500);

  const lower = text.toLowerCase();

  const sendMatch = lower.match(
    /(?:send|transfer)\s+([\d.]+)\s*sol\s+(?:to\s+)?([1-9A-HJ-NP-Za-km-z]{32,44})/
  );
  if (sendMatch) {
    const amount = sendMatch[1];
    const to = sendMatch[2];
    try {
      new PublicKey(to);
    } catch {
      return [
        {
          type: "error",
          content: `That doesn't look like a valid Solana address: ${to}. Double-check and try again.`,
        },
      ];
    }
    return [
      {
        type: "action",
        proposal: { id: nextProposalId(), amount, to, fee_estimate: "0.000005" },
      },
      {
        type: "text",
        icon: "send",
        content:
          "Review the transfer below. You confirm and sign with your Seed Vault — I never touch your keys.",
        costUsd: 0.004,
      },
    ];
  }

  if (/(balance|how much|sol do i have|my sol)/.test(lower)) {
    const balance = await connection.getBalance(address);
    return [
      {
        type: "text",
        icon: "balance",
        content: `You have ${solBalance(balance)} SOL.`,
        costUsd: 0.004,
      },
    ];
  }

  if (/(token|holdings|assets|what do i own|coins)/.test(lower)) {
    const parsed = await connection.getParsedTokenAccountsByOwner(address, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    });
    const rows = parsed.value
      .map(({ account }) => {
        const info = account.data.parsed.info;
        const amount = Number(info.tokenAmount.uiAmount ?? 0).toLocaleString();
        return `  ${amount} ${info.tokenAmount.symbol || ellipsify(info.mint, 4)}`;
      })
      .join("\n");
    return [
      {
        type: "text",
        icon: "tokens",
        content: rows
          ? `Your tokens:\n${rows}`
          : "No SPL tokens in this wallet — just SOL.",
        costUsd: 0.004,
      },
    ];
  }

  if (/(activity|history|recent|today|transaction|what did i do)/.test(lower)) {
    const sigs = await connection.getSignaturesForAddress(address, { limit: 5 });
    const lines = sigs.map(
      (s) =>
        `  ${ellipsify(s.signature, 8)}  ${new Date(
          s.blockTime! * 1000
        ).toLocaleTimeString()}`
    );
    return [
      {
        type: "text",
        icon: "activity",
        content: lines.length
          ? `Your last ${lines.length} transactions:\n${lines.join("\n")}`
          : "No transactions found yet.",
        costUsd: 0.004,
      },
    ];
  }

  return [
    {
      type: "text",
      icon: "info",
      content:
        'I\'m not sure what you meant yet — my full brain arrives with the backend. Try: "my balance", "my tokens", "what did I do today", or "send 0.05 SOL to <address>".',
    },
  ];
}
