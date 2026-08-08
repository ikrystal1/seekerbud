# Backend — Environment Variables

> Single source of truth for every env var the backend uses. Copy `.env.example` → `.env` for local dev.

---

## Required (MVP)

| Var | Value (example) | Used by | Where to get it |
| --- | --- | --- | --- |
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` | `lib/agent.ts`, `lib/solana.ts` — all chain reads | Public devnet RPC; Helius/QuickNode later |
| `X402_MODE` | `prepaid` | `lib/x402.ts` — payment mode | — |
| `X402_GATEWAY_URL` | (chosen x402 LLM gateway) | `lib/x402.ts` | Gateway provider (see `x402.md` §3) |

## x402 payments

| Var | Example | Notes |
| --- | --- | --- |
| `X402_FACILITATOR_URL` | `https://api.cdp.coinbase.com/platform/v2/x402` | Settlement facilitator |
| `X402_PAYER_PRIVATE_KEY` | (base58) | **Mode B only.** Server payer wallet — small funded balance. Never a user key. |
| `X402_MAX_COST_PER_TURN` | `0.05` | USD cap per LLM turn — fail closed |
| `X402_MAX_COST_PER_DAY` | `1.00` | USD daily budget, both modes |

## Runtime / ops

| Var | Example | Notes |
| --- | --- | --- |
| `PORT` | `3000` | local dev only |
| `LOG_LEVEL` | `info` | `debug` for payment traces |
| `NODE_ENV` | `development` / `production` | Vercel sets automatically |

## Not in this backend (ever)

```text
✗ USER PRIVATE KEYS / SEED PHRASES   — users' keys live in Seed Vault hardware
✗ OPENAI_API_KEY (default path)      — LLM is x402-paid; no provider key held
✗ SESSION KEY MATERIAL (V2)          — added with autotransact Phase B, own doc
```

## Env hygiene rules

1. `.env` is gitignored; `.env.example` is committed with **placeholder** values only
2. `X402_PAYER_PRIVATE_KEY` lives in Vercel env settings, never in the repo
3. Rotate payer key when balance grows beyond throwaway size
4. Every new var lands in `.env.example` + this file + the right `lib/*` doc, same PR

## `.env.example` (canonical)

```env
SOLANA_RPC_URL=https://api.devnet.solana.com

X402_MODE=prepaid
X402_GATEWAY_URL=
X402_FACILITATOR_URL=https://api.cdp.coinbase.com/platform/v2/x402
X402_PAYER_PRIVATE_KEY=
X402_MAX_COST_PER_TURN=0.05
X402_MAX_COST_PER_DAY=1.00

LOG_LEVEL=info
```
