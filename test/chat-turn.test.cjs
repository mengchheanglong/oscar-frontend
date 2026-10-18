const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const lib = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/lib/chat-turn.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText,
  { exports: lib },
);
test("reuses a persisted unfinished turn after reload, but treats edits and completed turns as new sends", () => {
  const user = {
    role: "user",
    status: "COMPLETED",
    content: "Question",
    mode: "WORKSPACE",
    clientRequestId: "saved-key",
  };
  assert.equal(
    lib.retryRequestKey([user], "Question", "WORKSPACE"),
    "saved-key",
  );
  assert.equal(
    lib.retryRequestKey(
      [user, { role: "assistant", status: "FAILED" }],
      "Question",
      "WORKSPACE",
    ),
    "saved-key",
  );
  assert.equal(
    lib.retryRequestKey(
      [user, { role: "assistant", status: "COMPLETED" }],
      "Question",
      "WORKSPACE",
    ),
    undefined,
  );
  assert.equal(lib.retryRequestKey([user], "Edited", "WORKSPACE"), undefined);
  assert.equal(lib.retryRequestKey([user], "Question", "DEVELOPER"), undefined);
  assert.equal(
    lib.retryRequestKey(
      [{ ...user, contextExcluded: true }],
      "Question",
      "WORKSPACE",
    ),
    undefined,
  );
});
test("replaces optimistic and previously saved copies of the same turn while preserving older messages", () => {
  const old = { id: "older" },
    user = { id: "saved-user" },
    failed = { id: "saved-answer", status: "FAILED" },
    answer = { id: "saved-answer", status: "COMPLETED" };
  const result = lib.mergeChatTurn(
    [old, user, failed, { id: "temporary" }],
    "temporary",
    user,
    answer,
  );
  assert.equal(result.length, 3);
  assert.equal(result[0], old);
  assert.equal(result[1], user);
  assert.equal(result[2], answer);
});
