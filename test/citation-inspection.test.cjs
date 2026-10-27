const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const lib = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync("src/lib/citation-inspection.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText,
  { exports: lib },
);
const citation = {
  chunkId: "chunk",
  sourceId: "doc",
  revision: 1,
  snippet: "First indicator",
};
const text = "First indicator; second indicator; third indicator.";
const passage = {
  chunkId: "chunk",
  documentId: "doc",
  revision: 1,
  text,
  charCount: text.length,
};
test("historical preview truncation is detected from the exact permitted source revision", () => {
  const result = lib.citationPreviewState(citation, passage);
  assert.equal(result.isTruncated, true);
  assert.equal(result.fullLength, text.length);
  assert.equal(citation.exactExcerpt, undefined);
});
test("other sources, stale revisions and unrelated excerpts cannot establish historical completeness", () => {
  for (const changed of [
    { ...passage, chunkId: "other" },
    { ...passage, documentId: "other" },
    { ...passage, revision: 2 },
    { ...passage, charCount: 999 },
  ])
    assert.equal(
      lib.citationPreviewState(citation, changed).isTruncated,
      false,
    );
  assert.equal(
    lib.citationPreviewState(
      { ...citation, snippet: "Different excerpt" },
      passage,
    ).isTruncated,
    false,
  );
});
test("complete previews and Unicode character counts remain accurate", () => {
  assert.equal(
    lib.citationPreviewState({ ...citation, snippet: text }, passage)
      .isTruncated,
    false,
  );
  assert.equal(lib.characterCount("𝛼"), 1);
  assert.equal(
    lib.citationPreviewState({ ...citation, isTruncated: true }).isTruncated,
    true,
  );
});
