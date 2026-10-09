"use client";

import React, { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

interface MarkdownContentProps {
  content: string;
}

function renderInline(text: string): React.ReactNode[] {
  // Matches: **bold**, *italic*, `inline code`, [Evidence ...], [text](url)
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[Evidence\s*[^\]]+\]|\[[^\]]+\]\([^)]+\))/gi;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `inline-${match.index}`;

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(
        <em key={key} className="italic text-slate-600">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-600 font-mono text-[11px] border border-slate-200"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (/^\[Evidence\s*[^\]]+\]$/i.test(token)) {
      const numbers = token.match(/\d+/g) || [];
      if (numbers.length > 0) {
        numbers.forEach((num, nIdx) => {
          nodes.push(
            <span
              key={`${key}-${nIdx}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-[#2D8A60] border border-emerald-200 ml-1 select-none shadow-2xs align-baseline"
              title={`Project evidence source #${num}`}
            >
              <span className="w-1 h-1 rounded-full bg-[#2D8A60]" />
              Evidence #{num}
            </span>
          );
        });
      } else {
        nodes.push(token);
      }
    } else if (/^\[([^\]]+)\]\(([^)]+)\)$/.test(token)) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        let safeLink = false;
        try {
          safeLink = ["http:", "https:"].includes(
            new URL(linkMatch[2], "https://workspace.invalid").protocol
          );
        } catch {
          // Invalid model-generated URLs render as plain text.
        }
        if (!safeLink) {
          nodes.push(<span key={key}>{linkMatch[1]}</span>);
        } else {
          nodes.push(
            <a
              key={key}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-0.5 font-medium"
            >
              {linkMatch[1]}
              <ExternalLink className="w-2.5 h-2.5 ml-0.5 inline" />
            </a>
          );
        }
      }
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl border border-slate-800 bg-[#0F172A] overflow-hidden shadow-sm group">
      <div className="px-3.5 py-1.5 bg-[#1E293B] border-b border-slate-700/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className="text-indigo-300 font-semibold">{lang || "text"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 text-[12px] font-mono text-slate-100 overflow-x-auto leading-relaxed selection:bg-indigo-600/30">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("-") || !trimmed.includes("|")) return false;
  const cells = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|");
  return cells.length > 0 && cells.every((c) => {
    const s = c.trim();
    return /^:?-+:?$/.test(s);
  });
}

function parseTableAlign(cell: string): "left" | "center" | "right" {
  const c = cell.trim();
  if (c.startsWith(":") && c.endsWith(":")) return "center";
  if (c.endsWith(":")) return "right";
  return "left";
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  if (!content) return null;

  // 1. Clean up literal escaped unicode bullets & carriage returns
  const clean = content
    .replace(/\\u2022/g, "•")
    .replace(/\u2022/g, "•");

  const lines = clean.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let codeLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // Check code blocks
    if (trimmed.startsWith("```")) {
      if (inCode) {
        blocks.push(
          <CodeBlock
            key={`code-${i}`}
            code={codeLines.join("\n")}
            lang={codeLang}
          />
        );
        inCode = false;
        codeLines = [];
        codeLang = "";
      } else {
        inCode = true;
        codeLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      blocks.push(<div key={`spacer-${i}`} className="h-1.5" />);
      continue;
    }

    // Markdown horizontal divider (---, ***, ___)
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      blocks.push(
        <hr key={`hr-${i}`} className="my-3.5 border-t border-slate-200/90" />
      );
      continue;
    }

    // Markdown Table detection: line contains | and next line is a separator row
    if (
      trimmed.includes("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1]!)
    ) {
      const headerLine = trimmed;
      const separatorLine = lines[i + 1]!.trim();
      const headers = headerLine
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
      const aligns = separatorLine
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map(parseTableAlign);

      i += 2;
      const rows: string[][] = [];
      while (
        i < lines.length &&
        lines[i]!.trim().includes("|") &&
        !isTableSeparator(lines[i]!)
      ) {
        const rowCells = lines[i]!
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
        rows.push(rowCells);
        i++;
      }
      i--; // Step back one so loop increments properly

      blocks.push(
        <div
          key={`table-${blocks.length}`}
          className="my-3 overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs bg-white"
        >
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-800 font-semibold">
              <tr>
                {headers.map((h, hIdx) => (
                  <th
                    key={`th-${hIdx}`}
                    scope="col"
                    className={`px-3.5 py-2.5 font-semibold text-slate-800 whitespace-nowrap ${
                      aligns[hIdx] === "center"
                        ? "text-center"
                        : aligns[hIdx] === "right"
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row, rIdx) => (
                <tr
                  key={`tr-${rIdx}`}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  {headers.map((_, cIdx) => (
                    <td
                      key={`td-${cIdx}`}
                      className={`px-3.5 py-2.5 text-slate-700 leading-relaxed align-top ${
                        aligns[cIdx] === "center"
                          ? "text-center"
                          : aligns[cIdx] === "right"
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      {renderInline(row[cIdx] || "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      blocks.push(
        <h4
          key={`h3-${i}`}
          className="text-xs font-bold text-slate-900 mt-3 mb-1.5 flex items-center gap-1.5 tracking-tight"
        >
          <span className="w-1.5 h-1.5 rounded-sm bg-indigo-500 shrink-0" />
          <span>{renderInline(trimmed.slice(4))}</span>
        </h4>
      );
    } else if (trimmed.startsWith("## ")) {
      blocks.push(
        <h3
          key={`h2-${i}`}
          className="text-sm font-bold text-slate-900 tracking-tight mt-4 mb-2 pb-1 border-b border-slate-200 flex items-center gap-2"
        >
          <span className="w-1 h-3.5 bg-indigo-600 rounded-full shrink-0" />
          <span>{renderInline(trimmed.slice(3))}</span>
        </h3>
      );
    } else if (trimmed.startsWith("# ")) {
      blocks.push(
        <h2
          key={`h1-${i}`}
          className="text-base font-extrabold text-slate-900 mt-4 mb-2 tracking-tight flex items-center gap-2"
        >
          <span className="w-1.5 h-4 bg-indigo-600 rounded-full shrink-0" />
          <span>{renderInline(trimmed.slice(2))}</span>
        </h2>
      );
    } else if (trimmed.startsWith("> ")) {
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-indigo-500 pl-3 my-2 italic text-slate-600 text-[12px] bg-slate-50 py-1.5 rounded-r-lg"
        >
          {renderInline(trimmed.slice(2))}
        </blockquote>
      );
    } else if (/^(\s*[-*•])\s+\[([ xX])\]\s+(.*)$/.test(line)) {
      const match = line.match(/^(\s*[-*•])\s+\[([ xX])\]\s+(.*)$/);
      const isChecked = match?.[2]?.toLowerCase() === "x";
      const itemText = match?.[3] ?? trimmed;
      blocks.push(
        <div key={`task-${i}`} className="flex items-start gap-2.5 my-1 pl-1">
          <input
            type="checkbox"
            checked={isChecked}
            readOnly
            className="mt-1 h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 pointer-events-none accent-indigo-600"
          />
          <div
            className={`flex-1 text-[13px] leading-relaxed ${
              isChecked ? "line-through text-slate-400" : "text-slate-700"
            }`}
          >
            {renderInline(itemText)}
          </div>
        </div>
      );
    } else if (/^(\s*[-*•]|\s*\\u2022)\s+/.test(line)) {
      const match = line.match(/^(\s*[-*•]|\s*\\u2022)\s+(.*)$/);
      const itemText = match ? match[2] : trimmed;
      blocks.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2.5 my-1 pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
          <div className="flex-1 text-[13px] text-slate-700 leading-relaxed">
            {renderInline(itemText)}
          </div>
        </div>
      );
    } else if (/^\s*(\d+)\.\s+(.*)$/.test(line)) {
      const match = line.match(/^\s*(\d+)\.\s+(.*)$/);
      const num = match ? match[1] : "1";
      const itemText = match ? match[2] : trimmed;
      blocks.push(
        <div key={`num-${i}`} className="flex items-start gap-2 my-1 pl-1">
          <span className="w-4 h-4 rounded bg-slate-100 text-[10px] font-mono font-semibold text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
            {num}
          </span>
          <div className="flex-1 text-[13px] text-slate-700 leading-relaxed">
            {renderInline(itemText)}
          </div>
        </div>
      );
    } else {
      blocks.push(
        <p key={`p-${i}`} className="text-[13px] text-slate-700 leading-relaxed my-1">
          {renderInline(line)}
        </p>
      );
    }
  }

  return <div className="space-y-0.5">{blocks}</div>;
}
