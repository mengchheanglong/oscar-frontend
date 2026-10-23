const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript");
const lib = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/lib/chat-context.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  { exports: lib },
);
const citation = (sourceId, sourceType = "DOCUMENT") => ({
  sourceId,
  sourceType,
  title: "Evidence",
  chunkId: "chunk-" + sourceId,
});
const message = (citations, more = {}) => ({
  id: "answer",
  conversationId: "chat",
  role: "assistant",
  status: "COMPLETED",
  citations,
  ...more,
});
test("shows actual file citations, deduplicates chunks and excludes unrelated/failed/excluded messages", () => {
  const result = lib.recordedChatContext(
    "project",
    "chat",
    [
      message([citation("file"), citation("file"), citation("task", "TASK")]),
      message([citation("foreign")], { conversationId: "other" }),
      message([citation("excluded")], { contextExcluded: true }),
      message([citation("failed")], { status: "FAILED" }),
    ],
    [],
    [],
  );
  assert.equal(result.files.length, 1);
  assert.equal(result.files[0].citation.sourceId, "file");
  assert.equal(result.plugins.length, 0);
});
test("never infers tools from prose or general evidence, and scopes recorded plugin activity", () => {
  const messages = [message([])];
  messages[0].content = "I used T3 and MCP and README.md";
  const result = lib.recordedChatContext(
    "project",
    "chat",
    messages,
    [
      {
        id: "h",
        projectId: "other",
        conversationId: "chat",
        status: "SUCCEEDED",
        updatedAt: "2026-10-23",
        evidence: [],
      },
    ],
    [
      {
        id: "t",
        projectId: "project",
        conversationId: "chat",
        platformType: "t3",
        status: "WAITING",
        updatedAt: "2026-10-23",
      },
      {
        id: "p",
        projectId: "project",
        conversationId: "other",
        platformType: "paperclip",
        status: "SUCCEEDED",
        updatedAt: "2026-10-23",
      },
    ],
  );
  assert.equal(result.plugins.length, 1);
  assert.equal(result.plugins[0].id, "t3");
  assert.equal(result.plugins[0].status, "Waiting");
  assert.equal(result.files.length, 0);
});
test("includes only successful recorded Hermes file reads and labels cited GitHub sources accurately", () => {
  const result = lib.recordedChatContext(
    "project",
    "chat",
    [message([citation("code", "GITHUB_CODE")])],
    [
      {
        id: "h",
        projectId: "project",
        conversationId: "chat",
        assistantMessageId: "answer",
        status: "SUCCEEDED",
        updatedAt: "2026-10-23",
        evidence: [
          {
            chunkId: "ordinary-task-chunk",
            sourceId: "task",
            title: "A task",
            locator: "task",
          },
          {
            chunkId: "local:folder:notes.md#hash",
            sourceId: "folder",
            title: "notes.md",
            locator: "notes.md",
          },
        ],
      },
    ],
    [],
  );
  assert.equal(result.files.length, 2);
  assert.ok(
    result.files.some(
      (f) => f.kind === "Read by Hermes" && f.title === "notes.md",
    ),
  );
  assert.equal(
    result.plugins.find((p) => p.id === "github").status,
    "Sources cited",
  );
});
