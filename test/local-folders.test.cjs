const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = ts.transpileModule(
  fs.readFileSync("src/lib/local-folders.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  },
).outputText;
const exportsObject = {};
vm.runInNewContext(source, {
  exports: exportsObject,
  require: () => ({
    apiRequest: () => {
      throw new Error("No API calls in scanner tests");
    },
  }),
  TextEncoder,
  TextDecoder,
  Set,
  Error,
});
const { scanFolder } = exportsObject;
const directory = (name, entries) => ({
  kind: "directory",
  name,
  async *values() {
    yield* entries;
  },
});
const file = (name, text) => ({
  kind: "file",
  name,
  async getFile() {
    const bytes = new TextEncoder().encode(text);
    return {
      name,
      size: bytes.length,
      async arrayBuffer() {
        return bytes.buffer;
      },
    };
  },
});

test("reads nested text with relative paths and preserves UTF-8 content", async () => {
  const result = await scanFolder(
    directory("Research", [
      directory("finance", [file("pricing.md", "Revenue €100")]),
      file("README.md", "Project notes"),
    ]),
  );
  assert.deepEqual(
    Array.from(result.files, (entry) => entry.path),
    ["finance/pricing.md", "README.md"],
  );
  assert.equal(result.files[0].text, "Revenue €100");
  assert.equal(result.skipped, 0);
});
test("accepts all filename types while skipping dependency and hidden folders", async () => {
  const result = await scanFolder(
    directory("Project", [
      file("Dockerfile", "FROM node"),
      file(".env", "Explicit selection"),
      file("notes.custom", "Notes"),
      directory("node_modules", [file("skip.js", "Skip")]),
      directory(".git", [file("config", "Skip")]),
    ]),
  );
  assert.equal(result.files.length, 3);
  assert.equal(result.skipped, 2);
  assert.ok(result.files.some((f) => f.path === "Dockerfile"));
});
test("keeps binary and large files as metadata and documents for deferred extraction", async () => {
  const result = await scanFolder(
    directory("Project", [
      file("large.txt", "x".repeat(131073)),
      file("photo.png", "a\0b"),
      file("report.pdf", "%PDF"),
      file("document.docx", "PK"),
      file("notes.txt", "Valid"),
    ]),
  );
  assert.equal(result.files.length, 5);
  assert.equal(result.skipped, 0);
  assert.ok(
    result.files
      .find((f) => f.path === "photo.png")
      .text.includes("metadata only"),
  );
  assert.ok(
    result.files
      .find((f) => f.path === "large.txt")
      .text.includes("metadata only"),
  );
  assert.ok(result.files.find((f) => f.path === "report.pdf").original);
  assert.ok(result.files.find((f) => f.path === "document.docx").original);
});

test("aborts an unreadable scan instead of returning a partial replacement manifest", async () => {
  await assert.rejects(
    scanFolder(
      directory("Project", [
        file("first.md", "Read"),
        {
          kind: "file",
          name: "unreadable.md",
          async getFile() {
            throw new Error("Permission revoked");
          },
        },
      ]),
    ),
    /Permission revoked/,
  );
});

test("aborts when file contents become unreadable after the handle was opened", async () => {
  const unreadable = {
    kind: "file",
    name: "notes.md",
    async getFile() {
      return {
        size: 12,
        async arrayBuffer() {
          throw new Error("File access revoked");
        },
      };
    },
  };
  await assert.rejects(
    scanFolder(directory("Project", [file("first.md", "Read"), unreadable])),
    /File access revoked/,
  );
});
test("allows large candidate lists for explicit selection while bounding deep traversal", async () => {
  const result = await scanFolder(
    directory(
      "Project",
      Array.from({ length: 101 }, (_, i) => file(`${i}.md`, "Select me")),
    ),
  );
  assert.equal(result.files.length, 101);
  let nested = directory("leaf", [file("notes.md", "Deep")]);
  for (let i = 0; i < 13; i++) nested = directory(`level${i}`, [nested]);
  await assert.rejects(scanFolder(nested), /too deep/);
});
