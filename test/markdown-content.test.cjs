const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const component = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync("src/components/markdown-content.tsx", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText,
  {
    module: component,
    exports: component.exports,
    require,
    setTimeout,
    clearTimeout,
    URL,
  },
);
const render = (content, props = {}) =>
  renderToStaticMarkup(
    React.createElement(component.exports.MarkdownContent, {
      content,
      ...props,
    }),
  );

test("supports native T3 thread links without allowing arbitrary app protocol commands", () => {
  const html = render(
    "[T3](t3-thread://v1/12345678-1234-1234-1234-123456789abc) [bad](t3-thread://v1/../../execute)",
  );
  assert.match(
    html,
    /href="t3-thread:\/\/v1\/12345678-1234-1234-1234-123456789abc"/,
  );
  assert.doesNotMatch(html, /href="t3-thread:\/\/v1\/\.\./);
  assert.match(
    render("[T3](t3-thread://v1/mcp:12345678-1234-1234-1234-123456789abc)"),
    /href="t3-thread:\/\/v1\/mcp:/,
  );
});

test("renders joined paragraphs, nested lists and GFM tables semantically", () => {
  const html = render(
    "First line\ncontinues here.\n\n## Details\n\n1. Parent\n   - Child with **emphasis**\n2. Next\n\n| Name | Value |\n| --- | ---: |\n| A \\| B | 2 |\n\n- [x] Complete",
  );
  assert.match(html, /<p>First line\ncontinues here\.<\/p>/);
  assert.match(html, /<h2>Details<\/h2>/);
  assert.match(html, /<ol>[\s\S]*<ul>/);
  assert.match(html, /<td>A \| B<\/td>/);
  assert.match(html, /type="checkbox"[^>]*disabled=""[^>]*checked=""/);
});

test("keeps unfinished code visible and leaves evidence markers inside code literal", () => {
  const html = render("```python\nprint('[Evidence #2]')\n");
  assert.match(html, /aria-label="Copy code"/);
  assert.match(html, /print\(&#x27;\[Evidence #2\]&#x27;\)/);
  assert.doesNotMatch(html, /answer-citation/);
});

test("resolves exact evidence numbers, supports grouped references and marks unknown sources unavailable", () => {
  const html = render(
    "Fact [Evidence #7, #2]. Unknown [Evidence #99]. `literal [Evidence #7]`",
    {
      citations: [
        { title: "Other project plan", projectKey: "P2", evidenceNumber: 7 },
        { title: "Legacy second source" },
      ],
      onCitationClick: () => {},
    },
  );
  assert.match(html, /aria-label="Inspect source 7: P2 · Other project plan"/);
  assert.match(html, /aria-label="Inspect source 2: Legacy second source"/);
  assert.match(html, /title="Source 99 unavailable">\[99\]/);
  assert.match(html, /<code>literal \[Evidence #7\]<\/code>/);
  assert.equal((html.match(/<button/g) || []).length, 2);
});

test("blocks executable/local links, raw HTML and remote image requests", () => {
  const html = render(
    "[bad](javascript:alert%281%29) [file](file:///secret) [relative](/settings) [ok](https://example.com)\n\n<img src=x onerror=alert(1)>\n\n![Image description](https://example.com/tracker.png)",
  );
  assert.doesNotMatch(
    html,
    /javascript:|file:|href="\/settings|<img|onerror|tracker\.png/,
  );
  assert.match(
    html,
    /href="https:\/\/example.com" target="_blank" rel="noopener noreferrer"/,
  );
  assert.match(html, /Image description/);
});

test("workspace annotations do not become extra evidence numbers", () => {
  const html = render(
    "Cedar [Evidence #1, QAR66E36]. Both [Evidence #1, #2, P2026].",
    {
      citations: [{ title: "Cedar" }, { title: "Juniper" }],
      onCitationClick: () => {},
    },
  );
  assert.equal((html.match(/<button/g) || []).length, 3);
  assert.doesNotMatch(html, /Source (66|36|2026) unavailable/);
  assert.match(html, /Inspect source 2: Juniper/);
});
