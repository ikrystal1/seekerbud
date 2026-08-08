# SeekerBud — Todo List

From zero to working product. Tick items off as you go. Mirror of README.md's build plan, broken into actionable steps.

---

## 0. Decisions to make (do these first)

- [x] Confirm x402 day-1 stack: documented in `x402.md` + `prepaid-wallet.md` — Mode B (server payer wallet) for MVP
- [x] Confirm dev machine has: Android Studio, JDK 17 (installed via winget), Node 20+, npm
- [x] Decide app name / package id — **SeekerBud** / `com.seekerbud.app`

---

## 1. Dev environment setup

- [x] Install Node 20+ (`node --version` ≥ 20)
- [x] Install Android Studio (already present on machine)
- [x] Set Gradle/JDK to JDK 17 — installed Microsoft OpenJDK 17.0.20 via `winget`
- [x] Create an Android Virtual Device (AVD) — `Seeker_4GB` AVD created and working
- [ ] Set a PIN on the emulator (required for Mock MWA Wallet)
- [ ] Clone & run [Mock MWA Wallet](https://github.com/solana-mobile/mock-mwa-wallet) on the emulator; tap **Authenticate**
- [ ] Get a devnet SOL faucet drop into the Mock Wallet (or `spl airdrop` via CLI)

---

## 2. M0 — Scaffold

- [x] Solana RN/Expo template bootstrapped → `Seeker/mobile/`
- [x] Expo deps installed: `expo`, `react-native`, MWA protocol packages
- [x] Solana deps installed: `@solana/web3.js`, `@solana/spl-token`
- [x] `eas.json` configured with dev-client profile
- [x] Expo development build compiled + streamed to `Seeker_4GB` emulator via `adb install`
- [x] Web build working via `expo start --web` (react-dom + react-native-web installed)
- [x] Wallet connect simulated on web (on-device keypair in AsyncStorage)
- [x] Handle "no wallet" state gracefully — onboarding gates the chat screen
- [ ] MWA `authorize` tested on real emulator with Mock MWA Wallet (needs PIN + mock wallet install)
- [x] Show connected wallet's real SOL balance (wired to RPC — was blocked on backend `.env`; backend now live on Railway, balance tool verified end-to-end)

✅ **M0 largely done — real MWA test pending Mock Wallet install on emulator**

---

## 3. M1 — Chat UI shell

- [x] `ChatScreen.tsx` — message list + growing input + SSE streaming ready
- [x] `Message.tsx` — user/assistant bubbles, error bubble
- [x] `MessageBubble.tsx` — avatar, off-white user bubbles, dark assistant bubbles
- [x] `ChatInput.tsx` — auto-growing textarea (iMessage style), send button activates on type
- [x] `TypingIndicator.tsx` — animated 3-dot bounce
- [x] `SuggestionChips.tsx` — quick-start prompts
- [x] `ActionCard.tsx` — transfer proposal with Cancel / Confirm
- [x] `ChatHeader.tsx` — mascot + name left, refresh + wallet + settings icons right
- [x] Dark mobile-first theme: `#0B0B12` background, Solana accent palette
- [x] SeekerBud mascot icon generated + used throughout
- [x] App name: **SeekerBud** (app.json, package.json, strings.xml, com.seekerbud.app)
- [x] App icons generated from SeekerBuddy.png via `npm run icons` (Sharp script)

✅ **M1 done — clean chat UI, dark theme, branding solid**

---

## 3.5 M1.5 — Onboarding flow

- [x] `WelcomeStep` — full-screen mascot hero, Solana Mobile button, off-white design
- [x] `ProfileStep` — name input, wallet connected row, Continue CTA
- [x] `CapabilitiesStep` — 4 capability rows with icons, dark surface rows
- [x] `FundingStep` — selectable prepaid/pay-as-you-go cards
- [x] `StepIndicator` — thin off-white progress bars
- [x] Gate: chat only unlocks after onboarding + wallet connected
- [x] Re-entry: returning users (wallet + onboarding done) go straight to chat
- [x] Disconnect → resets onboarding state → back to welcome screen (no blank screen)
- [x] `OnboardingScreen` — full-screen steps, no nav chrome, no scrollview on welcome

✅ **M1.5 done — full onboarding flow working**

---

## 3.6 Navigation + Screens (added, not in original plan)

- [x] `MainScreen.tsx` — no bottom tab bar; wallet + settings as header icons
- [x] `AccountScreen.tsx` — sticky header, address card, copy button, balance rows, token/activity placeholders
- [x] `SettingsScreen.tsx` — profile card with mascot, wallet rows, disconnect
- [x] Back navigation from wallet/settings → chat (no React Navigation needed)
- [x] `SafeAreaProvider` added to `App.tsx` root

---

## 4. Backend — Node API

- [x] `backend/` Node server (Vercel serverless-compatible)
- [x] `api/chat.ts` — POST endpoint with SSE streaming, rate limiting, auth header support
- [x] `lib/tools.ts` — 4 tools: `get_sol_balance`, `get_token_balances`, `get_transaction_history`, `prepare_transfer`
- [x] `lib/solana.ts` — all RPC functions (balance, tokens, history, fee estimate)
- [x] `lib/prompts.ts` — SeekerBud system prompt + user message template
- [x] `lib/llm.ts` — LLM turn loop with tool calling
- [x] `lib/x402.ts` — x402 payment handling (Mode B payer wallet)
- [x] `lib/mockGateway.ts` — built-in mock x402 gateway for testing without real gateway
- [x] `lib/store.ts` — KV store (in-memory dev / Vercel KV prod)
- [x] `lib/rate-limit.ts` — per-IP rate limiting
- [x] `lib/budget.ts` — per-turn + per-day cost cap
- [x] `server.ts` — local dev server with mock gateway route
- [x] `prepaid-wallet.md` — full spec doc for agent wallet architecture
- [x] **`backend/.env` created** — 12 vars incl. Solvela gateway, APP_KEY (matches mobile), mainnet Helius RPC
- [x] Backend started — deployed to **Railway** (`seekerbud-production.up.railway.app`, `/health` → 200)
- [x] Payer wallet keypair generated (`npm run gen:key`) — unfunded; only needed for legacy server-signed fallback
- [ ] Verify balance + token questions answer correctly end-to-end — backend side verified (payment_request flows on mainnet); still needs emulator test

### 4.1 x402 wiring

- [x] Verify a Solana-native x402 LLM gateway — **Solvela verified live on mainnet** (402 + payment terms; CAIP-2 network id normalized to `solana`)
- [x] Fund server-side payer wallet (Mode B) with test USDC — **N/A**: MVP is client-signed; payer wallet is legacy fallback only
- [x] Wire `mobile/src/services/chat.ts` SSE stream parser — `readSseStream` implemented, tested against live backend
- [x] Flip `MOCK_MODE = false` in `mobile/src/services/chat.ts` + set `BACKEND_URL` — mock mode removed entirely; `BACKEND_URL` from `.env` (`EXPO_PUBLIC_BACKEND_URL`)
- [x] Show per-message cost line in chat UI — `MessageBubble` renders `{costUsd} USDC · x402`; pending live device test
- [ ] Test Mode A (user signs payment via MWA) at least once on emulator

✅ **M2 done when:** "What's my balance?" and "What tokens do I own?" work from the emulator — paid via x402

## 4.2 Deployed (live)

- [x] Backend on Railway: `https://seekerbud-production.up.railway.app` (health `/health`, chat `/api/chat`, account `/api/account` — mainnet x402 via Solvela)
- [x] Landing page on Vercel: `https://seekerbud.vercel.app` (responsive pass: nav/hero side padding at all breakpoints)
- [x] Mobile reads config from `mobile/.env` (`EXPO_PUBLIC_*`), no hardcoded URLs
- [x] AccountScreen hooked to `/api/account` — real SOL balance, tokens, activity, mainnet badge, pull-to-refresh

---

## 5. M3 — Activity

- [x] `get_transaction_history` tool built and wired in backend
- [ ] Test end-to-end: "What did I do today?" → LLM summarizes (blocked on backend wiring)
- [ ] Handle empty history + error states in UI

✅ **M3 done when:** "What did I do today?" → list/summary

---

## 6. M4 — Transfer (the critical path)

- [x] `prepare_transfer` tool in backend — returns proposal, never signs
- [x] `ActionCard.tsx` — Cancel / Confirm UI built, matches reference design
- [ ] Confirm → build tx on-device with `@solana/web3.js`
- [ ] Send via MWA `signAndSendTransactions` → Seed Vault signs
- [ ] Success message with Solana Explorer signature link
- [ ] Error paths: invalid address, insufficient SOL, user rejected, network failure

✅ **M4 done when:** send devnet SOL end-to-end from the emulator

---

## 7. M5 — Seeker polish

- [x] Dark mobile-first theme throughout (onboarding, chat, wallet, settings)
- [x] SeekerBud mascot, off-white accents, pill buttons, info rows — all consistent
- [x] Typing indicator animated (3 bouncing dots)
- [x] ActionCard redesigned to match reference UI
- [x] Loading states: typing indicator, disabled input while sending
- [ ] Genesis Token detection for Seeker-only messaging (optional)
- [ ] Show `.skr` / Seeker ID if available (optional)

✅ **M5 largely done — UI feels like a Seeker app**

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
- [ ] Prepaid agent wallet on-device (keypair in AsyncStorage, top-up from Seed Vault) — see `prepaid-wallet.md`
- [ ] Agent wallet balance shown in AccountScreen
- [ ] Low balance nudge in chat header
