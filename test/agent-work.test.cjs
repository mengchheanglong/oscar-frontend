const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const lib = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/lib/agent-work.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText,
  { exports: lib },
);
const run = (id, status = "RUNNING") => ({
  id,
  conversationId: "chat-" + id,
  prompt: "Task " + id,
  status,
  updatedAt: "2026-10-22T00:00:00Z",
});
test("combines agent work without collapsing equal IDs across projects or runtimes", async () => {
  const projects = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ];
  const result = await lib.loadAgentWork(
    projects,
    async () => [run("same")],
    async () => [{ ...run("same", "WAITING"), platformType: "paperclip" }],
  );
  assert.equal(result.items.length, 4);
  assert.equal(
    new Set(result.items.map((r) => r.projectId + ":" + r.id)).size,
    4,
  );
  assert.deepEqual(
    Array.from(new Set(result.items.map((r) => r.agent))).sort(),
    ["Hermes", "Paperclip"],
  );
  assert.equal(result.failures.length, 0);
  assert.ok(
    result.items.some(
      (r) => r.status === "WAITING" && r.conversationId === "chat-same",
    ),
  );
});
test("keeps partial failures explicit and bounds concurrent requests", async () => {
  let active = 0,
    max = 0;
  const request = async (id) => {
    active++;
    max = Math.max(max, active);
    await new Promise((r) => setImmediate(r));
    active--;
    if (id === "bad") throw Error("offline");
    return [run(id)];
  };
  const result = await lib.loadAgentWork(
    ["a", "bad", "c", "d", "e"].map((id) => ({ id, name: id })),
    request,
    async () => [],
  );
  assert.equal(result.items.length, 4);
  assert.deepEqual(Array.from(result.failures), ["bad (Hermes)"]);
  assert.ok(max <= 2);
});
test("empty scope makes no requests", async () => {
  let called = false;
  const result = await lib.loadAgentWork(
    [],
    async () => {
      called = true;
      return [];
    },
    async () => {
      called = true;
      return [];
    },
  );
  assert.equal(called, false);
  assert.equal(result.items.length, 0);
});
