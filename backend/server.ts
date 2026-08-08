import { createServer } from "http";
import { config, log } from "./lib/config";
import chatHandler from "./api/chat";
import { mockGatewayHandler } from "./lib/mockGateway";

/**
 * Local dev server. Also serves a mock x402 gateway at /__mock__ so the full
 * payment path can be tested without a real gateway:
 *   X402_GATEWAY_URL=http://localhost:3000/__mock__/v1/chat/completions
 * Vercel deployment only uses api/chat.ts — this file is dev-only.
 */
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  // Railway health check
  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ status: "ok", service: "seekerbud-backend" }));
  }

  if (url.pathname === "/__mock__/v1/chat/completions") {
    return mockGatewayHandler(req, res);
  }
  if (url.pathname === "/api/chat") {
    return chatHandler(req, res);
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(config.port, () => {
  log("info", `SeekerBud backend on http://localhost:${config.port}`);
  log(
    "info",
    config.x402GatewayUrl
      ? `x402 gateway: ${config.x402GatewayUrl}`
      : "x402 gateway: none (stub LLM active — set X402_GATEWAY_URL)"
  );
  if (!config.x402GatewayUrl) {
    log(
      "info",
      `  mock gateway available: http://localhost:${config.port}/__mock__/v1/chat/completions`
    );
  }
});
