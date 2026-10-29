"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { apiRequest } from "@/lib/api";
import { AppLayout } from "@/components/app-layout";
import { KnowledgeNavigation } from "./knowledge-navigation";

type PassageKey = { chunk_id: string; document_id: string; revision: number };
type Topic = {
  id: string;
  label: string;
  domain: string;
  sources: number;
  passages: number;
};
type Source = {
  id: string;
  title: string;
  author: string | null;
  passages: number;
  sample?: PassageKey;
};
type Edge = PassageKey & {
  source_id: string;
  topic_id: string;
  anchor: string;
  page_start: number | null;
  locator: string | null;
  relation: "mentions";
};
type Graph = {
  ready: boolean;
  notice?: string;
  topics: Topic[];
  sources: Source[];
  edges: Edge[];
  related_topics: { source: string; target: string; relation: string }[];
  summary: {
    eligible_sources?: number;
    mapped_sources?: number;
    unmapped_sources?: number;
    limited?: boolean;
    matched_sources?: number;
    offset?: number;
  };
};

export default function KnowledgeGraph() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState<string | null>("customer-discovery");
  const [source, setSource] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    title: string;
    text: string;
    locator?: string;
    reviewRequired?: boolean;
  } | null>(null);
  const previewTicket = useRef(0);
  const closePreview = () => {
    previewTicket.current++;
    setPreview(null);
    setPreviewError("");
    setPreviewLoading(false);
  };
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    apiRequest<Graph>("/knowledge/graph", {
      method: "POST",
      body: JSON.stringify({
        query: search,
        topicId: topic ?? undefined,
        sourceId: source ?? undefined,
        limit: 20,
        offset,
      }),
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) setGraph(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Could not load the map.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, topic, source, offset]);

  function followTopic(id: string) {
    setOffset(0);
    setQuery("");
    setSearch("");
    setSource(null);
    setTopic(id);
  }
  async function inspect(key: PassageKey) {
    const ticket = ++previewTicket.current;
    setPreview(null);
    setPreviewError("");
    setPreviewLoading(true);
    try {
      const result = await apiRequest<{
        title: string;
        text: string;
        locator?: string;
        reviewRequired?: boolean;
      }>("/knowledge/passage", {
        method: "POST",
        body: JSON.stringify({
          chunkId: key.chunk_id,
          documentId: key.document_id,
          revision: key.revision,
        }),
      });
      if (previewTicket.current === ticket) setPreview(result);
    } catch (err) {
      if (previewTicket.current === ticket)
        setPreviewError(
          err instanceof Error
            ? err.message
            : "Passage unavailable; reload the map.",
        );
    } finally {
      if (previewTicket.current === ticket) setPreviewLoading(false);
    }
  }
  const chart = useMemo(() => {
    const books = graph?.sources.slice(0, 10) ?? [];
    const ids = new Set(books.map((b) => b.id));
    const visibleTopics = (graph?.topics ?? [])
      .filter((t) =>
        graph?.edges.some((e) => ids.has(e.source_id) && e.topic_id === t.id),
      )
      .slice(0, 10);
    return {
      books,
      topics: visibleTopics,
      height: Math.max(
        240,
        Math.max(books.length, visibleTopics.length) * 56 + 40,
      ),
    };
  }, [graph]);
  const selected = graph?.sources.find((s) => s.id === source);
  const topicLabel = graph?.topics.find((t) => t.id === topic)?.label;

  return (
    <AppLayout>
      <div className="collection-workspace space-y-5">
        <KnowledgeNavigation active="graph" />
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">
              Connections across your library
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Follow a topic to discover other books and files, then inspect the
              source passages.
            </p>
          </div>
          <button
            className="rounded-lg border border-border px-3 py-2 text-sm"
            onClick={() => {
              setOffset(0);
              setQuery("");
              setSearch("");
              setTopic(null);
              setSource(null);
            }}
          >
            All topics
          </button>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setOffset(0);
            setSource(null);
            setTopic(null);
            setSearch(query.trim());
          }}
        >
          <input
            aria-label="Search books or topics"
            placeholder="Search a book or topic…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={200}
            className="min-w-0 flex-1 rounded-xl border border-border bg-transparent px-4 py-3"
          />
          <button className="rounded-xl bg-primary px-5 py-2 text-primary-foreground">
            Search
          </button>
        </form>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive p-4 text-sm"
          >
            {error}
          </p>
        )}
        {loading && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading permitted source connections…
          </p>
        )}
        {!loading && graph && !graph.ready && (
          <p className="rounded-xl border border-border p-5">
            The topic map has not been built yet. Ordinary source search remains
            available.
          </p>
        )}
        {!loading && graph?.ready && (
          <>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>
                {graph.summary.eligible_sources?.toLocaleString()} accessible
                references
              </span>
              <span>
                {graph.summary.mapped_sources?.toLocaleString()} with
                starter-topic links
              </span>
              <span>
                {graph.summary.unmapped_sources?.toLocaleString()} without
                starter-topic links
              </span>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
              <strong>
                {selected ? selected.title : topicLabel || "Library overview"}
              </strong>
              <p className="mt-1 text-muted-foreground">
                Lines mean that a source passage mentions a topic. Related
                topics are navigation hints; they do not mean authors agree.
                This is a bounded view, not every connection in the library.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
              <aside className="max-h-[320px] space-y-2 overflow-y-auto lg:max-h-[680px]">
                <h3 className="text-sm font-semibold">
                  Topics · {graph.topics.length}
                </h3>
                {graph.topics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => followTopic(t.id)}
                    className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${topic === t.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                  >
                    <span>{t.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t.domain} · {t.sources} references
                    </span>
                  </button>
                ))}
                {!graph.topics.length && (
                  <p className="text-sm text-muted-foreground">
                    No starter topic links in this selection.
                  </p>
                )}
              </aside>
              <section className="min-w-0 space-y-4">
                <div className="overflow-x-auto rounded-xl border border-border p-3">
                  <svg
                    role="group"
                    aria-label="Topic and source connection map"
                    viewBox={`0 0 900 ${chart.height}`}
                    className="min-w-[650px] w-full"
                    style={{ maxHeight: 680 }}
                  >
                    <text x="20" y="18" fill="currentColor" fontSize="12">
                      TOPICS — select to find other sources
                    </text>
                    <text x="470" y="18" fill="currentColor" fontSize="12">
                      BOOKS AND FILES — select to explore
                    </text>
                    {graph.edges.map((e, i) => {
                      const a = chart.topics.findIndex(
                          (t) => t.id === e.topic_id,
                        ),
                        b = chart.books.findIndex((s) => s.id === e.source_id);
                      return a >= 0 && b >= 0 ? (
                        <path
                          key={`${e.chunk_id}-${i}`}
                          d={`M 300 ${a * 56 + 48} C 380 ${a * 56 + 48}, 380 ${b * 56 + 48}, 470 ${b * 56 + 48}`}
                          fill="none"
                          stroke="currentColor"
                          opacity="0.14"
                        />
                      ) : null;
                    })}
                    {chart.topics.map((t, i) => (
                      <g
                        key={t.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Follow topic ${t.label}`}
                        onClick={() => followTopic(t.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            followTopic(t.id);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <rect
                          x="10"
                          y={i * 56 + 30}
                          width="290"
                          height="38"
                          rx="9"
                          fill={topic === t.id ? "#335a63" : "#263b40"}
                        />
                        <text
                          x="24"
                          y={i * 56 + 54}
                          fill="#edf3f3"
                          fontSize="13"
                        >
                          {t.label}
                        </text>
                      </g>
                    ))}
                    {chart.books.map((s, i) => (
                      <g
                        key={s.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Explore source ${s.title}`}
                        onClick={() => {
                          setOffset(0);
                          setSource(s.id);
                          setTopic(null);
                          setSearch("");
                          setQuery("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOffset(0);
                            setSource(s.id);
                            setTopic(null);
                            setSearch("");
                            setQuery("");
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <title>{s.title}</title>
                        <rect
                          x="470"
                          y={i * 56 + 30}
                          width="420"
                          height="38"
                          rx="9"
                          fill="#333738"
                        />
                        <text
                          x="484"
                          y={i * 56 + 54}
                          fill="#edf3f3"
                          fontSize="12"
                        >
                          {s.title.length > 56
                            ? s.title.slice(0, 55) + "…"
                            : s.title}
                        </text>
                      </g>
                    ))}
                  </svg>
                  <p className="text-xs text-muted-foreground">
                    Map shows up to 10 sources and 10 topics. The source list
                    below shows up to 20; search or follow topics to explore
                    more.
                  </p>
                </div>
                {!!topic && (
                  <div className="flex flex-wrap gap-2">
                    {graph.related_topics
                      .filter((e) => e.source === topic || e.target === topic)
                      .map((e) => {
                        const id = e.source === topic ? e.target : e.source;
                        return (
                          <button
                            key={id}
                            className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
                            onClick={() => followTopic(id)}
                          >
                            Related:{" "}
                            {graph.topics.find((t) => t.id === id)?.label ?? id}
                          </button>
                        );
                      })}
                  </div>
                )}
                <h3 className="text-sm font-semibold">
                  Sources · {graph.sources.length}
                  {graph.summary.limited
                    ? " shown — refine or use the next page"
                    : ""}
                </h3>
                {graph.sources.map((s) => (
                  <article
                    key={s.id}
                    className="rounded-xl border border-border p-4"
                  >
                    <button
                      onClick={() => {
                        setOffset(0);
                        setSource(s.id);
                        setTopic(null);
                        setSearch("");
                        setQuery("");
                      }}
                      className="text-left font-medium hover:underline"
                    >
                      {s.title}
                    </button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.author || "Author not verified"} ·{" "}
                      {s.passages.toLocaleString()} indexed passages
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {graph.edges
                        .filter((e) => e.source_id === s.id)
                        .map((e) => (
                          <button
                            key={e.topic_id}
                            title={e.anchor}
                            onClick={() => inspect(e)}
                            className="rounded-lg bg-muted px-3 py-1.5 text-xs hover:underline"
                          >
                            {graph.topics.find((t) => t.id === e.topic_id)
                              ?.label ?? e.topic_id}
                            {e.page_start ? ` · PDF p${e.page_start}` : ""} ↗
                          </button>
                        ))}
                    </div>
                    {s.sample && (
                      <button
                        className="mt-3 text-xs text-muted-foreground underline"
                        onClick={() => inspect(s.sample!)}
                      >
                        Read an original indexed passage
                      </button>
                    )}
                  </article>
                ))}
                <div className="flex items-center justify-between gap-3 text-sm">
                  <button
                    disabled={offset === 0}
                    className="rounded-lg border border-border px-3 py-2 disabled:opacity-40"
                    onClick={() => setOffset(Math.max(0, offset - 20))}
                  >
                    Previous sources
                  </button>
                  <span className="text-muted-foreground">
                    {graph.summary.matched_sources?.toLocaleString()} matching
                    references · page {Math.floor(offset / 20) + 1}
                  </span>
                  <button
                    disabled={!graph.summary.limited}
                    className="rounded-lg border border-border px-3 py-2 disabled:opacity-40"
                    onClick={() => setOffset(offset + 20)}
                  >
                    Next sources
                  </button>
                </div>
                {!graph.sources.length && (
                  <p className="text-sm text-muted-foreground">
                    No permitted sources match this selection.
                  </p>
                )}
              </section>
            </div>
          </>
        )}
        {(preview || previewLoading || previewError) && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="presentation"
            onClick={closePreview}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-label="Original source passage"
              onKeyDown={(e) => {
                if (e.key === "Escape") closePreview();
                if (e.key === "Tab") {
                  e.preventDefault();
                  e.currentTarget.querySelector("button")?.focus();
                }
              }}
              className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border bg-background p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between gap-4">
                <h3 className="font-semibold">
                  {preview?.title || "Source passage"}
                </h3>
                <button
                  autoFocus
                  aria-label="Close passage"
                  onClick={closePreview}
                >
                  Close
                </button>
              </div>
              {previewLoading && (
                <p role="status">Loading original indexed passage…</p>
              )}
              {previewError && <p role="alert">{previewError}</p>}
              {preview && (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {preview.locator}
                  </p>
                  {preview.reviewRequired && (
                    <p className="mt-2 text-sm">
                      Extraction requires verification against the original
                      page, especially formulas and diagrams.
                    </p>
                  )}
                  <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-7">
                    {preview.text}
                  </pre>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
