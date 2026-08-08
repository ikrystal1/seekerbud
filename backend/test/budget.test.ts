import { test } from "node:test";
import assert from "node:assert/strict";
import { Budget } from "../lib/budget";
import { createStore, type KVStore } from "../lib/store";

function freshStore(): KVStore {
  const savedUrl = process.env.KV_REST_API_URL;
  const savedToken = process.env.KV_REST_API_TOKEN;
  process.env.KV_REST_API_URL = "";
  process.env.KV_REST_API_TOKEN = "";
  const store = createStore();
  if (savedUrl === undefined) delete process.env.KV_REST_API_URL;
  else process.env.KV_REST_API_URL = savedUrl;
  if (savedToken === undefined) delete process.env.KV_REST_API_TOKEN;
  else process.env.KV_REST_API_TOKEN = savedToken;
  return store;
}

test("budget: spend persists across instances sharing a store", async () => {
  const store = freshStore();
  const a = new Budget(1.0, 0.25, store);
  await a.spend(0.1, "addr1");
  // A second instance (fresh cold start) must see the same spend.
  const b = new Budget(1.0, 0.25, store);
  assert.equal(await b.spentToday(), 0.1);
  assert.equal(await b.spentToday("addr1"), 0.1);
});

test("budget: per-address cap is isolated between addresses", async () => {
  const store = freshStore();
  const b = new Budget(1.0, 0.25, store);
  for (let i = 0; i < 5; i++) await b.spend(0.05, "heavy-user"); // 0.25
  await assert.rejects(b.spend(0.05, "heavy-user"), /budget exceeded/);
  // A different address is unaffected.
  await b.spend(0.05, "other-user");
});

test("budget: global cap blocks even with fresh address", async () => {
  const store = freshStore();
  const b = new Budget(0.2, 0.25, store);
  await b.spend(0.15, "addr-x");
  await assert.rejects(b.spend(0.1, "addr-y"), /budget exceeded/);
  assert.equal(await b.canAfford(0.06, "addr-y"), false);
  assert.equal(await b.canAfford(0.06, "addr-y") === false, true);
});

test("budget: canAfford does not spend", async () => {
  const store = freshStore();
  const b = new Budget(1.0, 0.25, store);
  assert.equal(await b.canAfford(0.2, "addr-z"), true);
  assert.equal(await b.spentToday(), 0, "nothing spent");
  assert.equal(await b.spentToday("addr-z"), 0);
});
