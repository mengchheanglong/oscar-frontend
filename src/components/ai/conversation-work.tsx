"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { agentRuns, AgentRun } from "@/lib/agent-runs";
import { api } from "@/lib/api";
import { ProposalReviewDialog } from "./proposal-review-dialog";

export const runActive = (run: AgentRun) =>
  ["QUEUED", "RUNNING"].includes(run.status);
export function useConversationWork(
  projectId: string | undefined,
  conversationId: string | undefined,
  changed: () => void,
) {
  const scope = `${projectId}:${conversationId}`;
  const latestScope = useRef(scope);
  latestScope.current = scope;
  const onChanged = useRef(changed);
  onChanged.current = changed;
  const [state, setState] = useState<{
    scope: string;
    runs: AgentRun[];
    available: boolean;
    loading: boolean;
    error: string | null;
  }>({ scope, runs: [], available: false, loading: true, error: null });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let signature: string | undefined;
    if (!projectId) {
      setState({
        scope,
        runs: [],
        available: false,
        loading: false,
        error: null,
      });
      return;
    }
    const poll = async () => {
      try {
        const [status, runs] = await Promise.all([
          agentRuns.status(projectId),
          conversationId
            ? agentRuns.list(projectId, conversationId)
            : Promise.resolve([]),
        ]);
        if (disposed) return;
        const next = runs.map((r) => `${r.id}:${r.status}`).join();
        setState({
          scope,
          runs,
          available: status.available,
          loading: false,
          error: null,
        });
        if (signature !== next && runs.length) onChanged.current();
        signature = next;
        timer = setTimeout(poll, runs.some(runActive) ? 1200 : 5000);
      } catch {
        if (disposed) return;
        setState((previous) => ({
          scope,
          runs: previous.scope === scope ? previous.runs : [],
          available: false,
          loading: false,
          error: "Could not refresh Hermes work. Retrying…",
        }));
        timer = setTimeout(poll, 3000);
      }
    };
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [projectId, conversationId, scope, revision]);
  const record = (run: AgentRun) => {
    const target = `${run.projectId}:${run.conversationId}`;
    if (latestScope.current !== target) return;
    setState((previous) => ({
      scope: target,
      runs: [
        run,
        ...(previous.scope === target ? previous.runs : []).filter(
          (r) => r.id !== run.id,
        ),
      ],
      available: true,
      loading: false,
      error: null,
    }));
    refresh();
  };
  const visible =
    state.scope === scope
      ? state
      : { scope, runs: [], available: false, loading: true, error: null };
  return { ...visible, record, refresh, active: visible.runs.some(runActive) };
}

const labels: Record<string, string> = {
  search_project_evidence: "Searching project evidence",
  calculate_pricing: "Calculating a pricing scenario",
  request_task_review: "Preparing a task for review",
  list_local_folders: "Finding source folders",
  list_local_files: "Listing files",
  search_local_files: "Searching files",
  read_local_file: "Reading a file",
};
export function ConversationWorkStatus({
  run,
  onChanged,
  onRetry,
  canRetry,
}: {
  run: AgentRun;
  onChanged: () => void;
  onRetry: (prompt: string) => void;
  canRetry: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<any>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await agentRuns.cancel(run.projectId, run.id);
      if (mounted.current) onChanged();
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "Could not cancel work.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function review() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.ai.getProposal(run.projectId, run.proposalId!);
      if (mounted.current) setProposal(result);
    } catch {
      if (mounted.current) setError("Could not load the proposed changes.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section
      aria-label="Hermes work"
      className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
    >
      <div className="flex items-center justify-between gap-3">
        <span role="status" className="font-medium text-slate-700">
          Hermes · {run.status.toLowerCase()}
        </span>
        {runActive(run) && (
          <button
            disabled={busy}
            onClick={cancel}
            className="rounded border bg-white px-2 py-1"
          >
            Cancel work
          </button>
        )}
      </div>
      {!!run.events.length && (
        <details className="mt-2 text-slate-500" open={runActive(run)}>
          <summary className="cursor-pointer">
            Work progress · {run.events.length} steps
          </summary>
          <ol className="mt-2 space-y-1">
            {run.events.map((event, index) => (
              <li key={index}>{labels[event.name] || event.name}</li>
            ))}
          </ol>
        </details>
      )}
      {run.status === "FAILED" && (
        <p className="mt-2 text-red-700">
          Work could not finish ({run.errorCode || "unavailable"}).
        </p>
      )}
      {["FAILED", "CANCELLED"].includes(run.status) && (
        <button
          disabled={!canRetry || busy}
          onClick={() => onRetry(run.prompt)}
          className="mt-2 underline disabled:opacity-50"
        >
          Review request and retry
        </button>
      )}
      {!!run.evidence.length && (
        <details className="mt-2 text-slate-500">
          <summary className="cursor-pointer">
            Sources used · {run.evidence.length}
          </summary>
          <ul className="mt-2 space-y-1">
            {run.evidence.map((e) => (
              <li key={e.chunkId}>
                {e.title} · {e.locator} · revision {e.revision}
                <code className="block break-all">{e.chunkId}</code>
              </li>
            ))}
          </ul>
        </details>
      )}
      {run.proposalId && (
        <button
          disabled={busy}
          onClick={review}
          className="mt-2 rounded border bg-white px-2 py-1"
        >
          Review proposed changes
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-red-700">
          {error}
        </p>
      )}
      <ProposalReviewDialog
        isOpen={!!proposal}
        proposal={proposal}
        projectId={run.projectId}
        onClose={() => setProposal(null)}
        onConfirmed={() => {
          setProposal(null);
          onChanged();
        }}
      />
    </section>
  );
}
