const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript");
const lib = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/lib/github-sync.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  { exports: lib, Error },
);
test("sync consumes every continuation page and reports final totals", async () => {
  let calls = 0;
  const pages = [
    { syncedCount: 2, syncedPrCount: 0, hasMore: true },
    { syncedCount: 0, syncedPrCount: 3, hasMore: true },
    { syncedCount: 0, syncedPrCount: 1, hasMore: false },
  ];
  const result = await lib.syncGitHubPages(
    async () => pages[calls++],
    new AbortController().signal,
  );
  assert.equal(calls, 3);
  assert.equal(result.issues, 2);
  assert.equal(result.pullRequests, 4);
});
test("a failed page is surfaced instead of success or skipping ahead", async () => {
  let calls = 0;
  await assert.rejects(
    lib.syncGitHubPages(async () => {
      calls++;
      if (calls === 2) throw new Error("HTTP 502");
      return { syncedCount: 1, hasMore: true };
    }, new AbortController().signal),
    /HTTP 502/,
  );
  assert.equal(calls, 2);
});
test("navigation cancellation prevents further page requests", async () => {
  const control = new AbortController();
  let calls = 0;
  await assert.rejects(
    lib.syncGitHubPages(async () => {
      calls++;
      control.abort();
      return { syncedCount: 1, hasMore: true };
    }, control.signal),
    /abort/i,
  );
  assert.equal(calls, 1);
});
test("missing continuation metadata is an API mismatch, not a completed sync", async () => {
  await assert.rejects(
    lib.syncGitHubPages(
      async () => ({ syncedCount: 1 }),
      new AbortController().signal,
    ),
    /more pages/,
  );
});
