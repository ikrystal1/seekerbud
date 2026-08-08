import { config, log } from "./config";
import { store, type KVStore } from "./store";

const TTL = 72 * 3600; // keys live 72h; rollover logic guards the day boundary

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

const globalKey = () => `sb:budget:global:${todayKey()}`;
const addrKey = (address: string) => `sb:budget:addr:${todayKey()}:${address}`;

/**
 * Daily spend budget persisted in the store (Vercel KV in production),
 * so caps survive cold starts and hold across instances.
 *
 * Two caps are enforced on every payment:
 *  - global  : X402_MAX_COST_PER_DAY  (agent wallet safety)
 *  - per-address: X402_MAX_COST_PER_ADDRESS_PER_DAY (abuse limit per user)
 */
export class Budget {
  constructor(
    private readonly globalCapUsd: number,
    private readonly perAddressCapUsd: number,
    private readonly kv: KVStore = store
  ) {}

  private async read(key: string): Promise<number> {
    const raw = await this.kv.get(key);
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  /** Checks both caps without spending. */
  async canAfford(amountUsd: number, address?: string): Promise<boolean> {
    const global = await this.read(globalKey());
    if (global + amountUsd > this.globalCapUsd) return false;
    if (address) {
      const addr = await this.read(addrKey(address));
      if (addr + amountUsd > this.perAddressCapUsd) return false;
    }
    return true;
  }

  /** Records a payment against both caps. Throws if either would exceed. */
  async spend(amountUsd: number, address?: string): Promise<void> {
    const global = await this.read(globalKey());
    if (global + amountUsd > this.globalCapUsd) {
      throw new Error(
        `Daily x402 budget exceeded (${(global + amountUsd).toFixed(3)} > ${this.globalCapUsd} USD)`
      );
    }
    if (address) {
      const addr = await this.read(addrKey(address));
      if (addr + amountUsd > this.perAddressCapUsd) {
      throw new Error(
        `Daily x402 budget exceeded for this wallet (${(addr + amountUsd).toFixed(3)} > ${this.perAddressCapUsd} USD)`
      );
      }
      await this.kv.set(addrKey(address), String(addr + amountUsd), TTL);
    }
    await this.kv.set(globalKey(), String(global + amountUsd), TTL);
    log(
      "info",
      `budget: spent ${amountUsd.toFixed(4)} USD (global ${(global + amountUsd).toFixed(4)}/${this.globalCapUsd}${address ? `, address ${(await this.read(addrKey(address))).toFixed(4)}/${this.perAddressCapUsd}` : ""})`
    );
  }

  async spentToday(address?: string): Promise<number> {
    return this.read(address ? addrKey(address) : globalKey());
  }
}

export const budget = new Budget(
  config.x402MaxCostPerDay,
  config.x402MaxCostPerAddressPerDay
);
