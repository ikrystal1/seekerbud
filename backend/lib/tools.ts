import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  estimateTransferFee,
  getSolBalance,
  getTokenBalances,
  getTransactionHistory,
} from "./solana";
import { getTokenPrice } from "./jupiter";
import { log } from "./config";

export type TransferProposal = {
  id: string;
  type: "transfer_proposal";
  amount: string;
  unit: "SOL";
  to: string;
  fee_estimate: string;
  valid_until: number;
};

export type ToolContext = {
  connection: Connection;
  address: PublicKey;
  onProposal?: (proposal: TransferProposal) => void;
};

let proposalCounter = 0;
const nextProposalId = () => `t_${++proposalCounter}_${Date.now()}`;

export type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
};

export type ToolDef = {
  name: string;
  description: string;
  parameters: JsonSchema;
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>;
};

const solString = (lamports: number) =>
  `${(lamports / LAMPORTS_PER_SOL).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  })} SOL`;

export const TOOLS: ToolDef[] = [
  {
    name: "get_sol_balance",
    description: "Get the SOL balance of a wallet. Use when user asks about their balance.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "The base58 Solana address." },
      },
      required: ["address"],
    },
    async execute(args, ctx) {
      const address = parseAddress(args.address, ctx.address);
      const lamports = await getSolBalance(ctx.connection, address);
      return `💰 Balance: ${solString(lamports)}`;
    },
  },
  {
    name: "get_token_balances",
    description: "Get SPL token holdings of a wallet.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "The base58 Solana address." },
      },
      required: ["address"],
    },
    async execute(args, ctx) {
      const address = parseAddress(args.address, ctx.address);
      const holdings = await getTokenBalances(ctx.connection, address);
      if (holdings.length === 0) return "🪙 No SPL tokens held.";
      return "🪙 " + holdings.map((h) => `${h.amount.toLocaleString()} ${h.symbol || h.mint.slice(0, 8)}`).join(", ");
    },
  },
  {
    name: "get_transaction_history",
    description: "Get recent transaction history of a wallet.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "The base58 Solana address." },
        limit: { type: "number", description: "Max results (1-20, default 5)." },
      },
      required: ["address"],
    },
    async execute(args, ctx) {
      const address = parseAddress(args.address, ctx.address);
      const limit = typeof args.limit === "number" ? args.limit : 5;
      const txs = await getTransactionHistory(ctx.connection, address, limit);
      if (txs.length === 0) return "No transactions yet.";
      return "🕘 " + txs.map((t) => {
        const time = t.blockTime ? new Date(t.blockTime * 1000).toLocaleString() : "unknown";
        return `${t.signature.slice(0, 12)}… ${time} ${t.err ? "❌" : "✅"}`;
      }).join("\n");
    },
  },
  {
    name: "prepare_transfer",
    description: "Prepare a SOL transfer. User must confirm on-device — never say it's done.",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount of SOL." },
        to: { type: "string", description: "Recipient base58 address." },
      },
      required: ["amount", "to"],
    },
    async execute(args, ctx) {
      const amount = Number(args.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount.");
      const to = parseAddress(args.to, ctx.address);
      if (to.equals(ctx.address)) throw new Error("Can't send to yourself.");
      const feeEstimate = await estimateTransferFee(ctx.connection);
      const proposal: TransferProposal = {
        id: nextProposalId(), type: "transfer_proposal",
        amount: String(amount), unit: "SOL", to: to.toBase58(),
        fee_estimate: feeEstimate, valid_until: Date.now() + 5 * 60 * 1000,
      };
      ctx.onProposal?.(proposal);
      return JSON.stringify(proposal);
    },
  },
  {
    name: "get_token_price",
    description: "Get current price of a token in USD or SOL. Use for: 'price of SOL', 'what is BONK worth', 'check X token price'.",
    parameters: {
      type: "object",
      properties: {
        token: { type: "string", description: "Token symbol (SOL, USDC, BONK, etc) or mint address." },
      },
      required: ["token"],
    },
    async execute(args) {
      const token = String(args.token).toUpperCase();
      const price = await getTokenPrice(token === "SOL" ? "SOL" : token);
      if (!price) return `Could not find price for ${token}. Try the token mint address instead.`;
      return `📊 ${price.mintSymbol}: $${price.price.toFixed(6)} ${price.vsTokenSymbol}`;
    },
  },
];

export const TOOL_INDEX: Record<string, ToolDef> = Object.fromEntries(
  TOOLS.map((t) => [t.name, t])
);

export type ToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

export async function runTool(
  call: ToolCall,
  ctx: ToolContext
): Promise<{ output: string; error?: string }> {
  const def = TOOL_INDEX[call.name];
  if (!def) return { output: "", error: `Unknown tool: ${call.name}` };
  try {
    log("debug", `tool:${call.name} ${JSON.stringify(call.args)}`);
    const output = await def.execute(call.args, ctx);
    return { output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("warn", `tool:${call.name} failed: ${message}`);
    return { output: "", error: message };
  }
}

function parseAddress(raw: unknown, fallback: PublicKey): PublicKey {
  if (typeof raw === "string" && raw.length > 0) return new PublicKey(raw);
  return fallback;
}
