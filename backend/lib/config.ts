import "dotenv/config";

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Live getters over process.env — lets tests reconfigure per-case and keeps
 * Vercel env behavior identical to local.
 */
export const config = {
  get solanaRpcUrl() {
    // Prefer Helius if configured (dedicated RPC, higher rate limits)
    const heliusKey = process.env.HELIUS_API_KEY ?? "";
    if (heliusKey) {
      return `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;
    }
    return (
      process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com"
    );
  },
  get x402Mode() {
    return process.env.X402_MODE ?? "prepaid";
  },
  get x402GatewayUrl() {
    return process.env.X402_GATEWAY_URL ?? "";
  },
  get x402FacilitatorUrl() {
    return (
      process.env.X402_FACILITATOR_URL ??
      "https://api.cdp.coinbase.com/platform/v2/x402"
    );
  },
  get x402PayerPrivateKey() {
    return process.env.X402_PAYER_PRIVATE_KEY ?? "";
  },
  get x402MaxCostPerTurn() {
    return num(process.env.X402_MAX_COST_PER_TURN, 0.05);
  },
  get x402MaxCostPerDay() {
    return num(process.env.X402_MAX_COST_PER_DAY, 1.0);
  },
  get x402MaxCostPerAddressPerDay() {
    return num(process.env.X402_MAX_COST_PER_ADDRESS_PER_DAY, 0.25);
  },
  get x402TimeoutMs() {
    return num(process.env.X402_TIMEOUT_MS, 60_000);
  },
  get appKey() {
    return process.env.APP_KEY ?? "";
  },
  get rateLimitPerMinute() {
    return num(process.env.RATE_LIMIT_PER_MINUTE, 20);
  },
  get maxBodyBytes() {
    return num(process.env.MAX_BODY_BYTES, 32 * 1024);
  },
  get kvRestApiUrl() {
    return process.env.KV_REST_API_URL ?? "";
  },
  get kvRestApiToken() {
    return process.env.KV_REST_API_TOKEN ?? "";
  },
  get x402Model() {
    return process.env.X402_MODEL ?? "gpt-4o-mini";
  },
  get port() {
    return num(process.env.PORT, 3000);
  },
  get logLevel() {
    return process.env.LOG_LEVEL ?? "info";
  },
};

export function log(level: "debug" | "info" | "warn" | "error", msg: string) {
  const order = { debug: 0, info: 1, warn: 2, error: 3 };
  if (order[level] >= order[config.logLevel as keyof typeof order]) {
    console.log(`[${level.toUpperCase()}] ${msg}`);
  }
}
