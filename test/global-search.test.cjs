const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const lib = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/lib/global-search.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText,
  { exports: lib, URL, URLSearchParams },
);
const projects = Array.from({ length: 6 }, (_, i) => ({
  id: String(i),
  name: `Project ${i}`,
  status: "ACTIVE",
}));
const row = (projectId, id, score = 0) => ({
  projectId,
  projectName: projectId,
  id,
  type: "TASK",
  updatedAt: "2026-10-17T00:00:00Z",
  metadata: { score },
});

test("search covers every active project, keeps source attribution and sums counts with bounded concurrency", async () => {
  const calls = [];
  let active = 0;
  let maxActive = 0;
  const result = await lib.searchAcrossProjects(
    [...projects, { id: "archived", name: "Archived", status: "ARCHIVED" }],
    async (...args) => {
      calls.push(args);
      maxActive = Math.max(maxActive, ++active);
      await new Promise((resolve) => setImmediate(resolve));
      active--;
      return {
        data: [{ ...row("wrong", "shared-id"), projectName: "wrong" }],
        meta: { total: 26, countsByType: { TASK: 26 } },
      };
    },
    "budget",
    "TASK",
    "keyword",
    1,
  );
  assert.equal(calls.length, 6);
  assert.equal(maxActive, 4);
  assert.ok(
    calls.every(
      (args) => args.slice(1).join("|") === "budget|TASK|1|25|keyword",
    ),
  );
  assert.equal(result.rows.length, 6);
  assert.equal(result.rows[0].projectId, "0");
  assert.equal(result.meta.total, 156);
  assert.equal(result.meta.countsByType.TASK, 156);
  assert.equal(result.hasMore, true);
  assert.equal(result.failed.length, 0);
});

test("a failed project is explicit while successful project results remain available", async () => {
  const result = await lib.searchAcrossProjects(
    projects.slice(0, 2),
    async (id) => {
      if (id === "1") throw Error("unavailable");
      return {
        data: [row(id, "one")],
        meta: { total: 1, countsByType: { TASK: 1 } },
      };
    },
    "query",
    "",
    "hybrid",
    2,
  );
  assert.equal(result.rows.length, 1);
  assert.equal(result.failed[0], "Project 1");
  assert.equal(result.meta.total, 1);
  assert.equal(result.hasMore, false);
});

test("pagination deduplicates within each project without dropping equal IDs in another project and ranks matches", () => {
  const result = lib.mergeSearchResults(
    [row("a", "one", 0.3)],
    [row("a", "one", 0.5), row("b", "one", 0.8)],
    "hybrid",
  );
  assert.equal(result.length, 2);
  assert.equal(result[0].projectId, "b");
  assert.equal(result[1].metadata.score, 0.5);
});

test("empty accessible project list never issues a search request", async () => {
  const result = await lib.searchAcrossProjects(
    [],
    async () => {
      throw Error("must not call");
    },
    "query",
    "",
    "hybrid",
  );
  assert.equal(result.rows.length, 0);
  assert.equal(result.meta.total, 0);
  assert.equal(result.failed.length, 0);
});

test("folder results open the original private folder path instead of treating the file ID as a document", () => {
  const href = lib.searchResultHref({
    id: "file-id",
    type: "DOCUMENT",
    projectId: "alpha",
    metadata: {
      sourceType: "LOCAL_FILE",
      folderId: "folder-id",
      relativePath: "finance/a & b.md",
    },
  });
  const target = new URL(href, "http://localhost:43100");
  assert.equal(target.pathname, "/documents");
  assert.equal(target.searchParams.get("folderId"), "folder-id");
  assert.equal(target.searchParams.get("path"), "finance/a & b.md");
  assert.equal(target.searchParams.get("projectId"), "alpha");
  assert.equal(target.searchParams.has("id"), false);
});

test("GitHub issue, PR and code results open safe source URLs", () => {
  for (const type of ["GITHUB_ISSUE", "GITHUB_PR", "GITHUB_CODE"]) {
    const item = {
      id: "source",
      type,
      projectId: "alpha",
      metadata: { htmlUrl: "https://github.com/org/repo/pull/1" },
    };
    assert.equal(lib.searchResultHref(item), item.metadata.htmlUrl);
    for (const htmlUrl of [
      "javascript:alert(1)",
      "https://github.com.evil.test/path",
    ]) {
      assert.ok(
        lib
          .searchResultHref({ ...item, metadata: { htmlUrl } })
          .startsWith("/integrations?"),
      );
    }
  }
});
