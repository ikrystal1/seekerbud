# SeekerBud — Architecture

> Full-system blueprint: what lives on the mobile device, what lives in the backend, and what we reuse vs. what we build. Complement to `README.md` (concept) and `ui.md` (screens).

---

## 1. System overview (deployment view)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SOLANA SEEKER (Android)                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    SeekerBud — Expo RN app                     │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │   │
│  │  │ Onboarding │  │ Chat UI    │  │ ActionCard │  │ WalletBtn │  │   │
│  │  │ (screens)  │  │ Message    │  │ (confirm)  │  │ (MWA)     │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └─────┬─────┘  │   │
│  │       │                │               │               │        │   │
│  │       └──────┬─────────┴───────┬───────┴───────┬───────┘        │   │
│  │              ▼                 ▼               ▼                 │   │
│  │     ┌────────────────┐ ┌──────────────┐ ┌──────────────┐        │   │
│  │     │ services/wallet│ │ services/    │ │ services/    │        │   │
│  │     │ (MWA auth)     │ │ chat (API)   │ │ solana (tx)  │        │   │
│  │     └───────┬────────┘ └──────┬───────┘ └──────┬───────┘        │   │
│  │             │                 │                │                 │   │
│  └─────────────┼─────────────────┼────────────────┼─────────────────┘   │
│                ▼                 │                ▼                     │
│   ┌────────────────────┐         │       ┌──────────────────┐          │
│   │ Seed Vault Wallet  │         │       │ USDC top-up /    │          │
│   │ (hardware keys)    │         │       │ payment signing  │          │
│   └────────────────────┘         │       └──────────────────┘          │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │  HTTPS /api/chat (streamed)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND — Node (Vercel)                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  POST /api/chat                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │   │
│  │  │ Vercel AI SDK│  │ Agent Kit v2 │  │ x402 payment client    │  │   │
│  │  │ (streaming)  │  │ (tools)      │  │ (402→sign→retry)       │  │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────────┘  │   │
│  │         │                 │                     │                 │   │
│  │  ┌──────▼──────────┐ ┌────▼─────────────────────▼───┐             │   │
│  │  │ LLM via x402    │ │  throwaway keypair (agent)   │             │   │
│  │  │ gateway (USDC)  │ │  payer wallet (Mode B, USDC) │             │   │
│  │  └─────────────────┘ └──────────────────────────────┘             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│  Env: X402_MODE, X402_PAYER_PRIVATE_KEY, SOLANA_RPC_URL                 │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
              ┌────────────────────┼─────────────────────┐
              ▼                    ▼                     ▼
┌─────────────────────┐ ┌──────────────────┐ ┌─────────────────────┐
│  Solana RPC         │ │  x402 LLM        │ │  Solana network     │
│  (devnet → mainnet) │ │  gateway         │ │  (USDC-SPL, tx)     │
│  balances, tokens,  │ │  pay-per-call    │ │                     │
│  tx history         │ │  settles USDC    │ │                     │
└─────────────────────┘ └──────────────────┘ └─────────────────────┘
```

**What talks to what:** app ↔ backend over HTTPS (streamed chat). Backend ↔ Solana RPC (reads), backend ↔ x402 gateway (paid LLM), app ↔ Seed Vault (on-device signing only).

---

## 2. Mobile app — module map

```
SeekerBud Expo RN app
│
├── app/ (entry, navigation)
│   ├── OnboardingStack        Welcome → Connect → Profile → Capabilities → Funding
│   ├── ChatStack              Chat (returning users land here)
│   └── Settings (V2: session keys, autopilot)
│
├── src/components/
│   ├── OnboardingScreen.tsx     step 1–3 stepper (ui.md §3–5)
│   ├── WalletButton.tsx         connect/disconnect (MWA)
│   ├── Chat.tsx                 message list + input + streaming
│   ├── Message.tsx              bubbles + cost line `(0.004 USDC · x402)`
│   └── ActionCard.tsx           transfer proposal: Cancel | Confirm
│
├── src/services/
│   ├── wallet.ts                MWA authorize / signAndSendTransactions
│   ├── chat.ts                  POST /api/chat, stream handling
│   └── solana.ts                build tx with @solana/kit (client-side)
│
└── src/constants/               RPC endpoint, gateway URL, theme
```

**Mobile owns:** onboarding, UX, streaming display, **final signing (never server-side)**.

---

## 3. Backend — module map

```
api/ (Node, Vercel serverless)
│
├── chat.ts                  POST — orchestrates one user turn:
│                            1. receive message + connected address
│                            2. run LLM tool-calling loop (via x402)
│                            3. stream tokens back to app
│
├── lib/
│   ├── agent.ts             SolanaAgentKit init (throwaway keypair, read-only)
│   ├── tools.ts             ONLY 4 tools: get_sol_balance · get_token_balances
│   │                        · get_transaction_history · prepare_transfer
│   ├── prompts.ts           SeekerBud system prompt (persona + tool rules)
│   └── x402.ts              402 → sign payment (payer wallet) → retry; cost cap
│
└── env                       X402_MODE · X402_PAYER_PRIVATE_KEY
                              · X402_LLM_GATEWAY_URL · SOLANA_RPC_URL
```

**Backend owns:** the AI loop, chain reads, payments (Mode B). **It never sees a user key.**

---

## 4. Chat request — end-to-end sequence

```
User (device)          Expo app              Backend               Solana
     │  "my balance?"     │                      │                    │
     │───────────────────▶│  POST /api/chat      │                    │
     │                    │─────────────────────▶│                    │
     │                    │                      │  1. x402 payment   │
     │                    │                      │─────▶ LLM gateway   │
     │                    │                      │◀──── streamed text  │
     │                    │                      │  2. tool call:      │
     │                    │                      │     get_sol_balance │
     │                    │                      │─────▶ RPC (read)    │
     │                    │                      │◀──── balance        │
     │                    │                      │  3. LLM summary     │
     │                    │  streamed reply      │  (x402 paid)        │
     │◀───────────────────│─────────────────────│                     │
     │   2.4831 SOL ≈ $2.94 (0.004 USDC paid)    │                     │
```

**Transfer path differs only at the end:** `prepare_transfer` returns a proposal → ActionCard in-app → **Confirm → wallet.ts signs via Seed Vault (MWA) → tx goes straight to Solana** — backend never involved in signing.

---

## 5. Reuse vs. build (what we actually write)

```
🟢 REUSE (no code of ours)                 🔴 BUILD (ours — the product)
├── Expo RN scaffold (create-solana-dapp)  ├── Onboarding flow + stepper
├── Mobile Wallet Adapter (@solana-mobile) ├── Chat UI / Message / ActionCard
├── @solana/kit + @solana/web3.js         ├── services/ (wallet, chat, solana)
├── Solana Agent Kit v2 (read tools)       ├── api/chat.ts orchestration
├── Vercel AI SDK (streaming)              ├── lib/agent + tools + prompts
├── x402 protocol + gateway               ├── lib/x402.ts (payer integration)
└── Solana RPC                            └── V2: session keys, Titan, autopilot
```

---

## 6. Tech stack per box

| Box | Technology | Version notes |
| --- | --- | --- |
| Mobile app | Expo RN + TypeScript | Expo SDK 54 (dev build, not Expo Go) |
| Wallet connect | `@solana-mobile/wallet-adapter-expo` | MWA protocol → Seed Vault |
| Tx build | `@solana/web3.js` + `@solana/kit` | kit for transfers, web3.js for MWA types |
| Backend runtime | Node 20+, Vercel serverless | — |
| AI loop | Vercel AI SDK (`ai`) | tool-calling + streaming |
| Agent tools | `solana-agent-kit` v2 + token/misc plugins | only 4 tools exposed |
| LLM payment | x402 (USDC-SPL on Solana) | Mode B payer wallet for MVP |
| Data | Solana RPC (devnet) | Helius optional later |

---

## 7. Trust & keys (who holds what)

```
┌───────────────┬────────────────────────┬───────────────────────────────┐
│ Secret        │ Where                 │ Can it sign user txs?        │
├───────────────┼────────────────────────┼───────────────────────────────┤
│ Seed Vault    │ Device hardware       │ YES — the only thing that can │
│ private key   │                       │ (user-approved, fingerprint)  │
│ Agent keypair │ Backend (throwaway)   │ NO — no funds, read-only tools│
│ Payer wallet  │ Backend (Mode B, small│ Signs only x402 USDC payments │
│ (USDC)        │ balance)              │ (bounded by balance)          │
└───────────────┴────────────────────────┴───────────────────────────────┘
```

---

## 8. Future (V2) boxes

```
V2 additions (drawn, not built):
┌──────────────────────────────────────────────────────────────┐
│  Mobile:                                                      │
│  ├── Session manager screen (create/kill autopilot sessions)  │
│  └── Settings (network, x402 mode, Titan dapp selection)      │
│                                                              │
│  Backend:                                                     │
│  ├── Session key service (expiry, spend cap, allowlist)       │
│  ├── Titan swap tool (Titan Prime API; Jupiter fallback)      │
│  ├── Autopilot scheduler (tier-0 reads: morning report)       │
│  └── Mode A x402 (user signs per message via MWA)             │
│                                                              │
│  Data:                                                        │
│  ├── Helius (rich history)                                    │
│  └── Birdeye x402 (prices/metadata, keyless)                  │
└──────────────────────────────────────────────────────────────┘
```
