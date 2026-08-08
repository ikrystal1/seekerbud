# Backend — API Contracts

> The only endpoint in V1: `POST /api/chat`. Streaming response, SSE-style.

---

## POST /api/chat

Streams the assistant's reply (text + tool events) back to the mobile app.

### Request

```jsonc
{
  "address": "7xK...abc",          // connected wallet's PUBLIC address
  "message": "How much SOL do I have?",
  "sessionId": "abc-123"           // optional chat continuity (V2: rules)
}
```

- `address` — required, validated as a Solana public key (base58, 32 bytes). Invalid → 400.
- `message` — required, non-empty.
- No auth token in V1 — the public address is the identity (trust model in `../README.md` §5.1).

### Response — streaming (text/plain, SSE chunks)

```text
event: text
data: {"content":"💰 You have 2.4831 SOL"}

event: tool
data: {"tool":"get_sol_balance","status":"ok","cost_usd":0.004}

event: action
data: {"type":"transfer_proposal","id":"t_1",
       "amount":"0.05","unit":"SOL",
       "to":"7xK...abc","fee_estimate":"0.000005"}

event: done
data: {"total_cost_usd":0.008}
```

| Event | When | Mobile does |
| --- | --- | --- |
| `text` | streamed tokens / final answer | append to assistant bubble |
| `tool` | a tool ran | show subtle status (optional) |
| `action` | `prepare_transfer` produced a proposal | render **ActionCard** (Cancel/Confirm) |
| `done` | turn finished | show cost line `(0.00X USDC · x402)` |
| `error` | failure | render error bubble, allow retry |

### Errors (non-streaming)

| Status | Body | Mobile shows |
| --- | --- | --- |
| 400 | `{"error":"invalid_address"}` | inline warning under input |
| 400 | `{"error":"empty_message"}` | inline warning |
| 402 | `{"error":"payment_required"}` | "Top up agent wallet" card |
| 429 | `{"error":"rate_limited"}` | "Slow down a sec" toast |
| 500 | `{"error":"internal"}` | retry bubble |

### Mobile consumption

`services/chat.ts` wraps the stream:

```
fetch(url, {method:'POST', body})
  → read body as stream
  → parse `event:`/`data:` lines
  → dispatch to Chat.tsx (append text / render card / show cost)
```

---

## V2 endpoints (designed, not built)

| Endpoint | Purpose |
| --- | --- |
| `POST /api/sessions` | Create session key (user signs auth on-device) |
| `GET /api/sessions` | List active sessions |
| `DELETE /api/sessions/:id` | Revoke (kill switch) |
| `POST /api/rules` | Create a rule (trigger + action + guards) |
| `GET /api/rules` | List rules + last run status |
| `POST /api/rules/:id/run` | Manual dry-run / execute |
| `POST /api/schedule` | Cron registration (Phase A reads) |

See `../autotransact.md` for behavior; contracts frozen at each phase's start.
