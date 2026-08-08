# SeekerBud — Prepaid Agent Wallet

> Everything you need to know about the prepaid wallet: what it is, what it does, how it works, where it lives, and how we make money from it.

---

## 1. What it is in one sentence

A **tiny on-device keypair** that holds a small USDC balance specifically to pay for AI message costs — so the user never has to tap "approve" on every chat message.

It is **not** the user's main Seed Vault wallet. It holds no SOL. It cannot sign transfers on the user's behalf. It does one job: pay for AI.

---

## 2. What it does vs. what it doesn't

| ✅ It CAN | ❌ It CANNOT |
|---|---|
| Pay x402 LLM gateway per message | Sign SOL transfers |
| Hold a small USDC float (~$1–5) | Access the user's Seed Vault |
| Top up from the user's main wallet | Swap tokens |
| Be drained / refunded by the user | Exceed its own balance |
| Be deleted from AsyncStorage | Touch any other wallet |

---

## 3. Where it lives — on device, not server

```
┌─────────────────────────────────────────┐
│           User's Android device          │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │  AsyncStorage (encrypted)        │    │
│  │  ┌────────────────────────────┐  │    │
│  │  │  Agent Wallet Keypair      │  │    │
│  │  │  publicKey:  ABC...XYZ     │  │    │
│  │  │  secretKey:  [32 bytes]    │  │    │
│  │  └────────────────────────────┘  │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Seed Vault (hardware)                   │
│  └─ User's main wallet — untouched       │
└─────────────────────────────────────────┘
```

**The private key never leaves the device.** The app generates a fresh `Keypair` using `@solana/web3.js`, stores it in `AsyncStorage`, and uses it to sign x402 payments on-device before sending each chat request to the backend.

---

## 4. How it is created

On the **FundingStep** of onboarding, when the user picks "Prepaid wallet":

```
1. App checks AsyncStorage for an existing agent keypair
2. If none → generate Keypair.generate()
3. Store { publicKey (base58), secretKey (Uint8Array) } in AsyncStorage
4. Show user the agent wallet address + "Top up" button
5. User taps "Top up" → MWA signs a USDC transfer from Seed Vault → agent wallet
6. Agent wallet now has USDC balance on-chain
7. Onboarding complete → Chat unlocks
```

**No server is involved in key generation.** The backend only ever sees the agent wallet's `publicKey` (to verify remaining balance). It never sees the `secretKey`.

---

## 5. How it pays per message

```
┌───────────────────────────────────────────────────────────────────┐
│                         Per message flow                          │
│                                                                   │
│  User types message                                               │
│         │                                                         │
│         ▼                                                         │
│  App signs x402 payment on-device                                 │
│  (secretKey signs a $0.01 USDC payment intent)                    │
│         │                                                         │
│         ▼                                                         │
│  POST /api/chat  {message, address, signedPayment}                │
│         │                                                         │
│         ▼                                                         │
│  Backend relays signedPayment to x402 gateway                     │
│         │                                                         │
│         ▼                                                         │
│  x402 gateway verifies payment on-chain                           │
│  LLM responds → backend streams answer                            │
│         │                                                         │
│         ▼                                                         │
│  USDC leaves agent wallet → x402 gateway treasury                 │
│  (~$0.004 wholesale cost, $0.01 charged = $0.006 our margin)      │
└───────────────────────────────────────────────────────────────────┘
```

---

## 6. The markup — how we make money

Every message goes through a simple pricing layer:

```
User pays:      $0.010 per message  (charged from agent wallet)
Gateway costs:  $0.004 per message  (x402 wholesale LLM cost)
Our margin:     $0.006 per message  ← profit, automatic, on-chain
```

At scale:

| Daily messages | Daily revenue | Monthly revenue |
|---|---|---|
| 500 | $3.00 | $90 |
| 2,000 | $12.00 | $360 |
| 10,000 | $60.00 | $1,800 |
| 50,000 | $300.00 | $9,000 |

**Our treasury wallet** receives the difference automatically via x402 settlement. No invoices, no subscriptions, no payment processor fees.

---

## 7. Top-up flow (UX)

```
FundingStep (onboarding)
│
├── "Prepaid wallet" selected
│     │
│     ├── Agent keypair generated on device
│     ├── Agent wallet address shown
│     └── "Top up $2 USDC" button
│           │
│           └── MWA sign → USDC transfer from Seed Vault → agent wallet
│                 │
│                 └── Balance confirmed on-chain → Chat unlocks
│
└── Low balance nudge (in-app, when balance < $0.20)
      └── "Top up" button in chat header / settings
```

**Suggested top-up amounts:**
- $2 USDC → ~200 messages
- $5 USDC → ~500 messages
- $10 USDC → ~1,000 messages

---

## 8. Balance check & low balance nudge

The app checks the agent wallet's USDC balance on every app open and after each message:

```
balance > $0.20   → green, all good
balance $0.05–0.20 → yellow nudge: "Running low — top up soon"
balance < $0.05   → red: "Top up needed to keep chatting"
balance = 0       → chat input disabled, top up CTA shown
```

---

## 9. Security model

| Concern | Answer |
|---|---|
| What if device is stolen? | Agent wallet holds max ~$5. Loss is bounded. Attacker can only buy AI messages. |
| What if AsyncStorage is read? | SecretKey exposed → attacker drains the USDC float only. No SOL, no main wallet access. |
| What if we get hacked? | Backend never sees secretKey. Nothing to steal server-side. |
| Can the agent wallet sign transfers? | No. x402 payment = a USDC micropayment only. Not a general signing key. |
| Can the user recover funds? | Yes — publicKey is shown in Settings. User can sweep USDC back to Seed Vault at any time. |

**Worst case loss = the USDC top-up amount (~$2–5).** Same risk as a prepaid transit card.

---

## 10. What happens to pay-as-you-go (Mode A)?

Mode A users skip the agent wallet entirely. Instead:

```
Every message → MWA prompt on device
User approves with fingerprint
USDC leaves Seed Vault directly → x402 gateway
```

More friction, more control. We still take the same $0.006 margin because we set the price charged to the gateway regardless of mode.

Mode A is the **V2 default** once we have a polished signing UX. For MVP, Mode B (prepaid) is recommended — zero friction in demos.

---

## 11. Implementation checklist

- [ ] `src/services/agentWallet.ts` — generate, store, load keypair from AsyncStorage
- [ ] `src/services/agentWallet.ts` — fetch USDC balance via RPC
- [ ] `src/services/agentWallet.ts` — sign x402 payment on-device
- [ ] `FundingStep.tsx` — show agent wallet address + Top Up button after generation
- [ ] `FundingStep.tsx` — trigger MWA USDC transfer for top-up
- [ ] `services/chat.ts` — attach signedPayment to every POST /api/chat
- [ ] `AccountScreen.tsx` — show agent wallet balance + top up button
- [ ] `SettingsScreen.tsx` — show agent wallet address (for manual recovery)
- [ ] Backend `api/chat.ts` — accept + relay signedPayment to x402 gateway
- [ ] Low balance nudge in ChatScreen header

---

## 12. Files involved

| File | Role |
|---|---|
| `src/services/agentWallet.ts` | Generate, store, load, sign, check balance |
| `src/components/onboarding/FundingStep.tsx` | Top-up UI during onboarding |
| `src/screens/AccountScreen.tsx` | Show balance, top-up button |
| `src/screens/SettingsScreen.tsx` | Show agent wallet address |
| `src/services/chat.ts` | Attach signed payment to each request |
| `backend/api/chat.ts` | Relay payment to x402 gateway |
| `backend/lib/x402.ts` | x402 payment handling (Mode B server path) |
