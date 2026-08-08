# SeekerBud — Revenue Model

> The stress-free version: prepaid only, per-message markup, automatic on-chain settlement. No invoices, no subscriptions, no refunds desk, no billing stack.

---

## 1. The one-line model

**Users prepay USDC for AI messages; we charge more per message than the AI costs; x402 settles the difference to our treasury automatically.**

Reads (balances, tokens, activity, summaries) are **free forever** — they're the growth engine. Only AI messages are paid. That's the whole business.

---

## 2. Why this won't stress us

| Stressor | How we avoid it |
|---|---|
| Chasing unpaid invoices | Impossible — prepaid only. No balance, no service. |
| Refund / chargeback desk | Prepaid, non-refundable (see ToS). On-chain, irreversible. |
| Payment processor fees & Payouts | x402 settles USDC on-chain to our treasury. No Stripe, no KYC gate. |
| Subscriptions to manage | None. We never bill a card. |
| Billing infrastructure | One pricing layer in the backend (`lib/`), env-configured. |
| Support load | Transparent cost line on every message + low-balance nudge = few complaints. |
| Theft / fraud | Caps built in (`budget.ts`: per-turn, per-address, per-day). Bounded loss. |

---

## 3. Pricing today (V1)

```
User pays:      $0.010 per AI message   ← flat, displayed before send
Gateway cost:   $0.004 per message      ← x402 wholesale LLM cost
Our margin:     $0.006 per message      ← 60% gross margin, automatic
```

- One flat price. No tiers, no models menu, no complexity.
- The markup lives in one place: the price we charge vs. the price the x402 gateway quotes. (Gateway quotes wholesale; our floor is $0.01.)
- If a gateway quote ever exceeds our charge price, the existing per-turn cap in `backend/lib/x402.ts` aborts the turn — we never sell at a loss.

---

## 4. Where the money actually lands

```
User agent wallet (prepaid)
        │  $0.01 USDC per message
        ▼
x402 gateway  ── wholesale cost (~$0.004) → LLM provider
        │
        └─────── difference (~$0.006) → our treasury wallet
                                          (automatic, on-chain)
```

The treasury wallet is a plain Solana address. We read it like any balance. No accounting software needed.

---

## 5. Scale math (at $0.01 flat)

| Daily AI messages | Monthly revenue (gross) | Monthly margin @ 60% | Run cost feel |
|---|---|---|---|
| 200 | $60 | $36 | side project |
| 1,000 | $300 | $180 | ramen |
| 5,000 | $1,500 | $900 | real business |
| 25,000 | $7,500 | $4,500 | comfortable |
| 100,000 | $30,000 | $18,000 | serious |

Reality check: **one power user ≈ 100–300 messages/month ≈ $1–3 gross.** We need thousands of active users, not whales. Free reads → viral onboarding is the compounding lever.

---

## 6. Free vs paid — the deliberate split

| | Free (Level 0 reads) | Paid (AI messages) |
|---|---|---|
| Balances, tokens, activity, summaries | ✅ | — |
| Scheduled morning report / price alerts | ✅ (V2) | — |
| Chat with the AI (any message) | — | $0.01 |

Reads cost us ~nothing (RPC only). They build habit and trust. Messages are where the margin is.

---

## 7. Future revenue streams (in priority order — add only when V1 works)

| # | Stream | Mechanics | Effort |
|---|---|---|---|
| 1 | **Model-tier markup** | "Turbo" / premium model button at $0.03; default stays $0.01 | Low — one env flag |
| 2 | **AutoTransact premium** | Session keys / rules (see `autotransact.md`) as a paid feature: e.g. $5/mo in USDC, auto-deducted from prepaid balance | Medium — after Level 1 ships |
| 3 | **Prepaid packs** | $5 / $10 / $20 top-ups with bonus (10% free on $20) → raises float, cash flow up-front | Low |
| 4 | **Priority support / SLA** | Paid tier for heavy users; likely not needed at our scale for a long time | Skip |
| 5 | **Treasury yield** | Idle prepaid float in USDC → small yield on the treasury | Skip — regulatory noise > cents |

**Anti-stress rule:** each stream must be (a) prepaid, (b) no invoicing, (c) implementable in a weekend. Otherwise it waits.

---

## 8. Guardrails (already built, keep them)

- `X402_MAX_COST_PER_TURN` — never pay above our price (no loss-making turns)
- `X402_MAX_COST_PER_ADDRESS_PER_DAY` — abuse cap per user
- `X402_MAX_COST_PER_DAY` — treasury safety, global
- Low-balance nudge in-app (`< $0.20`) — users self-manage, we don't chase
- Transparent per-message cost — the pricing story sells itself

---

## 9. What we must NOT do yet

- No credit / "bill me later" — breaks prepaid.
- No fiat cards stored — breaks the no-KYC, no-PCI story.
- No per-user invoices — x402 receipts (on-chain) are the receipt.
- No free AI messages at scale — free tier is reads only, otherwise margin dies.

---

## 10. The 30-second pitch

> "Every AI message costs a few cents in USDC via x402 — no subscriptions. You prepay once, chat freely, and each message is a tiny transaction your wallet signs."

Users understand this instantly, and it's honest: costs are visible, capped, and paid the crypto-native way.

---

## 11. Related docs

- `prepaid-wallet.md` — the agent wallet that pays (margin math in §6)
- `x402.md` — the payment protocol and modes
- `autotransact.md` — V2 paid surface (sessions / rules)
- `backend/lib/budget.ts` + `backend/lib/x402.ts` — caps and pricing enforcement
- `landingpage/src/Legal.tsx` — payment terms & non-refundable prepaid language
