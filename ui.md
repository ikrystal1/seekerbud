# SeekerBud — UI Wireframes & Onboarding Flow

> Every screen for the MVP, drawn in ASCII. Dark, mobile-first, Seeker-branded. Phone-frame width ≈ 40 chars.

---

## 0. Screen map

```
┌───────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
│ WELCOME   │ ──▶ │ CONNECT      │ ──▶ │ PROFILE      │ ──▶ │ CAPABILITY INTRO│
└───────────┘     └──────────────┘     └──────────────┘     └─────────────────┘
                                                                     │
┌───────────┐     ┌──────────────┐     ┌──────────────────┐          ▼
│ ERROR /   │ ◀── │ CHAT (main)  │ ◀── │ FUNDING CHOICE   │ ────────┘
│ EMPTY     │     └──────────────┘     └──────────────────┘
└───────────┘              │
                           ├── ▶ ActionCard (in-chat)
                           ├── ▶ Transfer success (in-chat)
                           └── ▶ Wallet auth (system/Seed Vault)

Returning user (wallet remembered) → straight to CHAT
```

---

## 1. Welcome

```
┌──────────────────────────────┐
│                              │
│                              │
│        (SeekerBud logo)    │
│           ═══════════        │
│                              │
│     SeekerBud              │
│     Chat with your wallet.   │
│     Control your Solana      │
│     experience.              │
│                              │
│     Ask. Understand.         │
│     Confirm. Done.           │
│                              │
│                              │
│   ┌──────────────────────┐   │
│   │  Connect Solana      │   │
│   │  Wallet              │   │
│   └──────────────────────┘   │
│                              │
│   < Sign in with Seed Vault  │
│     wallet · biometrics      │
│                              │
└──────────────────────────────┘
```

**Interactions:** one CTA. Tap → MWA `authorize` → Seed Vault opens.

---

## 2. Connect (wallet prompt)

```
┌──────────────────────────────┐
│ SeekerBud          ←       │
│ ─────────────────────────    │
│                              │
│   Connecting your wallet…    │
│                              │
│   ┌──────────────────────┐   │
│   │  Scanning for Seed   │   │
│   │  Vault Wallet…       │   │
│   │     ◌ ◌ ◌            │   │
│   └──────────────────────┘   │
│                              │
│   Waiting for approval on    │
│   your device…               │
│                              │
│   (Seed Vault Wallet opens:  │
│    fingerprint → approve)    │
│                              │
└──────────────────────────────┘

  ┌──────────────┐
  │ Seed Vault   │   ← system wallet sheet
  │ Wallet       │
  │              │
  │ SeekerBud  │
  │ wants to     │
  │ connect      │
  │              │
  │ [Approve]    │
  │ [Cancel]     │
  └──────────────┘
```

**States:** scanning · waiting-for-user · approved → Profile · rejected/cancel → error toast.

---

## 3. Profile setup

```
┌──────────────────────────────┐
│ SeekerBud          ←       │
│ ─────────────────────────    │
│                              │
│   Step 1 of 3   ● ● ○        │
│                              │
│   Welcome aboard! 🎉         │
│                              │
│   Display name               │
│   ┌──────────────────────┐   │
│   │ Bob_Seeker           │   │
│   └──────────────────────┘   │
│                              │
│   Connected as               │
│   ┌──────────────────────┐   │
│   │ 7xK...abc            │   │
│   │ (short address)      │   │
│   └──────────────────────┘   │
│                              │
│   Seeker detected: YES ✅    │
│   Genesis Token:  Verified   │
│                              │
│   ┌──────────────────────┐   │
│   │  Continue            │   │
│   └──────────────────────┘   │
│                              │
└──────────────────────────────┘
```

**Interactions:** name (optional, prefilled), shows connected address + Genesis Token status. Continue → Capability intro.

---

## 4. Capability intro

```
┌──────────────────────────────┐
│ SeekerBud          ←       │
│ ─────────────────────────    │
│                              │
│   Step 2 of 3   ○ ● ○        │
│                              │
│   What I can do:             │
│                              │
│   💰  "How much SOL do I     │
│       have?"                 │
│                              │
│   🪙  "What tokens do I      │
│       own?"                  │
│                              │
│   🕘  "What did I do         │
│       today?"                │
│                              │
│   📤  "Send 0.05 SOL to      │
│       Bob"                   │
│                              │
│   I can prepare actions —    │
│   you always confirm + sign  │
│   with your Seed Vault.      │
│                              │
│   ┌──────────────────────┐   │
│   │  Got it             │   │
│   └──────────────────────┘   │
│                              │
└──────────────────────────────┘
```

---

## 5. Funding choice (x402)

```
┌──────────────────────────────┐
│ SeekerBud          ←       │
│ ─────────────────────────    │
│                              │
│   Step 3 of 3   ○ ○ ●        │
│                              │
│   Paying for your AI         │
│   buddy                      │
│                              │
│   Every chat message costs   │
│   a few cents (USDC) —       │
│   paid via x402. No API      │
│   keys, no subscriptions.    │
│                              │
│   ┌──────────────────────┐   │
│   │ ○ Prepaid agent      │   │
│   │   wallet             │   │
│   │   (recommended)      │   │
│   │   Top up once with   │   │
│   │   your wallet →      │   │
│   │   seamless chat      │   │
│   └──────────────────────┘   │
│   ┌──────────────────────┐   │
│   │ ○ Pay as you go      │   │
│   │   Sign each message  │   │
│   │   with your wallet   │   │
│   └──────────────────────┘   │
│                              │
│   ┌──────────────────────┐   │
│   │  Start chatting      │   │
│   └──────────────────────┘   │
│                              │
└──────────────────────────────┘
```

**If Prepaid:** after Start → single MWA transfer (top-up amount) → Chat. **If Pay-as-you-go:** straight to Chat; each message triggers a payment signature.

---

## 6. Chat (main screen)

```
┌──────────────────────────────┐
│ SeekerBud         ⋮  💰    │   ← header: name, menu, balance chip
│ 7xK...abc (devnet)           │
│ ─────────────────────────    │
│                              │
│  ┌────────────────────────┐  │
│  │ Hey! I'm SeekerBud.  │  │
│  │ Ask me about your      │  │
│  │ wallet on Solana.      │  │
│  │ (0.004 USDC paid)      │  │
│  └────────────────────────┘  │
│                              │
│   ┌───────────────────────┐  │
│   │ How much SOL do I     │  │
│   │ have?                │  │  ← user bubble (right)
│   └───────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ 💰 You have 2.4831 SOL │  │
│  │ ≈ $2.94 on devnet.     │  │
│  │                        │  │  ← assistant bubble (left)
│  │ [Balance] [Tokens]     │  │     quick-action chips
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ …                      │  │  ← typing indicator
│  └────────────────────────┘  │
│                              │
│ ──────────────────────────   │
│ ┌────────────────────────┐   │
│ │ Send 0.05 SOL to Bob   │   │  ← input row
│ └───────────┐  ┌──────┐  │   │
│             │  │  ➤   │  │   │
│             │  └──────┘  │   │
└──────────────────────────────┘
```

**Quick-action chips** (suggested intents): `Balance` `Tokens` `Activity` `Send SOL`.

---

## 7. ActionCard — transfer confirmation (in-chat)

```
│                              │
│   ┌──────────────────────┐   │
│   │ 📤 Send SOL          │   │
│   │ ──────────────────   │   │
│   │                      │   │
│   │   Amount              │   │
│   │   0.05 SOL            │   │
│   │   ≈ $0.06             │   │
│   │                      │   │
│   │   To                  │   │
│   │   7xK...abc           │   │
│   │                      │   │
│   │   Network fee         │   │
│   │   ~0.000005 SOL       │   │
│   │                      │   │
│   │   ┌────────┐ ┌─────┐  │   │
│   │   │ Cancel │ │Confirm│ │   │
│   │   └────────┘ └─────┘  │   │
│   └──────────────────────┘   │
```

**Cancel** → card collapses, agent acknowledges. **Confirm** → MWA signing sheet (Seed Vault double-tap/biometric) → success card below:

```
│   ┌──────────────────────┐   │
│   │ ✅ Transaction sent!  │   │
│   │                      │   │
│   │   0.05 SOL →          │   │
│   │   7xK...abc           │   │
│   │                      │   │
│   │   [View on Explorer]  │   │
│   └──────────────────────┘   │
```

**Signing states:** `Waiting for your fingerprint…` (with spinner) · `Rejected` (error card + "try again").

---

## 8. Activity summary (in-chat)

```
│  ┌────────────────────────┐  │
│  │ 🕘 Your last 24h       │  │
│  │ ──────────────────     │  │
│  │                        │  │
│  │  +0.50 SOL  received   │  │
│  │  from 3Jk...xyz        │  │
│  │  14:32                 │  │
│  │                        │  │
│  │  −0.05 SOL  sent       │  │
│  │  to 7xK...abc          │  │
│  │  09:15                 │  │
│  │                        │  │
│  │  Swap: 12 USDC → SOL   │  │
│  │  08:02 (Titan)         │  │
│  └────────────────────────┘  │
```

---

## 9. Tokens list (in-chat)

```
│  ┌────────────────────────┐  │
│  │ 🪙 Your tokens         │  │
│  │ ──────────────────     │  │
│  │  SOL        2.4831     │  │
│  │  USDC       12.00      │  │
│  │  JUP        1,204      │  │
│  │  BONK     8.4M         │  │
│  └────────────────────────┘  │
```

---

## 10. Error / empty states

### No wallet connected
```
┌──────────────────────────────┐
│ SeekerBud                  │
│ ─────────────────────────    │
│                              │
│        ⚠️                     │
│                              │
│   No wallet found.           │
│                              │
│   Open your Seed Vault       │
│   Wallet, or install one     │
│   from the dApp Store.       │
│                              │
│   ┌──────────────────────┐   │
│   │  Try again           │   │
│   └──────────────────────┘   │
└──────────────────────────────┘
```

### Insufficient SOL (after Confirm)
```
│  ┌──────────────────────┐   │
│  │ ❌ Not enough SOL     │   │
│  │                      │   │
│  │  You have 0.001 SOL  │   │
│  │  Requested: 0.05 SOL │   │
│  │                      │   │
│  │  [Get devnet SOL]    │   │
│  └──────────────────────┘   │
```

### AI misunderstanding
```
│  ┌────────────────────────┐  │
│  │ 🤔 Not sure what you   │  │
│  │  meant. Try:           │  │
│  │  • "my balance"        │  │
│  │  • "send 0.1 SOL to…"  │  │
│  └────────────────────────┘  │
```

---

## 11. Recurring layout rules

| Rule | Value |
| --- | --- |
| Frame | Dark theme, phone width (~40 chars in these wireframes) |
| Assistant bubbles | Left, rounded card, secondary color |
| User bubbles | Right, accent color |
| Action cards | Full-width, bordered, always contain explicit Cancel/Confirm |
| Cost line | Every assistant message footer: `(0.004 USDC · x402)` |
| Header | App name + truncated address + network chip (devnet/mainnet) |
| Loading | Typing dots for AI; spinner + "Waiting for your fingerprint…" while signing |
