import { createPaymentHeader, selectPaymentRequirements } from "x402/client";
import { svm } from "x402/shared";
import { VersionedTransaction } from "@solana/web3.js";
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

type PaymentOption = {
  scheme: string;
  network: string;
  token?: string;
  asset?: string;
  maxAmountRequired?: string;
  amount?: string;
  payTo?: string;
  description?: string;
  maxTimeoutSeconds?: number;
  extra?: { feePayer?: string };
};

type PaymentRequired = {
  x402Version: number;
  accepts: PaymentOption[];
};

export type PaymentRequirementInfo = {
  x402Version: number;
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  feePayer?: string;
  priceUsd: number;
  raw?: PaymentOption;
};

async function decodePaymentRequired(res: Response): Promise<PaymentRequired> {
  const header =
    res.headers.get("payment-required") ?? res.headers.get("x-payment-required");
  if (header) {
    try {
      const raw = Buffer.from(header, "base64").toString("utf8");
      return JSON.parse(raw) as PaymentRequired;
    } catch {
      // fall through to body
    }
  }

  // Solvela returns payment info in the response body (snake_case JSON)
  try {
    const body = await res.text();
    if (body) {
      const json = JSON.parse(body) as Record<string, unknown>;
      if (json.accepts && Array.isArray(json.accepts)) {
        const x402Version =
          typeof json.x402_version === "number"
            ? json.x402_version
            : typeof json.x402Version === "number"
              ? json.x402Version
              : 2;
        const accepts = (json.accepts as Array<Record<string, unknown>>).map(
          (a) => ({
            scheme: (a.scheme as string) ?? "exact",
            network: (a.network as string) ?? "solana",
            maxAmountRequired: (a.maxAmountRequired ?? a.amount ?? "0") as string,
            amount: (a.amount ?? a.maxAmountRequired ?? "0") as string,
            payTo: (a.pay_to ?? a.payTo ?? "") as string,
            asset: (a.asset ?? a.token ?? "") as string,
            maxTimeoutSeconds: (a.max_timeout_seconds ?? a.maxTimeoutSeconds ?? 60) as number,
            extra: (a.extra ?? {}) as Record<string, unknown>,
          })
        );
        return { x402Version, accepts } as PaymentRequired;
      }
    }
  } catch {
    // fall through
  }

  throw new PaymentRequiredError(
    "Gateway returned 402 without a payment-required header or body"
  );
}

function usdOf(requirement: PaymentOption): number {
  const raw = requirement.maxAmountRequired ?? requirement.amount ?? "0";
  const units = Number(raw);
  if (!Number.isFinite(units) || units <= 0) return 0;
  return units / 1_000_000;
}

// Map CAIP-2 genesis hashes to V1 network names (for SDK compatibility)
const SVM_GENESIS_TO_NETWORK: Record<string, string> = {
  "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": "solana",
  "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY": "solana-devnet",
};

// Some gateways send the short CAIP-2 name instead of the genesis hash
const SVM_CAIP2_SHORTHAND: Record<string, string> = {
  "solana:mainnet": "solana",
  "solana:devnet": "solana-devnet",
  "solana:testnet": "solana-testnet",
};

function normalizeNetwork(network: string): string {
  if (network.startsWith("solana:")) {
    const mapped = SVM_GENESIS_TO_NETWORK[network.slice("solana:".length)];
    if (mapped) return mapped;
  }
  return SVM_CAIP2_SHORTHAND[network] ?? network;
}

function selectRequirement(pr: PaymentRequired): PaymentOption {
  if (!pr.accepts?.length) {
    throw new PaymentRequiredError("Gateway sent no payment options");
  }
  for (const option of pr.accepts) {
    if (option.network) option.network = normalizeNetwork(option.network);
  }
  return selectPaymentRequirements(
    pr.accepts as unknown as Parameters<typeof selectPaymentRequirements>[0],
    undefined,
    "exact"
  ) as unknown as PaymentOption;
}

function requirementInfo(pr: PaymentRequired): PaymentRequirementInfo {
  const requirement = selectRequirement(pr);
  const priceUsd = usdOf(requirement);
  return {
    x402Version: pr.x402Version,
    scheme: requirement.scheme,
    // Must stay V1 ("solana"/"solana-devnet"): the x402 PaymentPayloadSchema
    // only accepts V1 names, and the client echoes this into the
    // payment-signature payload. CAIP-2 ("solana:mainnet") is rejected by
    // gateway decoders.
    network: requirement.network,
    asset: requirement.asset ?? requirement.token ?? "",
    amount: requirement.maxAmountRequired ?? requirement.amount ?? "0",
    payTo: requirement.payTo ?? "",
    maxTimeoutSeconds:
      typeof requirement.maxTimeoutSeconds === "number"
        ? requirement.maxTimeoutSeconds
        : 60,
    feePayer: requirement.extra?.feePayer,
    priceUsd,
    raw: requirement,
  };
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

export type GatewayFetchResult =
  | { kind: "response"; response: Response }
  | { kind: "payment_required"; requirement: PaymentRequirementInfo };

export async function x402GetPaymentRequest(
  url: string,
  init: RequestInit
): Promise<GatewayFetchResult> {
  if (!config.x402GatewayUrl) {
    throw new PayerWalletError("x402 gateway not configured");
  }

  const timed = (extra: RequestInit = {}): RequestInit => ({
    ...init,
    ...extra,
    signal: init.signal ?? AbortSignal.timeout(config.x402TimeoutMs),
  });

  const res = await fetchWithRetry(url, timed(), 3);
  if (res.status !== 402) {
    return { kind: "response", response: res };
  }

  const pr = await decodePaymentRequired(res);
  const requirement = requirementInfo(pr);
  log(
    "info",
    `x402: price=${requirement.priceUsd.toFixed(4)} USD network=${requirement.network}`
  );

  if (requirement.priceUsd > config.x402MaxCostPerTurn) {
    throw new OverBudgetError(
      `Payment ${requirement.priceUsd.toFixed(4)} USD exceeds per-turn cap ${config.x402MaxCostPerTurn} USD`
    );
  }

  return { kind: "payment_required", requirement };
}

export async function x402FetchWithPayment(
  url: string,
  init: RequestInit,
  paymentSignature: string
): Promise<Response> {
  const timed = (extra: RequestInit = {}): RequestInit => ({
    ...init,
    ...extra,
    signal: init.signal ?? AbortSignal.timeout(config.x402TimeoutMs),
  });

  const sigPreview =
    paymentSignature.length > 60
      ? paymentSignature.slice(0, 30) + "..." + paymentSignature.slice(-30)
      : paymentSignature;
  log("info", `x402: sending payment-signature (len=${paymentSignature.length}) preview=${sigPreview}`);

  try {
    const decoded = Buffer.from(paymentSignature, "base64").toString("utf8");
    const reparsed = JSON.parse(decoded);
    let feePayer = "?";
    try {
      const tx = VersionedTransaction.deserialize(
        Buffer.from(reparsed.payload?.transaction ?? "", "base64")
      );
      feePayer = tx.message.staticAccountKeys[0].toBase58();
    } catch {}
    log(
      "info",
      `x402: payment payload: scheme=${reparsed.scheme} network=${reparsed.network} v=${reparsed.x402Version} txLen=${reparsed.payload?.transaction?.length ?? 0} feePayer=${feePayer}`
    );
  } catch {
    log("error", "x402: payment-signature is NOT valid base64 JSON!");
  }

  const res = await fetchWithRetry(
    url,
    timed({
      headers: {
        ...(init.headers as Record<string, string>),
        "payment-signature": paymentSignature,
      },
    }),
    2
  );

  if (res.status === 402) {
    let body = "";
    try { body = await res.text(); } catch {}
    log("error", `x402: gateway rejected payment — status=402 body="${body.slice(0, 500)}"`);
    throw new PaymentRequiredError(
      `Payment was not accepted — ${body ? body.slice(0, 200) : "the paying wallet may need more USDC"}`
    );
  }
  return res;
}

export async function x402Fetch(
  url: string,
  init: RequestInit,
  opts: { address?: string } = {}
): Promise<Response> {
  const result = await x402GetPaymentRequest(url, init);
  if (result.kind === "response") {
    return result.response;
  }

  const { requirement } = result;
  if (!(await budget.canAfford(requirement.priceUsd, opts.address))) {
    throw new OverBudgetError("Daily x402 budget exceeded");
  }
  if (!config.x402PayerPrivateKey) {
    throw new PayerWalletError("X402_PAYER_PRIVATE_KEY not set");
  }

  const signer = await svm.createSignerFromBase58(config.x402PayerPrivateKey);
  const raw = requirement.raw ?? requirement;
  const paymentHeader = await createPaymentHeader(
    signer,
    requirement.x402Version,
    raw as unknown as Parameters<typeof createPaymentHeader>[2],
    { svmConfig: { rpcUrl: config.solanaRpcUrl } }
  );

  await budget.spend(requirement.priceUsd, opts.address);
  lastPaymentUsd = requirement.priceUsd;

  return x402FetchWithPayment(url, init, paymentHeader);
}
