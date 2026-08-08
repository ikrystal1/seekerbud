import { config, log } from "./config";

/**
 * Minimal KV store abstraction.
 *
 * Backends:
 *  - Vercel KV (REST) when KV_REST_API_URL + KV_REST_API_TOKEN are set —
 *    shared across instances, survives cold starts.
 *  - In-memory Map otherwise — per-instance, resets on cold start (dev).
 *
 * Production should always configure Vercel KV.
 */
export interface KVStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
}

class MemoryStore implements KVStore {
  private map = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.map.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0,
    });
  }
}

class VercelKVStore implements KVStore {
  private base: string;
  private token: string;

  constructor() {
    this.base = config.kvRestApiUrl.replace(/\/$/, "");
    this.token = config.kvRestApiToken;
  }

  async get(key: string): Promise<string | null> {
    const res = await fetch(`${this.base}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      log("warn", `kv:get ${key} → ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { result?: string | null };
    return json.result ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const url = ttlSeconds
      ? `${this.base}/set/${encodeURIComponent(key)}?ex=${ttlSeconds}`
      : `${this.base}/set/${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(value),
    });
    if (!res.ok) {
      log("warn", `kv:set ${key} → ${res.status}`);
    }
  }
}

export function createStore(): KVStore {
  if (config.kvRestApiUrl && config.kvRestApiToken) {
    log("info", "store: Vercel KV (shared across instances)");
    return new VercelKVStore();
  }
  log("info", "store: in-memory (dev fallback — set KV_REST_API_* for production)");
  return new MemoryStore();
}

export const store = createStore();
