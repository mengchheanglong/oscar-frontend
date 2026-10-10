"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { AgentRun, agentRuns } from "@/lib/agent-runs";
import { MarkdownContent } from "@/components/markdown-content";
import { ProposalReviewDialog } from "./proposal-review-dialog";

const isActive = (r: AgentRun) =>
  r.status === "QUEUED" || r.status === "RUNNING";
const toolLabels: Record<string, string> = {
  search_project_evidence: "Retrieved project evidence",
  calculate_pricing: "Calculated pricing scenario",
  request_task_review: "Prepared task for review",
  list_local_folders: "Listed source folders",
  list_local_files: "Found local files",
  search_local_files: "Searched local files",
  read_local_file: "Read local file",
};

export function AgentRunsPanel({
  projectId,
  projectLabel,
  onClose,
}: {
  projectId: string;
  projectLabel?: string;
  onClose: () => void;
}) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<unknown>(null);
  const request = useRef<{
    prompt: string;
    key: string;
    retrySource?: string;
  } | null>(null);
  const live = useRef(true);
  const mutationEpoch = useRef(0);
  const selected = runs.find((r) => r.id === selectedId) || runs[0];
  const active = runs.some(isActive);

  useEffect(() => {
    live.current = true;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      const epoch = mutationEpoch.current;
      try {
        const [status, latest] = await Promise.all([
          agentRuns.status(projectId),
          agentRuns.list(projectId),
        ]);
        if (disposed || !live.current) return;
        setAvailable(status.available);
        if (epoch === mutationEpoch.current) setRuns(latest);
        setLoading(false);
        timer = setTimeout(() => {
          void refresh();
        }, 1500);
      } catch (e) {
        if (!disposed && live.current) {
          setError(e instanceof Error ? e.message : "Could not load runs.");
          setLoading(false);
        }
      }
    };
    void refresh();
    return () => {
      live.current = false;
      disposed = true;
      clearTimeout(timer);
    };
  }, [projectId]);

  async function start(text: string, retrySource?: string) {
    if (busy || !text.trim()) return;
    setBusy(true);
    mutationEpoch.current++;
    setError(null);
    if (
      !request.current ||
      request.current.prompt !== text.trim() ||
      request.current.retrySource !== retrySource
    )
      request.current = {
        prompt: text.trim(),
        key: crypto.randomUUID(),
        retrySource,
      };
    try {
      const r = await agentRuns.create(
        projectId,
        request.current.prompt,
        request.current.key,
      );
      if (!live.current) return;
      mutationEpoch.current++;
      setRuns((previous) => [
        r,
        ...previous.filter((item) => item.id !== r.id),
      ]);
      setSelectedId(r.id);
      request.current = null;
    } catch (e) {
      if (live.current)
        setError(e instanceof Error ? e.message : "Could not start run.");
    } finally {
      if (live.current) setBusy(false);
    }
  }

  async function cancel(r: AgentRun) {
    setBusy(true);
    mutationEpoch.current++;
    setError(null);
    try {
      const updated = await agentRuns.cancel(projectId, r.id);
      mutationEpoch.current++;
      if (live.current)
        setRuns((previous) =>
          previous.map((item) => (item.id === updated.id ? updated : item)),
        );
    } catch (e) {
      if (live.current)
        setError(e instanceof Error ? e.message : "Could not cancel run.");
    } finally {
      if (live.current) setBusy(false);
    }
  }

  async function review(id: string) {
    setBusy(true);
    setError(null);
    try {
      const p = await api.ai.getProposal(projectId, id);
      if (live.current) setProposal(p);
    } catch (e) {
      if (live.current)
        setError(e instanceof Error ? e.message : "Could not load proposal.");
    } finally {
      if (live.current) setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/30 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-runs-title"
    >
      <section className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b p-4">
          <div>
            <h2 id="agent-runs-title" className="font-semibold">
              Agent work
            </h2>
            <p className="text-sm text-slate-500">
              {projectLabel || "Current project"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close agent work"
            className="rounded border px-3 py-1"
          >
            Close
          </button>
        </header>
        <div className="overflow-y-auto p-4">
          {error && (
            <p role="alert" className="mb-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {loading ? (
            <p>Loading agent work…</p>
          ) : (
            !available && (
              <p className="mb-3 rounded bg-amber-50 p-3 text-sm">
                Hermes is not configured on this server. Previous work remains
                available.
              </p>
            )
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void start(prompt);
            }}
            className="space-y-2"
          >
            <label htmlFor="agent-work-prompt" className="text-sm font-medium">
              What should the copilot work on?
            </label>
            <textarea
              id="agent-work-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={4000}
              rows={3}
              className="w-full rounded-lg border p-3 text-sm"
              placeholder="Compare pricing scenarios using our project assumptions and produce a report."
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={
                  loading || !available || busy || active || !prompt.trim()
                }
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                Start work
              </button>
              <p className="text-xs text-slate-500">
                Project evidence, connected folders and pricing calculations.
                Record changes require review.
              </p>
            </div>
          </form>
          <div className="mt-6 grid gap-4 md:grid-cols-[220px_1fr]">
            <nav aria-label="Agent run history" className="space-y-2">
              {runs.length === 0 && !loading && (
                <p className="text-sm text-slate-500">No agent runs yet.</p>
              )}
              {runs.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`block w-full rounded-lg border p-3 text-left text-sm ${selected?.id === r.id ? "border-slate-800 bg-slate-50" : ""}`}
                >
                  <span className="block truncate">{r.prompt}</span>
                  <span className="text-xs text-slate-500">
                    {r.status} · {new Date(r.createdAt).toLocaleString()}
                  </span>
                </button>
              ))}
            </nav>
            {selected && (
              <article className="min-w-0 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{selected.status}</h3>
                  {isActive(selected) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void cancel(selected)}
                      className="rounded border px-3 py-1 text-sm"
                    >
                      Cancel run
                    </button>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {selected.prompt}
                </p>
                <ol
                  aria-label="Run progress"
                  className="my-3 space-y-1 text-xs text-slate-500"
                >
                  {selected.events.map((e, i) => (
                    <li key={i}>{toolLabels[e.name] || e.name}</li>
                  ))}
                </ol>
                {selected.status === "FAILED" && (
                  <p role="status" className="text-sm text-red-700">
                    Run failed ({selected.errorCode || "UNKNOWN"}). No work
                    artifact was saved.
                  </p>
                )}
                {selected.status === "CANCELLED" && (
                  <p className="text-sm text-slate-500">Run cancelled.</p>
                )}
                {(selected.status === "FAILED" ||
                  selected.status === "CANCELLED") && (
                  <button
                    type="button"
                    disabled={!available || active || busy}
                    onClick={() => void start(selected.prompt, selected.id)}
                    className="mt-3 rounded border px-3 py-1 text-sm"
                  >
                    Retry as a new run
                  </button>
                )}
                {selected.artifact && (
                  <div className="mt-4">
                    <MarkdownContent content={selected.artifact} />
                  </div>
                )}
                {selected.evidence.length > 0 && (
                  <details className="mt-4 text-xs">
                    <summary>
                      Retrieved sources ({selected.evidence.length})
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {selected.evidence.map((e) => (
                        <li key={e.chunkId}>
                          {e.title} ·{" "}
                          {e.revision === 0
                            ? "File version"
                            : `revision ${e.revision}`}{" "}
                          · {e.locator}
                          <span className="block break-all text-slate-400">
                            {e.chunkId}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {selected.proposalId && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void review(selected.proposalId!)}
                    className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
                  >
                    Review proposed task
                  </button>
                )}
              </article>
            )}
          </div>
        </div>
      </section>
      {proposal != null && (
        <ProposalReviewDialog
          isOpen
          onClose={() => setProposal(null)}
          proposal={proposal}
          projectId={projectId}
          onConfirmed={() => setProposal(null)}
          onRejected={() => setProposal(null)}
        />
      )}
    </div>
  );
}
