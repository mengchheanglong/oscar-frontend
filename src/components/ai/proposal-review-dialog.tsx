"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/context/toast-context";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  X,
} from "lucide-react";

interface ProposalReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: any;
  projectId: string;
  onConfirmed: (resultRecordIds: any[]) => void;
  onRejected?: () => void;
}

export function ProposalReviewDialog({
  isOpen,
  onClose,
  proposal,
  projectId,
  onConfirmed,
  onRejected,
}: ProposalReviewDialogProps) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedResults, setConfirmedResults] = useState<any[] | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const savedDraft = useRef<{ version: number; json: string } | null>(null);
  const confirmation = useRef<{ payload: string; key: string } | null>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      api.projects
        .getMembers(projectId)
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          setMembers(list);
        })
        .catch(() => setMembers([]));
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (proposal && proposal.draftJson) {
      setDraft(JSON.parse(JSON.stringify(proposal.draftJson)));
      setConfirmedResults(null);
      setErrorMsg(null);
      savedDraft.current = {
        version: proposal.version,
        json: JSON.stringify(proposal.draftJson),
      };
      confirmation.current = null;

      // Default select all items
      const ids = new Set<string>();
      if (
        proposal.draftJson.type === "CREATE_TASKS" &&
        proposal.draftJson.items
      ) {
        proposal.draftJson.items.forEach((item: any) => ids.add(item.itemId));
      }
      setSelectedIds(ids);
    }
  }, [proposal]);

  if (!isOpen || !proposal || !draft) return null;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    const ids = new Set<string>();
    if (draft.type === "CREATE_TASKS" && draft.items) {
      draft.items.forEach((item: any) => ids.add(item.itemId));
    }
    setSelectedIds(ids);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleUpdateItem = (
    type: string,
    itemId: string,
    field: string,
    value: any,
  ) => {
    const updated = { ...draft };
    if (type === "task" && updated.items) {
      const idx = updated.items.findIndex((i: any) => i.itemId === itemId);
      if (idx >= 0) updated.items[idx][field] = value;
    }
    setDraft(updated);
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) {
      setErrorMsg("Please select at least one task to confirm.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      let currentVersion = savedDraft.current?.version ?? proposal.version;
      const isDirty = JSON.stringify(draft) !== savedDraft.current?.json;
      if (isDirty) {
        const updated = await api.ai.updateProposal(projectId, proposal.id, {
          version: currentVersion,
          draftJson: draft,
        });
        currentVersion = updated.version;
        savedDraft.current = {
          version: updated.version,
          json: JSON.stringify(draft),
        };
      }

      // Confirm with current version
      const payload = {
        version: currentVersion,
        selectedItemIds: Array.from(selectedIds),
      };
      const encoded = JSON.stringify(payload);
      if (confirmation.current?.payload !== encoded) {
        confirmation.current = { payload: encoded, key: crypto.randomUUID() };
      }
      const res = await api.ai.confirmProposal(
        projectId,
        proposal.id,
        payload,
        confirmation.current.key,
      );

      setConfirmedResults(res.resultRecordIds);
      showToast(
        "AI proposal successfully confirmed! Records created.",
        "success",
      );
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to confirm proposal");
      showToast(err.message || "Confirmation failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.ai.rejectProposal(projectId, proposal.id);
      showToast("Proposal rejected. No changes were made.", "info");
      if (onRejected) onRejected();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to reject proposal");
      showToast(err.message || "Rejection failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const isDecisionTaskProposal =
    proposal.proposalType === "TASK_PROPOSAL" &&
    proposal.sourceEntityType === "DECISION";
  const isTaskProposal = proposal.proposalType === "TASK_PROPOSAL";

  const handleClose = () => {
    if (confirmedResults) {
      onConfirmed(confirmedResults);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-codex-accent shadow-2xs shrink-0">
              <Sparkles className="w-5 h-5 text-codex-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  {isDecisionTaskProposal
                    ? "Architectural Decision Task Proposals"
                    : isTaskProposal
                      ? "Review Task Proposals"
                      : "Review Meeting Analysis"}
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-mono"
                >
                  {proposal.status}
                </Badge>
                {isDecisionTaskProposal && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-medium"
                  >
                    ADR Source
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isDecisionTaskProposal
                  ? "AI has broken down this architectural decision into actionable development tasks. Review, assign team members, and confirm to persist on the board."
                  : "Select, review, and confirm tasks to add them to the board."}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 max-h-[65vh] overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success summary if already confirmed */}
          {confirmedResults ? (
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-bold font-serif text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>
                  Successfully created {confirmedResults.length} records in
                  project!
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                {confirmedResults.map((rec: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white border border-emerald-200/80 shadow-2xs flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-500 font-medium">
                      {rec.entityType}:
                    </span>
                    <span className="font-mono font-bold text-slate-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {rec.key || rec.id}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClose}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs shadow-2xs"
                >
                  Done
                </Button>
                <Link href="/tasks" onClick={handleClose}>
                  <Button
                    size="sm"
                    className="bg-codex-accent hover:bg-codex-hover text-white text-xs gap-1 shadow-xs"
                  >
                    <span>View on Kanban Board</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {isTaskProposal && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-2">
                  <p>
                    No tasks are saved until you confirm. Source:{" "}
                    {proposal.sourceEntityType.toLowerCase()} revision{" "}
                    {proposal.sourceRevision}.
                  </p>
                  <p className="font-semibold">Supporting document sources</p>
                  {draft.sourceReferences?.length ? (
                    draft.sourceReferences.map(
                      (source: {
                        chunkId: string;
                        title: string;
                        revision: number;
                        locator: string;
                      }) => (
                        <p key={source.chunkId}>
                          {source.title} · revision {source.revision} ·{" "}
                          {source.locator}
                        </p>
                      ),
                    )
                  ) : (
                    <p>
                      No supporting document sources were retrieved for this
                      draft.
                    </p>
                  )}
                </div>
              )}
              {/* Batch Actions */}
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2.5 border-b border-slate-100">
                <span>
                  Selected:{" "}
                  <strong className="text-codex-accent font-semibold">
                    {selectedIds.size}
                  </strong>{" "}
                  of {draft.items?.length || 0} items
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-blue-600 hover:underline hover:text-blue-700 font-medium cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-xs text-slate-400 hover:underline hover:text-slate-600 cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Task Proposals Display */}
              {isTaskProposal && draft.items && (
                <div className="space-y-3.5">
                  {draft.items.map((item: any) => {
                    const isSelected = selectedIds.has(item.itemId);
                    return (
                      <div
                        key={item.itemId}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-white border-blue-200/90 shadow-sm ring-1 ring-blue-50"
                            : "bg-slate-50/60 border-slate-200 opacity-60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(item.itemId)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-codex-accent focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex-1 space-y-2.5">
                            <Input
                              value={item.title}
                              onChange={(e) =>
                                handleUpdateItem(
                                  "task",
                                  item.itemId,
                                  "title",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-xs font-semibold bg-white border-slate-200 text-slate-900 focus:ring-1 focus:ring-codex-accent"
                              placeholder="Task title"
                            />
                            <textarea
                              rows={2}
                              value={item.description || ""}
                              onChange={(e) =>
                                handleUpdateItem(
                                  "task",
                                  item.itemId,
                                  "description",
                                  e.target.value,
                                )
                              }
                              className="w-full text-xs p-2.5 rounded-lg bg-slate-50/50 border border-slate-200 text-slate-700 focus:outline-none focus:bg-white focus:ring-1 focus:ring-codex-accent transition-colors"
                              placeholder="Task description"
                            />
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <select
                                value={item.priority}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    "task",
                                    item.itemId,
                                    "priority",
                                    e.target.value,
                                  )
                                }
                                className="h-7.5 rounded-lg bg-white border border-slate-200 px-2.5 text-[11px] text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-codex-accent cursor-pointer"
                              >
                                <option value="LOW">Priority: Low</option>
                                <option value="MEDIUM">Priority: Medium</option>
                                <option value="HIGH">Priority: High</option>
                                <option value="URGENT">Priority: Urgent</option>
                              </select>
                              <Input
                                type="date"
                                value={item.dueDate || ""}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    "task",
                                    item.itemId,
                                    "dueDate",
                                    e.target.value,
                                  )
                                }
                                className="h-7.5 w-36 text-[11px] bg-white border-slate-200 text-slate-800 shadow-2xs"
                              />
                              <select
                                value={item.assigneeId || ""}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    "task",
                                    item.itemId,
                                    "assigneeId",
                                    e.target.value || null,
                                  )
                                }
                                className="h-7.5 rounded-lg bg-white border border-slate-200 px-2.5 text-[11px] text-slate-800 shadow-2xs max-w-[210px] focus:outline-none focus:ring-1 focus:ring-codex-accent cursor-pointer"
                                title="Assign to team member"
                              >
                                <option value="">Assignee: Unassigned</option>
                                {members.map((m: any) => {
                                  const name =
                                    m.user?.displayName ||
                                    m.user?.email ||
                                    m.userId;
                                  const role = m.user?.professionalRole
                                    ? ` (${m.user.professionalRole})`
                                    : "";
                                  return (
                                    <option key={m.userId} value={m.userId}>
                                      Assign to: {name}
                                      {role}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Meeting Analysis Display */}
            </>
          )}
        </div>

        {/* Footer actions */}
        {!confirmedResults && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={submitting}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs shadow-2xs"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              <span>Reject Draft</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={submitting}
                className="text-slate-500 hover:text-slate-800 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirm}
                disabled={submitting}
                className="bg-codex-accent hover:bg-codex-hover text-white text-xs shadow-xs px-4"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    <span>Confirm Selected ({selectedIds.size})</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
