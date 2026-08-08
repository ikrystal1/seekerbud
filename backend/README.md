# SeekerBud Backend

> Node API (Vercel serverless) — the AI brain + chain reads + x402 payments.
> **The backend never sees a user private key. It cannot sign user transactions.**

---

## What this folder contains

| File | Purpose |
| --- | --- |
| `README.md` (this) | Overview, structure, quickstart, dev loop |
| `api.md` | Endpoint contracts (`/api/chat`, request/response, streaming, errors) |
| `agent.md` | Solana Agent Kit v2 setup, the only-4-tools policy, prompts |
| `x402.md` | x402 payment integration (Mode B default), failure handling |
| `env.md` | Every environment variable, what it does, where to get it |

## What the backend does

```
Mobile app ──HTTPS──▶ /api/chat ──▶ LLM loop (x402-paid) ──▶ Agent Kit tools
                                                              │
                                                              ▼
                                                      Solana RPC (reads)
```

1. Receives a chat message + the user's **public address** (never keys)
2. Runs the LLM tool-calling loop, paying per call via **x402** (USDC-SPL, Mode B)
3. Exposes exactly **4 tools**: `get_sol_balance` · `get_token_balances` · `get_transaction_history` · `prepare_transfer`
4. Streams the reply back

**It does NOT:** build/sign user transactions, hold user keys, or spend user funds.

---

## Folder structure (planned)

```text
api/
├── chat.ts                  # POST /api/chat — orchestrates one user turn
└── (V2: session.ts, rule.ts, scheduler.ts)

lib/
├── agent.ts                 # SolanaAgentKit init (throwaway keypair)
├── tools.ts                 # the 4 tools + guards
├── prompts.ts               # SeekerBud persona + tool rules
├── x402.ts                  # 402 → sign → retry client, cost cap
├── solana.ts                # RPC helpers (balance, tokens, history)
└── (V2: session-store.ts, rules.ts, scheduler.ts)

test/                        # unit + integration tests
.env                         # env vars (see env.md)
```

---

## Quickstart (dev)

```bash
npm install
cp .env.example .env          # fill in — see env.md
npm run dev                   # local serverless (Vercel dev)
curl -N -X POST localhost:3000/api/chat \
  -H 'content-type: application/json' \
  -d '{"address":"<your_pubkey>","message":"What is my balance?"}'
```

## Dev loop

1. Run locally with `vercel dev` (or plain node server)
2. Emulator app points `services/chat.ts` at the local URL
3. Use devnet RPC + test USDC; payer wallet holds test funds only
4. All signing surfaces (session keys) are V2 — nothing in V1 signs anything

---

## Hard rules

- [ ] Never log or persist any private key
- [ ] Payer wallet balance = max x402 loss — keep it small (test: few $)
- [ ] Agent keypair is throwaway — regenerate per deploy, no funds
- [ ] Tools list never grows beyond the 4 without a product decision
- [ ] `prepare_transfer` must never sign — proposal only
- [ ] Cost cap on every x402 call (fail closed if exceeded)

## Related docs (root)

- `../architecture.md` — system view, backend module map
- `../autotransact.md` — V2: sessions, rules, scheduler
- `../x402.md` — the x402 protocol spec (concept + modes)
- `../README.md` — product + stack
