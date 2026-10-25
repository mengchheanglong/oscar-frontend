const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript");
const lib = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/lib/knowledge-citation.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  { exports: lib, URL },
);
test("external citations allow public HTTPS and reject executable, private and credential-bearing links", () => {
  assert.equal(
    lib.knowledgeCitationUrl("https://ocw.mit.edu/lecture.pdf"),
    "https://ocw.mit.edu/lecture.pdf",
  );
  for (const value of [
    undefined,
    "javascript:alert(1)",
    "file:///C:/secret",
    "http://example.org/",
    "https://localhost/",
    "https://127.0.0.1/",
    "https://u:p@example.org/",
    "https://example.org/?token=private",
  ]) {
    assert.equal(lib.knowledgeCitationUrl(value), undefined);
  }
});
