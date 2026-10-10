const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { webcrypto, createHash } = require("node:crypto");
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/lib/folder-resume.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: exportsObject, crypto: webcrypto, Uint8Array });
test("resume fingerprint matches server algorithm across block boundaries and catches changed content", async () => {
  for (const length of [0, 12, 8 * 1024 * 1024 + 1]) {
    const buffer = Buffer.alloc(length, 65);
    const outer = createHash("sha256");
    for (let i = 0; i < length; i += 8 * 1024 * 1024) outer.update(createHash("sha256").update(buffer.subarray(i, i + 8 * 1024 * 1024)).digest());
    const expected = `sha256-blocks-v1:${outer.digest("hex")}`;
    assert.equal(await exportsObject.folderResumeHash(new Blob([buffer])), expected);
    if (length) { buffer[length - 1] = 66; assert.notEqual(await exportsObject.folderResumeHash(new Blob([buffer])), expected); }
  }
});
test("pausing stops resume verification", async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(exportsObject.folderResumeHash(new Blob(["file"]), controller.signal), { name: "AbortError" });
});
