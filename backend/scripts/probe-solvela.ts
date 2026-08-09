import "dotenv/config";
import { config } from "../lib/config";

const URL = config.x402GatewayUrl;
const TOKEN = process.env.APP_KEY ?? "";

async function probe(label: string, header: string) {
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "payment-signature": header,
      "x-app-key": TOKEN,
    },
    body: JSON.stringify({ model: "openai/gpt-4o-mini", messages: [{ role: "user", content: "hi" }] }),
  });
  const text = await res.text();
  const isDecodeErr = text.includes("could not be decoded");
  console.log(`${label.padEnd(28)} status=${res.status} decodeErr=${isDecodeErr}`);
  if (!isDecodeErr) console.log("   BODY:", text.slice(0, 200));
}

(async () => {
  const fakeTx = Buffer.alloc(120, 7).toString("base64");
  const payload = {
    x402Version: 2,
    scheme: "exact",
    network: "solana",
    payload: { transaction: fakeTx },
  };
  const json = JSON.stringify(payload);

  // 1. Standard base64 (what we send)
  const std = Buffer.from(json).toString("base64");
  await probe("1. standard base64", std);

  // 2. base64url (URL-safe)
  const urlSafe = std.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  await probe("2. base64url", urlSafe);

  // 3. Raw JSON, no base64
  await probe("3. raw JSON", json);

  // 4. Standard base64 WITH trailing newline (JWT style)
  await probe("4. base64 + newline", std + "\n");

  // 5. Double-encoded (base64 of base64)
  await probe("5. double base64", Buffer.from(std).toString("base64"));

  // 6. Empty-ish: single char
  await probe("6. single char", "A");

  // 7. Header with only '{}' base64
  await probe("7. base64 of {}", Buffer.from("{}").toString("base64"));

  // 8. Base64 of JSON with URL-safe INNER tx (in case inner matters)
  const payloadUrlInner = {
    ...payload,
    payload: { transaction: Buffer.alloc(120, 7).toString("base64").replace(/\+/g, "-").replace(/\//g, "_") },
  };
  await probe("8. base64url inner tx", Buffer.from(JSON.stringify(payloadUrlInner)).toString("base64"));
})().catch((e) => console.error("FATAL:", e));
