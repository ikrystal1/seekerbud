# x402 Protocol Feedback — SeekerBud Integration Findings

> Issues & gaps discovered while integrating SeekerBud against Solvela (api.solvela.ai) + the official `x402` npm package v1.2.0.

---

## 1. SDK crashes without `feePayer` in `extra`

**File:** `packages/svm/src/schemes/exact/svm/client.ts` (`createTransferTransactionMessage`)

When `paymentRequirements.extra?.feePayer` is `undefined`, the SDK calls:

```ts
setTransactionMessageFeePayer(undefined, tx)
```

This passes `undefined` into `@solana/kit`'s `setTransactionMessageFeePayer`, which eventually calls `address()` on `undefined`. The error is:

```
Expected base58-encoded address string of length in range [32, 44]. Actual length: 9.
```

**Fix:** Fall back to `client.address` when no fee payer is provided:

```ts
const feePayer = paymentRequirements.extra?.feePayer ?? client.address;
```

---

## 2. Body-based 402 response not supported

Some gateways (Solvela) return payment requirements in the **response body** as plain JSON with `snake_case` keys, not in the standard `payment-required` header as base64.

**Example (Solvela):**
```json
{
  "x402_version": 2,
  "accepts": [{
    "scheme": "exact",
    "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    "amount": "5161",
    "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "pay_to": "9QGtTUpvLmhggDuBciAeE67MmhECVFYdFLD7xKD4RSno",
    "max_timeout_seconds": 300
  }]
}
```

**Suggested:** The SDK / docs should describe both response formats and provide a utility to parse body-based 402 responses (snake_case normalization).

---

## 3. CAIP-2 network vs short name mismatch

Gateways send CAIP-2 network identifiers (`"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"`) but:

- `SupportedSVMNetworks` only contains `["solana", "solana-devnet"]`
- `PaymentPayloadSchema.network` only accepts short names
- Passing a CAIP-2 identifier to `createPaymentHeader` throws `"Unsupported network"`

**Suggested:** Add CAIP-2 parsing helpers so the SDK can accept either format and normalize internally.

---

## 4. No client-signed SVM example in docs

The docs cover server-signed flow well (`createPaymentHeader` + `X402_PAYER_PRIVATE_KEY`). But there's no guide for **client-signed** SVM payments where the device holds the key and only the `payment-signature` header is sent.

**Suggested:** Add a "Client-Signed SVM" quickstart showing how to build a `VersionedTransaction`, sign it, encode it as a `PaymentPayload`, and set the `payment-signature` header.

---

## 5. `createSignerFromBase58` expects 64-byte keypair not 32-byte secret

The `svm.createSignerFromBase58` function decodes base58 and passes bytes to `KeyPairSigner.fromBytes`. It's unclear from docs whether to pass a 32-byte secret key or 64-byte keypair. Trial and error required.

**Suggested:** Document the expected format explicitly.

---

## 6. `PaymentPayloadSchema` rejects CAIP-2 network names (docs vs code mismatch)

The V2 migration guide recommends CAIP-2 network identifiers (`solana:mainnet`), and `decodePayment`/`selectPaymentRequirements` on the **verifier side** uses `PaymentPayloadSchema` (`network: NetworkSchema`), which only accepts short V1 names (`"solana"`, `"solana-devnet"`).

**Reproduction:** A client builds a `PaymentPayload` with `network: "solana:mainnet"` (as the migration guide suggests) → gateway's `decodePayment` throws `"Invalid network"` → gateway returns `402 invalid_payment: "PAYMENT-SIGNATURE header is present but could not be decoded"`.

This is exactly what happened to us: the payload's network field **must be V1** (`"solana"`), even though the gateway sends CAIP-2 in its 402 (`solana:5eykt4Us...` or `solana:mainnet`) and the docs point at CAIP-2.

**Suggested:** Either accept CAIP-2 in `NetworkSchema`/`PaymentPayloadSchema` (normalize to V1 internally), or explicitly document that the **payment-signature payload network must use V1 short names** while 402 requirements may use CAIP-2.

---

## 7. SVM payer token account (ATA) is never created

The SDK builds only a `TransferChecked` from the payer's ATA (`createTransferInstructions`). If the payer has **no USDC ATA yet** (brand-new agent wallet, fresh Seed Vault), simulation fails with `AccountNotFound` (SolanaError `__code: 3230002`) — the gateway then rejects the payment. New users always hit this on their first payment.

**Workaround (we implemented):** check `getAccountInfo(sourceATA)` and prepend a `createAssociatedTokenAccountInstruction` (rent funded by payer) when missing.

**Suggested:** Add an option to `createAndSignPayment` (e.g. `svmConfig.createMissingTokenAccounts: true`) that auto-creates the payer ATA, or at minimum surface a clearer error (`payer_ata_missing`).

---

## 8. Gateway inconsistency: Solvela returns 3 different network formats

Across requests, Solvela's 402 `accepts[].network` varied between:
- `solana` (V1 short name)
- `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` (CAIP-2 genesis hash)
- `solana:mainnet` (CAIP-2 shorthand)

We normalize all three to V1 internally (`lib/x402.ts` `normalizeNetwork`), but a strict SDK/client would break on two of the three formats.

**Suggested:** Gateways should settle on one canonical format (CAIP-2 genesis hash is most spec-correct). SDK docs should state the accepted forms.

---

## Repository

- GitHub: https://github.com/x402-foundation/x402
- License: Apache 2.0

---

*Found during SeekerBud development — Seeker mobile AI agent. August 2026.*
