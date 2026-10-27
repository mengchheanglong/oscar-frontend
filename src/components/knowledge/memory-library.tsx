"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { SavedMemorySettings } from "@/components/assistant/saved-memory-settings";
import { KnowledgeNavigation } from "./knowledge-navigation";
import { CollectionEmptyState } from "@/components/collection-empty-state";
import { Modal } from "@/components/ui/modal";
import { GoalSelect } from "@/components/goal-select";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Brain,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Search,
  Trash2,
  Sparkles,
} from "lucide-react";

export interface MavisMemory {
  id: string;
  scopeType: "PERSONAL" | "PROJECT" | "GOAL";
  type: string;
  status: "PROPOSED" | "APPROVED" | "REJECTED" | "SUPERSEDED";
  userId: string;
  projectId?: string | null;
  goalId?: string | null;
  statement: string;
  rationale?: string | null;
  sourcePlatform: string;
  sourceType: string;
  sourceId?: string | null;
  sourceMetadata?: Record<string, any> | null;
  validFrom?: string | null;
  validUntil?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  supersedesId?: string | null;
  supersededById?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

function MemoriesWorkspace() {
  const { user, currentProject, projects } = useAuth();
  const canWriteProject =
    !!currentProject &&
    currentProject.status !== "ARCHIVED" &&
    (user?.systemRole === "ADMIN" ||
      ["OWNER", "MANAGER", "CONTRIBUTOR"].includes(
        currentProject.currentUserRole || "",
      ));
  const canEdit = (memory: MavisMemory) =>
    !memory.projectId
      ? memory.userId === user?.id
      : projects.some(
          (project) =>
            project.id === memory.projectId &&
            project.status !== "ARCHIVED" &&
            (user?.systemRole === "ADMIN" ||
              ["OWNER", "MANAGER", "CONTRIBUTOR"].includes(
                project.currentUserRole || "",
              )),
        );
  const { showToast } = useToast();

  const [memories, setMemories] = useState<MavisMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [scopeFilter, setScopeFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [proposeStatement, setProposeStatement] = useState("");
  const [proposeRationale, setProposeRationale] = useState("");
  const [proposeType, setProposeType] = useState("FACT");
  const [proposeScope, setProposeScope] = useState<
    "PERSONAL" | "PROJECT" | "GOAL"
  >(canWriteProject ? "PROJECT" : "PERSONAL");
  const [proposeGoalId, setProposeGoalId] = useState("");
  const [proposeSubmitting, setProposeSubmitting] = useState(false);

  // Supersede modal state
  const [supersedeModalOpen, setSupersedeModalOpen] = useState(false);
  const [supersedeTarget, setSupersedeTarget] = useState<MavisMemory | null>(
    null,
  );
  const [supersedeStatement, setSupersedeStatement] = useState("");
  const [supersedeSubmitting, setSupersedeSubmitting] = useState(false);

  // Retrieval tester state
  const [retrievalOpen, setRetrievalOpen] = useState(false);
  const [retrievalQuery, setRetrievalQuery] = useState("");
  const [retrievalLoading, setRetrievalLoading] = useState(false);
  const [retrievalResult, setRetrievalResult] = useState<any | null>(null);

  const fetchMemories = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (scopeFilter !== "ALL") params.scopeType = scopeFilter;
      if (typeFilter !== "ALL") params.type = typeFilter;
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (currentProject?.id) {
        params.projectId = currentProject.id;
      }

      const res = await api.mavis.listMemories(params);
      setMemories(res.items || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load memories", "error");
    } finally {
      setLoading(false);
    }
  }, [
    statusFilter,
    scopeFilter,
    typeFilter,
    searchQuery,
    currentProject?.id,
    showToast,
  ]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleApprove = async (mem: MavisMemory) => {
    try {
      await api.mavis.approve(mem.id, mem.version);
      showToast("Memory approved", "success");
      fetchMemories();
    } catch (err: any) {
      showToast(err.message || "Failed to approve memory", "error");
    }
  };

  const handleReject = async (mem: MavisMemory) => {
    const reason = window.prompt("Reason for rejection (optional):");
    if (reason === null) return;
    try {
      await api.mavis.reject(mem.id, reason, mem.version);
      showToast("Memory rejected", "info");
      fetchMemories();
    } catch (err: any) {
      showToast(err.message || "Failed to reject memory", "error");
    }
  };

  const handleOpenSupersede = (mem: MavisMemory) => {
    setSupersedeTarget(mem);
    setSupersedeStatement(mem.statement);
    setSupersedeModalOpen(true);
  };

  const handleExecuteSupersede = async () => {
    if (!supersedeTarget || !supersedeStatement.trim()) return;
    try {
      setSupersedeSubmitting(true);
      await api.mavis.supersede(
        supersedeTarget.id,
        supersedeStatement.trim(),
        supersedeTarget.version,
      );
      showToast("Memory corrected", "success");
      setSupersedeModalOpen(false);
      setSupersedeTarget(null);
      fetchMemories();
    } catch (err: any) {
      showToast(err.message || "Failed to supersede memory", "error");
    } finally {
      setSupersedeSubmitting(false);
    }
  };

  const handleDelete = async (mem: MavisMemory) => {
    if (!window.confirm("Are you sure you want to delete this memory?")) return;
    try {
      await api.mavis.delete(mem.id, mem.version);
      showToast("Memory deleted", "info");
      fetchMemories();
    } catch (err: any) {
      showToast(err.message || "Failed to delete memory", "error");
    }
  };

  const handleProposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposeStatement.trim() || (proposeScope === "GOAL" && !proposeGoalId))
      return;
    try {
      setProposeSubmitting(true);
      await api.mavis.proposeCandidate({
        statement: proposeStatement.trim(),
        rationale: proposeRationale.trim() || undefined,
        type: proposeType,
        scopeType: proposeScope,
        projectId: proposeScope !== "PERSONAL" ? currentProject?.id : undefined,
        goalId: proposeScope === "GOAL" ? proposeGoalId : undefined,
      });
      showToast("Memory saved for review", "success");
      setProposeModalOpen(false);
      setProposeStatement("");
      setProposeRationale("");
      fetchMemories();
    } catch (err: any) {
      showToast(err.message || "Failed to propose candidate", "error");
    } finally {
      setProposeSubmitting(false);
    }
  };

  const handleExecuteRetrieval = async () => {
    if (!retrievalQuery.trim()) return;
    try {
      setRetrievalLoading(true);
      const res = await api.mavis.retrieveContext({
        query: retrievalQuery.trim(),
        projectId: currentProject?.id,
      });
      setRetrievalResult(res);
    } catch (err: any) {
      showToast(err.message || "Context retrieval failed", "error");
    } finally {
      setRetrievalLoading(false);
    }
  };

  const candidateCount = useMemo(
    () => memories.filter((m) => m.status === "PROPOSED").length,
    [memories],
  );

  return (
    <AppLayout>
      <div className="collection-workspace space-y-6">
        <KnowledgeNavigation active="memories" />
        {currentProject && (
          <details className="rounded-xl border border-border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Reviewed chat memories
            </summary>
            <div className="mt-4">
              <SavedMemorySettings
                key={currentProject.id}
                projectId={currentProject.id}
                projectLabel={currentProject.name}
                draft={null}
              />
            </div>
          </details>
        )}

        {/* Header */}
        <div className="collection-header">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Memories
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review what OSCAR remembers, inspect its sources, and correct
              outdated information.
            </p>
          </div>
          <div className="collection-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRetrievalOpen(!retrievalOpen)}
              className="collection-action"
              aria-expanded={retrievalOpen}
            >
              <Sparkles className="w-4 h-4" />
              {retrievalOpen ? "Close recall" : "Test recall"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setProposeScope(canWriteProject ? "PROJECT" : "PERSONAL");
                setProposeGoalId("");
                setProposeModalOpen(true);
              }}
              className="collection-action collection-action-primary"
            >
              <Plus className="w-4 h-4" />
              Add memory
            </Button>
          </div>
        </div>

        {/* Retrieval Tester Box */}
        {retrievalOpen && (
          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                Test recall
              </h2>
              <span className="text-xs text-muted-foreground">
                See which memories and sources match a question.
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="What did we decide about the database?"
                value={retrievalQuery}
                onChange={(e) => setRetrievalQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleExecuteRetrieval()}
                className="flex-1"
              />
              <Button
                onClick={handleExecuteRetrieval}
                disabled={retrievalLoading || !retrievalQuery.trim()}
                className="collection-action-primary"
              >
                {retrievalLoading ? "Retrieving..." : "Retrieve"}
              </Button>
            </div>
            {retrievalResult && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-background border border-border">
                    <div className="font-semibold text-muted-foreground">
                      Approved Memories
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {retrievalResult.approvedMemories?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-background border border-border">
                    <div className="font-semibold text-muted-foreground">
                      Historical Conversations
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {retrievalResult.historicalConversations?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-background border border-border">
                    <div className="font-semibold text-foreground">
                      Project Sources
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {retrievalResult.projectSources?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-background border border-border">
                    <div className="font-semibold text-muted-foreground">
                      Raw Execution Runs
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {retrievalResult.rawExecutionResults?.length || 0}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {retrievalResult.approvedMemories?.map(
                    (memory: MavisMemory) => (
                      <article
                        key={memory.id}
                        className="rounded-xl border border-border p-3"
                      >
                        <p className="text-sm">{memory.statement}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Reviewed memory ·{" "}
                          {memory.type.toLowerCase().replaceAll("_", " ")}
                        </p>
                      </article>
                    ),
                  )}
                </div>
                <details className="rounded-xl border border-border p-3 text-sm">
                  <summary className="cursor-pointer">
                    Context and source details
                  </summary>
                  <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
                    {retrievalResult.formattedContext}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Filter Controls */}
        <div className="space-y-4">
          {/* Status Tabs */}
          <div
            className="collection-status-tabs"
            role="group"
            aria-label="Memory status"
          >
            {[
              { id: "ALL", label: "All memories" },
              {
                id: "PROPOSED",
                label: `Needs review (${candidateCount})`,
                badge: candidateCount > 0,
              },
              { id: "APPROVED", label: "Approved" },
              { id: "SUPERSEDED", label: "History" },
              { id: "REJECTED", label: "Dismissed" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={statusFilter === tab.id}
                onClick={() => setStatusFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Secondary Filters & Search */}
          <div className="collection-toolbar">
            <select
              aria-label="Memory scope"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="collection-select"
            >
              <option value="ALL">All scopes</option>
              <option value="PERSONAL">Personal</option>
              <option value="PROJECT">Project</option>
              <option value="GOAL">Goal</option>
            </select>

            <select
              aria-label="Memory type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="collection-select"
            >
              <option value="ALL">All types</option>
              <option value="DECISION">Decision</option>
              <option value="PREFERENCE">Preference</option>
              <option value="FACT">Fact</option>
              <option value="LESSON">Lesson</option>
              <option value="HYPOTHESIS">Hypothesis</option>
              <option value="GOAL_STRATEGY">Goal Strategy</option>
              <option value="OBSERVATION">Observation</option>
              <option value="PROCEDURAL">Procedural</option>
            </select>

            <div className="collection-search">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                aria-label="Filter memories"
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Memory Items List */}
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Loading memories…
          </div>
        ) : memories.length === 0 ? (
          <CollectionEmptyState
            icon={<Brain />}
            title={
              statusFilter === "ALL" &&
              scopeFilter === "ALL" &&
              typeFilter === "ALL" &&
              !searchQuery
                ? "No memories yet"
                : "No matching memories"
            }
            description={
              statusFilter === "PROPOSED"
                ? "Memories waiting for your review will appear here."
                : statusFilter !== "ALL" ||
                    scopeFilter !== "ALL" ||
                    typeFilter !== "ALL" ||
                    searchQuery
                  ? "Try another search or adjust your filters."
                  : "Save preferences, facts, and lessons for OSCAR to remember."
            }
          />
        ) : (
          <div className="space-y-4">
            {memories.map((mem) => {
              const isCandidate = mem.status === "PROPOSED";
              const isApproved = mem.status === "APPROVED";
              const isSuperseded = mem.status === "SUPERSEDED";

              return (
                <div
                  key={mem.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isCandidate
                      ? "bg-amber-50/40 dark:bg-amber-950/10 border-amber-300 dark:border-amber-800/60 shadow-sm"
                      : isApproved
                        ? "bg-card border-border hover:border-[var(--ws-soft)]"
                        : "bg-muted/30 border-border opacity-85"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            isCandidate
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300"
                              : isApproved
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300"
                                : isSuperseded
                                  ? "bg-muted text-muted-foreground border border-border"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300"
                          }`}
                        >
                          {mem.status}
                        </span>

                        <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-muted text-foreground border border-border">
                          {mem.type}
                        </span>

                        <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-muted/80 text-muted-foreground border border-border">
                          Scope: {mem.scopeType}
                        </span>

                        {mem.sourcePlatform && (
                          <span className="text-[11px] text-muted-foreground">
                            Origin: {mem.sourcePlatform}/{mem.sourceType}
                          </span>
                        )}
                      </div>

                      {/* Statement */}
                      <p className="text-sm font-medium text-foreground leading-relaxed">
                        {mem.statement}
                      </p>

                      {/* Rationale */}
                      {mem.rationale && (
                        <p className="text-xs text-muted-foreground italic bg-muted/40 p-2.5 rounded-lg border border-border/60">
                          {mem.rationale}
                        </p>
                      )}

                      {/* Provenance & Revision info */}
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1">
                        <span>v{mem.version}</span>
                        {mem.reviewedAt && (
                          <span>
                            Reviewed:{" "}
                            {new Date(mem.reviewedAt).toLocaleDateString()}
                          </span>
                        )}
                        {mem.supersedesId && (
                          <span className="text-purple-600 dark:text-purple-400 font-medium">
                            Supersedes: {mem.supersedesId.slice(0, 8)}...
                          </span>
                        )}
                        {mem.supersededById && (
                          <span className="text-muted-foreground">
                            Superseded by: {mem.supersededById.slice(0, 8)}...
                          </span>
                        )}
                        {mem.validUntil && (
                          <span className="text-amber-600 dark:text-amber-400">
                            Expires:{" "}
                            {new Date(mem.validUntil).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 sm:pt-0 shrink-0">
                      {isCandidate && (
                        <>
                          <Button
                            size="sm"
                            disabled={!canEdit(mem)}
                            onClick={() => handleApprove(mem)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canEdit(mem)}
                            onClick={() => handleReject(mem)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs h-8 gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </Button>
                        </>
                      )}

                      {isApproved && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canEdit(mem)}
                          onClick={() => handleOpenSupersede(mem)}
                          className="text-xs h-8 gap-1.5 text-muted-foreground hover:bg-muted"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Correct
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!canEdit(mem)}
                        aria-label="Delete memory"
                        onClick={() => handleDelete(mem)}
                        className="text-muted-foreground hover:text-rose-600 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Save for review Modal */}
        {proposeModalOpen && (
          <Modal
            label="Add memory"
            onClose={() => setProposeModalOpen(false)}
            busy={proposeSubmitting}
          >
            <div className="w-full max-w-lg p-6 bg-card rounded-2xl border border-border shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Brain className="w-5 h-5 text-muted-foreground" />
                  Add memory
                </h3>
                <button
                  onClick={() => setProposeModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleProposeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    What should OSCAR remember?
                  </label>
                  <textarea
                    required
                    rows={3}
                    maxLength={2000}
                    placeholder="State clearly what was decided, learned, or established..."
                    aria-label="Memory statement"
                    value={proposeStatement}
                    onChange={(e) => setProposeStatement(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-codex-muted"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Type
                    </label>
                    <select
                      aria-label="Memory type"
                      value={proposeType}
                      onChange={(e) => setProposeType(e.target.value)}
                      className="w-full p-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-codex-muted"
                    >
                      <option value="DECISION">DECISION</option>
                      <option value="FACT">FACT</option>
                      <option value="LESSON">LESSON</option>
                      <option value="PREFERENCE">PREFERENCE</option>
                      <option value="HYPOTHESIS">HYPOTHESIS</option>
                      <option value="GOAL_STRATEGY">GOAL_STRATEGY</option>
                      <option value="OBSERVATION">OBSERVATION</option>
                      <option value="PROCEDURAL">PROCEDURAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Scope
                    </label>
                    <select
                      aria-label="Memory scope"
                      value={proposeScope}
                      onChange={(e) => {
                        setProposeScope(e.target.value as any);
                        setProposeGoalId("");
                      }}
                      className="w-full p-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-codex-muted"
                    >
                      <option value="PROJECT" disabled={!canWriteProject}>
                        Project
                        {!currentProject ? " (select a project first)" : ""}
                      </option>
                      <option value="PERSONAL">Personal</option>
                      <option
                        value="GOAL"
                        disabled={!!currentProject && !canWriteProject}
                      >
                        Goal
                      </option>
                    </select>
                  </div>
                </div>

                {proposeScope === "GOAL" && (
                  <GoalSelect
                    projectId={currentProject?.id}
                    value={proposeGoalId}
                    onChange={setProposeGoalId}
                  />
                )}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Rationale / Supporting Context (Optional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={5000}
                    placeholder="Why was this established or observed?"
                    aria-label="Memory rationale"
                    value={proposeRationale}
                    onChange={(e) => setProposeRationale(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-codex-muted"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProposeModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={proposeSubmitting || !proposeStatement.trim()}
                    className="collection-action-primary"
                  >
                    {proposeSubmitting ? "Saving..." : "Save for review"}
                  </Button>
                </div>
              </form>
            </div>
          </Modal>
        )}

        {/* Supersede Modal */}
        {supersedeModalOpen && supersedeTarget && (
          <Modal
            label="Correct memory"
            onClose={() => setSupersedeModalOpen(false)}
            busy={supersedeSubmitting}
          >
            <div className="w-full max-w-lg p-6 bg-card rounded-2xl border border-border shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-muted-foreground" />
                  Correct memory
                </h3>
                <button
                  onClick={() => setSupersedeModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground space-y-1">
                <div className="font-semibold text-foreground">
                  Original Statement:
                </div>
                <div>{supersedeTarget.statement}</div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-foreground">
                  Updated / Corrected Statement
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  aria-label="Corrected memory statement"
                  value={supersedeStatement}
                  onChange={(e) => setSupersedeStatement(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-codex-muted"
                />
                <p className="text-[11px] text-muted-foreground">
                  OSCAR will use the corrected version in future conversations.
                  The previous version stays in history.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSupersedeModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteSupersede}
                  disabled={supersedeSubmitting || !supersedeStatement.trim()}
                  className="collection-action-primary"
                >
                  {supersedeSubmitting ? "Saving..." : "Save correction"}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppLayout>
  );
}

export default function MemoryLibrary() {
  const { user, currentProject } = useAuth();
  return (
    <MemoriesWorkspace key={`${user?.id}:${currentProject?.id || "ALL"}`} />
  );
}
