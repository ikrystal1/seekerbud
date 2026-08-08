# SeekerBud — Todo List

From zero to working product. Tick items off as you go. Mirror of README.md's build plan, broken into actionable steps.

---

## 0. Decisions to make (do these first)

- [ ] Confirm x402 day-1 stack: Solana-native x402 LLM gateway chosen + funded Mode-B payer wallet (see x402.md)
- [ ] Confirm dev machine has: Android Studio, JDK 17, Node 20+, npm
- [ ] Decide app name / package id (`com.seekerbud.app` or similar)

---

## 1. Dev environment setup

- [ ] Install Node 20+ (`node --version` ≥ 20)
- [ ] Install Android Studio (Narwhal 4 / 2025.1.x)
- [ ] Set Gradle/JDK to JDK 17 (`JAVA_HOME` too)
- [ ] Create an Android Virtual Device (AVD, Android 14+/API 34+)
- [ ] Set a PIN on the emulator (required for Mock MWA Wallet)
- [ ] Clone & run [Mock MWA Wallet](https://github.com/solana-mobile/mock-mwa-wallet) on the emulator; tap **Authenticate**
- [ ] Get a devnet SOL faucet drop into the Mock Wallet (or `spl airdrop` via CLI)

---

## 2. M0 — Scaffold

- [ ] `npm create solana-dapp@latest` (RN/Expo template) → `seeker-bud/`
- [ ] Install Expo deps: `expo`, `react-native`, `@solana-mobile/wallet-adapter-expo`
- [ ] Install Solana deps: `@solana/web3.js`, `@solana/kit`
- [ ] Set up `eas.json` with a dev-client profile
- [ ] Run an Expo development build on the emulator (not Expo Go — MWA needs dev build)
- [ ] MWA `authorize` works → WalletButton shows connected address
- [ ] Show connected wallet's SOL balance
- [ ] Handle "no wallet" state gracefully (prompt screen, no crash)

✅ **M0 done when:** Connect → balance of connected wallet on emulator

---

## 3. M1 — Chat UI shellso 

- [ ] `Chat.tsx` — message list + input, streaming-ready
- [ ] `Message.tsx` — user / assistant bubbles, typing indicator
- [ ] `WalletButton.tsx` — connect/disconnect via MWA
- [ ] Header + SeekerBud branding, dark mobile-first theme
- [ ] Layout looks right at phone width on the emulator

✅ **M1 done when:** clean chat UI, sends messages (even mocked), at phone size

---

## 3.5 M1.5 — Onboarding flow

- [ ] `OnboardingScreen` — welcome + branding + one CTA
- [ ] Connect wallet step via MWA (reuses WalletButton flow)
- [ ] Profile setup step (display name; read `.skr`/Genesis Token if present)
- [ ] Capability intro step (balance · tokens · activity · transfers)
- [ ] Funding choice step: prepaid top-up **or** pay-as-you-go (Mode B/A)
- [ ] Gate: chat screen only unlocks after onboarding completes
- [ ] Re-entry: already-connected users skip onboarding

✅ **M1.5 done when:** fresh user lands on Welcome → Connect → setup → Chat; returning user goes straight to Chat

---

## 4. Backend — Node API

- [ ] Create `api/` folder as a minimal Node server (Vercel serverless-compatible)
- [ ] Install: `solana-agent-kit`, `@solana-agent-kit/plugin-token`, `@solana-agent-kit/plugin-misc`, `ai` (Vercel AI SDK), `dotenv`
- [ ] `.env` with `X402_MODE`, `SOLANA_RPC_URL` (see x402.md) — **no user private keys, ever**
- [ ] `lib/agent.ts` — init `SolanaAgentKit` with a generated throwaway keypair (no funds)
- [ ] `lib/tools.ts` — expose only: `get_sol_balance`, `get_token_balances`, `get_transaction_history`, `prepare_transfer`
- [ ] `lib/prompts.ts` — SeekerBud system prompt (persona + only-4-tools rule)
- [ ] `api/chat.ts` — POST endpoint: stream LLM tool-calling loop to the app
- [ ] Verify balance + token questions answer correctly from the app

### 4.1 x402 wiring — day 1 (see x402.md for full spec)

- [ ] Verify a Solana-native x402 LLM gateway works on testnet (e.g. Solvela or equivalent)
- [ ] Fund the server-side payer wallet (Mode B) with test USDC
- [ ] Wire chat route: LLM call → 402 → sign payment (payer wallet) → retry → stream
- [ ] Show per-message cost line in the UI (transparency)
- [ ] Test Mode A (user signs payment via MWA) at least once on emulator

✅ **M2 done when:** "What's my balance?" and "What tokens do I own?" work from the emulator — paid via x402

---

## 5. M3 — Activity

- [ ] `get_transaction_history` tool wired (recent N transactions for connected address)
- [ ] LLM summarizes: "What did I do today?"
- [ ] Handle empty history + error states

✅ **M3 done when:** "What did I do today?" → list/summary

---

## 6. M4 — Transfer (the critical path)

- [ ] `prepare_transfer` tool returns `{ amount, to, fee_estimate, id }` — **never signs**
- [ ] `ActionCard.tsx` renders proposal with **Cancel | Confirm**
- [ ] Confirm → build tx on-device with `@solana/kit`
- [ ] Send via MWA `signAndSendTransactions` → Seed Vault/Mock Wallet signs
- [ ] Success message with signature link (explorer)
- [ ] Error paths: invalid address, insufficient SOL, user rejected, network failure

✅ **M4 done when:** send devnet SOL end-to-end from the emulator

---

## 7. M5 — Seeker polish

- [ ] Seeker-style branding (mobile-first, dark)
- [ ] Loading states everywhere (typing, signing, error)
- [ ] Optional: Genesis Token detection for Seeker-only messaging
- [ ] Optional: show `.skr` / Seeker ID if available

✅ **M5 done when:** feels like a Seeker app, not a website

---

## 8. M6 — Testing + demo

- [ ] Test: no wallet connected
- [ ] Test: wrong/invalid address
- [ ] Test: insufficient SOL
- [ ] Test: user rejects transaction in wallet
- [ ] Test: successful transaction
- [ ] Test: LLM picks the wrong tool (misunderstanding)
- [ ] Test: network errors / timeouts
- [ ] Test: loading states during streaming + signing
- [ ] Write the 60-second demo script (README §8)
- [ ] Dry-run the demo twice, fix what breaks

✅ **M6 done when:** demo script runs live without hiccups

---

## 9. Ship

- [ ] EAS build: APK profile (`eas build -p android --profile dapp-store`)
- [ ] Sign APK with a dApp Store keystore
- [ ] Publish via `@solana-mobile/dapp-store-cli` or Publisher Portal
- [ ] (Optional) Test on real Seeker hardware + Seed Vault Wallet

---

## 10. V2 backlog (designed, not built)

- [ ] Tier 0 autonomy: scheduled read reports (balance summary, alerts) — no signing needed
- [ ] Titan Prime API access → swap tool targeting Titan (fallback: Jupiter API)
- [ ] Session keys (token-auth): user signs one authorization with expiry + spend cap + dapp allowlist
- [ ] Tier 1 autonomy: swaps on Titan within session limits, kill switch from wallet
- [ ] Helius integration for rich history if needed
