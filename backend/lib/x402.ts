import { createPaymentHeader, selectPaymentRequirements } from "x402/client";
import { svm } from "x402/shared";
import { config, log } from "./config";
import { budget } from "./budget";

export class PaymentRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentRequiredError";
  }
}

export class OverBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OverBudgetError";
  }
}

export class PayerWalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayerWalletError";
  }
}

type PaymentRequired = {
  x402Version: number;
  accepts: Array<{
    scheme: string;
    network: string;
    token?: string;
    asset?: string;
    maxAmountRequired?: string;
    amount?: string;
    payTo?: string;
    description?: string;
  }>;
};

function decodePaymentRequired(res: Response): PaymentRequired {
  const header =
    res.headers.get("payment-required") ?? res.headers.get("x-payment-required");
  if (!header) {
    throw new PaymentRequiredError(
      "Gateway returned 402 without a payment-required header"
    );
  }
  try {
    const raw = Buffer.from(header, "base64").toString("utf8");
    return JSON.parse(raw) as PaymentRequired;
  } catch {
    throw new PaymentRequiredError("Gateway returned a malformed payment requirement");
  }
}

function usdOf(requirement: PaymentRequired["accepts"][number]): number {
  const raw = requirement.maxAmountRequired ?? requirement.amount ?? "0";
  const units = Number(raw);
  if (!Number.isFinite(units) || units <= 0) return 0;
  // USDC has 6 decimals on both EVM and Solana.
  return units / 1_000_000;
}

/** Cost of the most recent x402 payment (USD) — set after each paid call. */
let lastPaymentUsd = 0;
export const lastPaymentCostUsd = () => lastPaymentUsd;

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts: number
): Promise<Response> {
  let lastErr: Error | undefined;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 200 * 2 ** attempt));
    }
    try {
      const res = await fetch(url, init);
      if (res.status < 500 && res.status !== 429) return res;
      lastErr = new Error(`Gateway returned ${res.status}`);
      log("warn", `x402: attempt ${attempt + 1} → HTTP ${res.status}`);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      log("warn", `x402: attempt ${attempt + 1} → network error: ${lastErr.message}`);
    }
  }
  throw lastErr ?? new Error("Gateway unreachable");
}

/**
 * x402-aware fetch (Mode B — server payer wallet signs).
 * First attempt gets a 402; we cost-cap it, check both budgets (global +
 * per-address), sign the USDC payment with the payer wallet, and retry
 * with the payment-signature header.
 */
export async function x402Fetch(
  url: string,
  init: RequestInit,
  opts: { address?: string } = {}
): Promise<Response> {
  if (!config.x402GatewayUrl) {
    throw new PayerWalletError("x402 gateway not configured");
  }

  const timeoutMs = config.x402TimeoutMs;
  const timed = (extra: RequestInit = {}): RequestInit => ({
    ...init,
    ...extra,
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
  });

  let res = await fetchWithRetry(url, timed(), 3);

  if (res.status !== 402) {
    return res;
  }

  const pr = decodePaymentRequired(res);
  if (!pr.accepts?.length) {
    throw new PaymentRequiredError("Gateway sent no payment options");
  }

  const requirement = selectPaymentRequirements(
    pr.accepts as unknown as Parameters<typeof selectPaymentRequirements>[0],
    undefined,
    "exact"
  );
  const priceUsd = usdOf(requirement);
  log(
    "info",
    `x402: price=${priceUsd.toFixed(4)} USD network=${requirement.network}`
  );

  if (priceUsd > config.x402MaxCostPerTurn) {
    throw new OverBudgetError(
      `Payment ${priceUsd.toFixed(4)} USD exceeds per-turn cap ${config.x402MaxCostPerTurn} USD`
    );
  }
  if (!(await budget.canAfford(priceUsd, opts.address))) {
    throw new OverBudgetError("Daily x402 budget exceeded");
  }
  if (!config.x402PayerPrivateKey) {
    throw new PayerWalletError("X402_PAYER_PRIVATE_KEY not set");
  }

  const signer = await svm.createSignerFromBase58(config.x402PayerPrivateKey);
  const paymentHeader = await createPaymentHeader(
    signer,
    pr.x402Version,
    requirement as Parameters<typeof createPaymentHeader>[2],
    { svmConfig: { rpcUrl: config.solanaRpcUrl } }
  );

  await budget.spend(priceUsd, opts.address);
  lastPaymentUsd = priceUsd;

  res = await fetchWithRetry(
    url,
    timed({
      headers: {
        ...(init.headers as Record<string, string>),
        "payment-signature": paymentHeader,
      },
    }),
    2
  );

  if (res.status === 402) {
    throw new PaymentRequiredError(
      "Payment was not accepted — check payer wallet balance"
    );
  }
  return res;
}
