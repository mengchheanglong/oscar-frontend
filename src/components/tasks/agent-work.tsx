"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { AppLayout } from "@/components/app-layout";
import { agentRuns } from "@/lib/agent-runs";
import { platformHandoffs } from "@/lib/platform-handoffs";
import { loadAgentWork, type WorkItem } from "@/lib/agent-work";
import { TaskNavigation } from "./task-navigation";
import { MarkdownContent } from "@/components/markdown-content";
import { api } from "@/lib/api";
import { ProposalReviewDialog } from "@/components/assistant/proposal-review-dialog";
import { ExecutionReviewForm } from "./execution-review-form";

const labels: Record<string, string> = {
  QUEUED: "Queued",
  DISPATCHING: "Starting",
  RUNNING: "Running",
  WAITING: "Needs attention",
  UNCERTAIN: "Check in agent",
  SUCCEEDED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export function AgentWork() {
  const { projects, currentProject, user, setCurrentProject } = useAuth();
  const router = useRouter();
  const [revision, setRevision] = useState(0);
  const [filter, setFilter] = useState("all");
  const [review, setReview] = useState<{
    scope: string;
    projectId: string;
    proposal: any;
  } | null>(null);
  const [reviewError, setReviewError] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [outcome, setOutcome] = useState<{
    scope: string;
    item: WorkItem;
  } | null>(null);
  const scopes = useMemo(
    () =>
      currentProject
        ? [currentProject]
        : projects.filter((p) => p.status !== "ARCHIVED"),
    [currentProject, projects],
  );
  const scope = `${user?.id}:${scopes.map((p) => p.id).join(",")}`;
  const [state, setState] = useState<{
    scope: string;
    items: WorkItem[];
    failures: string[];
    loading: boolean;
  }>({ scope: "", items: [], failures: [], loading: true });
  const liveScope = useRef(scope);
  liveScope.current = scope;
  useEffect(() => {
    if (!user) return;
    let disposed = false;
    setState({ scope, items: [], failures: [], loading: true });
    setReview(null);
    setReviewError("");
    void loadAgentWork(scopes, agentRuns.list, platformHandoffs.list).then(
      (result) => {
        if (!disposed && liveScope.current === scope)
          setState({ scope, ...result, loading: false });
      },
    );
    return () => {
      disposed = true;
    };
  }, [scope, scopes, revision, user]);
  const visible = state.scope === scope ? state.items : [];
  const loading = state.scope !== scope || state.loading;
  const failures = state.scope === scope ? state.failures : [];
  const items = visible.filter(
    (item) =>
      filter === "all" ||
      (filter === "active" &&
        ["QUEUED", "DISPATCHING", "RUNNING"].includes(item.status)) ||
      (filter === "attention" &&
        ["WAITING", "UNCERTAIN", "FAILED"].includes(item.status)) ||
      (filter === "completed" && item.status === "SUCCEEDED"),
  );
  return (
    <AppLayout>
      <div className="space-y-5 pb-12">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Agent work{" "}
              {currentProject
                ? `in ${currentProject.name}`
                : "across all projects"}
              . Results and review stay linked to the original chat.
            </p>
          </div>
          <button
            type="button"
            className="workspace-pill inline-flex items-center gap-2"
            disabled={loading}
            onClick={() => setRevision((r) => r + 1)}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>
        <TaskNavigation active="agents" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Recent work: up to 30 Hermes runs and 100 handoffs per project.
          </p>
          <label className="text-sm">
            Show{" "}
            <select
              aria-label="Filter agent work"
              className="ml-2 rounded-xl border border-border bg-background px-3 py-2"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All work</option>
              <option value="active">Active</option>
              <option value="attention">Needs attention</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>
        {failures.length > 0 && (
          <p
            role="alert"
            className="rounded-xl border border-border p-4 text-sm"
          >
            Some work could not load: {failures.join(", ")}. Use Refresh to
            retry.
          </p>
        )}
        {reviewError && (
          <p role="alert" className="text-sm">
            {reviewError}
          </p>
        )}
        {loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading agent work…
          </p>
        ) : items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-border p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    {item.agent} · {item.projectName}
                  </p>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs">
                    {labels[item.status] || item.status}
                  </span>
                </div>
                <h2 className="font-medium whitespace-pre-wrap break-words line-clamp-3">
                  {item.prompt}
                </h2>
                {item.notice && (
                  <p className="text-sm text-muted-foreground break-words">
                    {item.notice}
                  </p>
                )}
                {item.artifact && (
                  <details>
                    <summary className="cursor-pointer text-sm">
                      View result
                    </summary>
                    <div className="mt-3">
                      <MarkdownContent content={item.artifact} />
                    </div>
                  </details>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {["SUCCEEDED", "FAILED", "CANCELLED"].includes(
                    item.status,
                  ) && (
                    <button
                      className="workspace-pill text-sm"
                      onClick={() => setOutcome({ scope, item })}
                    >
                      Review outcome
                    </button>
                  )}
                  <time
                    dateTime={item.updatedAt}
                    className="text-xs text-muted-foreground"
                  >
                    {new Date(item.updatedAt).toLocaleString()}
                  </time>
                  {item.proposalId && (
                    <button
                      type="button"
                      className="workspace-pill"
                      disabled={reviewBusy}
                      onClick={async () => {
                        setReviewBusy(true);
                        setReviewError("");
                        const requestScope = scope;
                        try {
                          const proposal = await api.assistant.getProposal(
                            item.projectId,
                            item.proposalId!,
                          );
                          if (liveScope.current === requestScope)
                            setReview({
                              scope: requestScope,
                              projectId: item.projectId,
                              proposal,
                            });
                        } catch {
                          if (liveScope.current === requestScope)
                            setReviewError(
                              "Could not load the proposed changes. Please try again.",
                            );
                        } finally {
                          setReviewBusy(false);
                        }
                      }}
                    >
                      Review draft
                    </button>
                  )}
                  {item.conversationId && (
                    <button
                      type="button"
                      className="workspace-pill inline-flex items-center gap-1"
                      onClick={() => {
                        const project = projects.find(
                          (p) => p.id === item.projectId,
                        );
                        if (!project) return;
                        setCurrentProject(project);
                        router.push(
                          `/assistant?conversation=${encodeURIComponent(item.conversationId!)}`,
                        );
                      }}
                    >
                      Open chat & review <ArrowUpRight size={14} />
                    </button>
                  )}
                </div>
                {item.status === "WAITING" && (
                  <p className="text-xs text-muted-foreground">
                    Open the chat to inspect the request. Approvals and agent
                    input remain in the connected platform.
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <section className="rounded-2xl border border-border p-8 text-center space-y-2">
            <h2 className="font-medium">
              {visible.length
                ? "No work matches this filter"
                : failures.length
                  ? "Work is unavailable"
                  : "No agent work yet"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {visible.length
                ? "Choose another filter to see recent work."
                : "Start a chat and delegate a task to Hermes, T3 Code, or Paperclip."}
            </p>
            <Link href="/assistant" className="inline-block text-sm underline">
              Open chat
            </Link>
          </section>
        )}
      </div>
      {review && review.scope === scope && (
        <ProposalReviewDialog
          isOpen
          proposal={review.proposal}
          projectId={review.projectId}
          onClose={() => setReview(null)}
          onConfirmed={() => {
            setReview(null);
            setRevision((r) => r + 1);
          }}
          onRejected={() => {
            setReview(null);
            setRevision((r) => r + 1);
          }}
        />
      )}
      {outcome && outcome.scope === scope && (
        <ExecutionReviewForm
          key={outcome.item.id}
          platform={
            outcome.item.agent === "Hermes"
              ? "hermes"
              : outcome.item.agent === "Paperclip"
                ? "paperclip"
                : "t3"
          }
          runId={outcome.item.id.split(":").at(-1)!}
          status={outcome.item.status}
          onClose={() => setOutcome(null)}
        />
      )}
    </AppLayout>
  );
}
