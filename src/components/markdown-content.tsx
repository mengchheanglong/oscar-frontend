"use client";

import React, { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";

export interface MarkdownCitation {
  evidenceNumber?: number;
  title: string;
  projectKey?: string;
}

interface MarkdownContentProps {
  content: string;
  citations?: MarkdownCitation[];
  onCitationClick?: (citation: MarkdownCitation, index: number) => void;
}

interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
}

// Transform prose references only. Code and existing links keep their literal text.
export function remarkEvidence() {
  return (tree: MarkdownNode) => {
    const visit = (parent: MarkdownNode) => {
      if (
        !parent.children ||
        ["link", "linkReference", "code", "inlineCode"].includes(parent.type)
      )
        return;
      parent.children = parent.children.flatMap((child) => {
        if (child.type !== "text" || !child.value) {
          visit(child);
          return [child];
        }
        const nodes: MarkdownNode[] = [];
        const pattern = /\[Evidence\s+#?\d+[^\]\n]*\]/gi;
        let offset = 0;
        for (const match of Array.from(child.value.matchAll(pattern))) {
          if (match.index! > offset)
            nodes.push({
              type: "text",
              value: child.value.slice(offset, match.index),
            });
          // Workspace labels can share a marker (e.g. [Evidence #1, P2026]).
          // Only numeric source entries count; digits inside a project key do not.
          const numbers = Array.from(
            match[0].matchAll(/(?:Evidence\s+#?|,\s*#?)(\d+)(?=\s*(?:,|\]))/gi),
            (entry) => entry[1],
          );
          for (const number of Array.from(new Set(numbers))) {
            nodes.push({
              type: "link",
              url: `#continuum-evidence-${Number(number)}`,
              children: [{ type: "text", value: number }],
            });
          }
          offset = match.index! + match[0].length;
        }
        if (!offset) return [child];
        if (offset < child.value.length)
          nodes.push({ type: "text", value: child.value.slice(offset) });
        return nodes;
      });
    };
    visit(tree);
  };
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleCopy = async () => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    timer.current = setTimeout(() => setCopyState("idle"), 2500);
  };

  return (
    <div className="answer-code">
      <div className="answer-code-header">
        <span>{lang || "Code"}</span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          aria-label="Copy code"
        >
          {copyState === "copied" ? <Check size={14} /> : <Copy size={14} />}
          <span aria-live="polite">
            {copyState === "copied"
              ? "Copied"
              : copyState === "failed"
                ? "Couldn't copy. Try again"
                : "Copy code"}
          </span>
        </button>
      </div>
      <pre tabIndex={0} aria-label={`${lang || "Code"} code block`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function nodeText(node?: MarkdownNode): string {
  return node?.value ?? node?.children?.map(nodeText).join("") ?? "";
}

export function MarkdownContent({
  content,
  citations = [],
  onCitationClick,
}: MarkdownContentProps) {
  if (!content) return null;

  return (
    <div className="answer-markdown">
      <Markdown
        remarkPlugins={[remarkGfm, remarkEvidence]}
        skipHtml
        urlTransform={(url) => {
          // Model output cannot load local resources or executable URL schemes.
          if (/^#continuum-evidence-\d+$/.test(url)) return url;
          if (/^t3-thread:\/\/v1\/[a-zA-Z0-9:_-]{1,255}$/.test(url)) return url;
          try {
            return ["https:", "http:"].includes(new URL(url).protocol)
              ? url
              : "";
          } catch {
            return "";
          }
        }}
        components={{
          a: ({ href, children }) => {
            const match = href?.match(/^#continuum-evidence-(\d+)$/);
            if (match) {
              const number = Number(match[1]);
              const index = citations.findIndex(
                (item, i) => (item.evidenceNumber ?? i + 1) === number,
              );
              const citation = citations[index];
              if (!citation || !onCitationClick)
                return (
                  <span
                    className="answer-citation answer-citation-unavailable"
                    title={citation?.title || `Source ${number} unavailable`}
                  >
                    [{number}]
                  </span>
                );
              const label = `${citation.projectKey ? `${citation.projectKey} · ` : ""}${citation.title}`;
              return (
                <button
                  type="button"
                  className="answer-citation"
                  title={label}
                  aria-label={`Inspect source ${number}: ${label}`}
                  onClick={() => onCitationClick(citation, index)}
                >
                  {number}
                </button>
              );
            }
            return href ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            );
          },
          // Avoid untrusted image requests, tracking pixels, or huge remote assets.
          img: ({ alt }) => <span>{alt}</span>,
          pre: ({ node }) => {
            const code = node?.children.find(
              (item) => item.type === "element" && item.tagName === "code",
            );
            const classes =
              code?.type === "element" ? code.properties.className : undefined;
            const language = Array.isArray(classes)
              ? classes.find(
                  (value) =>
                    typeof value === "string" && value.startsWith("language-"),
                )
              : undefined;
            return (
              <CodeBlock
                code={nodeText(code as MarkdownNode | undefined).replace(
                  /\n$/,
                  "",
                )}
                lang={
                  typeof language === "string" ? language.slice(9) : undefined
                }
              />
            );
          },
          table: ({ children }) => (
            <div
              className="answer-table"
              role="region"
              aria-label="Response table"
              tabIndex={0}
            >
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
