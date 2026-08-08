# Backend — Solana Agent Kit v2 Integration

> The agent/tool layer. Init, the only-4-tools policy, and how each tool behaves.

---

## 1. Init (`lib/agent.ts`)

```ts
import { SolanaAgentKit, KeypairWallet } from "solana-agent-kit";
import { Keypair } from "@solana/web3.js";
import TokenPlugin from "@solana-agent-kit/plugin-token";
import MiscPlugin from "@solana-agent-kit/plugin-misc";

// THROWAWAY keypair — generated per process, holds no funds, never persisted.
const wallet = new KeypairWallet(Keypair.generate());

const agent = new SolanaAgentKit(
  wallet,
  process.env.SOLANA_RPC_URL,
  { OPENAI_API_KEY: "" },        // key unused — LLM is paid via x402
).use(TokenPlugin).use(MiscPlugin);
```

- The keypair exists **only** because the Kit constructor requires a wallet.
- It signs nothing user-facing; read tools don't sign at all.
- **Never** put a funded/real key here.

---

## 2. Tools policy — only these 4

```text
get_sol_balance(address)        → SOL amount (+ devnet label)
get_token_balances(address)     → list {mint, symbol, amount}
get_transaction_history(address, limit) → recent txs (signed/parsed)
prepare_transfer(amount, to, memo?) → PROPOSAL only — NEVER signs
```

Everything else in Agent Kit stays **disabled**. Rationale: small context → fewer hallucinations; no stray spend paths; v2's own design goal.

### Rules per tool

| Tool | Reads chain | Signs | Notes |
| --- | --- | --- | --- |
| `get_sol_balance` | ✅ | ❌ | uses `agent` RPC or direct helper |
| `get_token_balances` | ✅ | ❌ | SPL token accounts for address |
| `get_transaction_history` | ✅ | ❌ | last N; V1 via RPC; Helius later |
| `prepare_transfer` | ✅ (fee estimate) | ❌ | returns proposal card payload |

### `prepare_transfer` contract

```ts
type TransferProposal = {
  id: string;
  type: "transfer_proposal";
  amount: string;        // "0.05"
  unit: "SOL";
  to: string;            // base58, validated
  fee_estimate: string;  // "0.000005"
  valid_until: number;   // ms — card expires
};
```

The proposal is returned as an `action` event (`api.md`). The app renders the ActionCard; **Confirm is handled entirely on-device** (MWA → Seed Vault) — backend's job ends at the proposal.

---

## 3. System prompt (`lib/prompts.ts`)

Persona: *SeekerBud, friendly AI companion on the Solana Seeker. Answers in short, warm messages.*

Hard rules in the prompt:
1. You have exactly 4 tools; use them when the question matches; otherwise answer from knowledge or ask for clarification.
2. For transfers: always call `prepare_transfer`, present the proposal, and never claim the transfer is done until the user confirms on-device.
3. Never ask for a private key, seed phrase, or password. Ever.
4. Prefix read answers with the icon: 💰 balance, 🪙 tokens, 🕘 activity.
5. If unclear, suggest the 4 intents (balance · tokens · activity · send).

---

## 4. Tool-calling loop (per user turn)

```
message + address
   │
   ▼
LLM turn 1 (x402-paid) ──▶ tool call? ──no──▶ stream final text ──▶ done
   │ yes
   ▼
run tool (RPC read / prepare proposal)
   │
   ▼
LLM turn 2 (x402-paid) ──▶ synthesize result ──▶ stream text (+ action event)
   │
   ▼
emit `done` with total cost
```

Guard rails:
- Max 4 LLM turns per user message (tool loop bound)
- Per-turn cost cap from `env.md` (`X402_MAX_COST_PER_TURN`) — fail closed
- Tool timeouts (RPC slow → error bubble, not hang)

---

## 5. Testing checklist

- [ ] Balance for empty wallet → "0 SOL"
- [ ] Token list with only SOL → just SOL
- [ ] `prepare_transfer` with invalid address → 400-style refusal, no proposal
- [ ] LLM misintent ("send 5 ETH") → polite "I can only send SOL"
- [ ] RPC down → error bubble + retry, no silent hang
- [ ] Cost cap exceeded → fail closed with clear message
