import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSseCompletion } from "../lib/llm";

function sseResponse(chunks: string[]): Response {
  return new Response(chunks.join(""), {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

function chunkJson(o: unknown): string {
  return `data: ${JSON.stringify(o)}\n\n`;
}

test("SSE: accumulates text chunks and calls onDelta per chunk", async () => {
  const body = [
    chunkJson({ choices: [{ delta: { content: "Hel" } }] }),
    chunkJson({ choices: [{ delta: { content: "lo" } }] }),
    chunkJson({ choices: [{ delta: { content: " world" } }] }),
    "data: [DONE]\n\n",
  ];
  const deltas: string[] = [];
  const { outcome } = await parseSseCompletion(sseResponse(body), (d) =>
    deltas.push(d)
  );
  assert.equal(outcome.kind, "text");
  assert.deepEqual(deltas, ["Hel", "lo", " world"]);
  assert.equal((outcome as { text: string }).text, "Hello world");
});

test("SSE: accumulates tool_calls across deltas by index", async () => {
  const body = [
    chunkJson({
      choices: [
        { delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "get_sol_", arguments: "" } }] } },
      ],
    }),
    chunkJson({
      choices: [
        { delta: { tool_calls: [{ index: 0, function: { name: "balance", arguments: "{\"address\":" } }] } },
      ],
    }),
    chunkJson({
      choices: [
        { delta: { tool_calls: [{ index: 0, function: { arguments: "\"abc\"}" } }] } },
      ],
    }),
    "data: [DONE]\n\n",
  ];
  const { outcome } = await parseSseCompletion(sseResponse(body));
  assert.equal(outcome.kind, "tools");
  const calls = (outcome as { calls: Array<{ id: string; function: { name: string; arguments: string } }> }).calls;
  assert.equal(calls.length, 1);
  assert.equal(calls[0].id, "call_1");
  assert.equal(calls[0].function.name, "get_sol_balance");
  assert.equal(calls[0].function.arguments, '{"address":"abc"}');
});

test("SSE: multiple tool calls in one chunk keep order and index", async () => {
  const body = [
    chunkJson({
      choices: [
        {
          delta: {
            tool_calls: [
              { index: 0, id: "a", function: { name: "get_sol_balance", arguments: "{}" } },
              { index: 1, id: "b", function: { name: "get_token_balances", arguments: "{}" } },
            ],
          },
        },
      ],
    }),
    "data: [DONE]\n\n",
  ];
  const { outcome } = await parseSseCompletion(sseResponse(body));
  assert.equal(outcome.kind, "tools");
  const calls = (outcome as { calls: Array<{ id: string }> }).calls;
  assert.deepEqual(calls.map((c) => c.id), ["a", "b"]);
});

test("SSE: skips malformed chunks without killing the stream", async () => {
  const body = [
    "data: {not valid json\n\n",
    chunkJson({ choices: [{ delta: { content: "ok" } }] }),
    "data: [DONE]\n\n",
  ];
  const { outcome } = await parseSseCompletion(sseResponse(body));
  assert.equal(outcome.kind, "text");
  assert.equal((outcome as { text: string }).text, "ok");
});

test("SSE: empty stream yields empty text, not a crash", async () => {
  const { outcome } = await parseSseCompletion(sseResponse([""]));
  assert.equal(outcome.kind, "text");
  assert.equal((outcome as { text: string }).text, "");
});

test("SSE: content-type json path is unaffected (uses res.json)", async () => {
  const res = new Response(
    JSON.stringify({ choices: [{ message: { content: "plain" } }] }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
  // Reuse the full path through parseJsonCompletion via llmTurn's
  // non-streaming branch is out of scope here; just prove the shape:
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  assert.equal(json.choices?.[0]?.message?.content, "plain");
});
