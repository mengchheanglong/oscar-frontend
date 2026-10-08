"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { ProposalReviewDialog } from "@/components/ai/proposal-review-dialog";
import { api } from "@/lib/api";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterDropdown, FilterOption } from "@/components/ui/filter-dropdown";
import {
  Plus,
  Search,
  ChevronDown,
  X,
  FileCheck2,
  Sparkles,
  ListTodo,
  ExternalLink,
  History,
  Copy,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Check,
} from "lucide-react";

interface ProjectInfo {
  id: string;
  name: string;
  key: string;
}

interface UserInfo {
  id: string;
  displayName: string;
  email: string;
}

interface RequirementItem {
  id: string;
  projectId: string;
  number: number;
  displayKey: string;
  title: string;
  description?: string | null;
  acceptanceCriteria?: string | null;
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  version: number;
  project?: ProjectInfo | null;
  creator?: UserInfo | null;
  updater?: UserInfo | null;
  createdAt: string;
  updatedAt: string;
}

function getInitials(name?: string | null): string {
  if (!name) return "??";
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name?: string | null): string {
  if (!name) return "bg-slate-700";
  const trimmed = name.trim();

  const colors = [
    "bg-amber-600",
    "bg-blue-600",
    "bg-emerald-600",
    "bg-indigo-600",
    "bg-violet-600",
    "bg-rose-600",
    "bg-slate-700",
    "bg-teal-600",
  ];
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getProjectBadgeStyle(projectName?: string | null) {
  if (!projectName) {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }
  const lower = projectName.toLowerCase();
  if (lower.includes("ai project") || lower.includes("workspace")) {
    return "bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]";
  }
  if (lower.includes("onboarding") || lower.includes("revamp") || lower.includes("client")) {
    return "bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]";
  }
  if (lower.includes("style") || lower.includes("guide") || lower.includes("internal")) {
    return "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]";
  }
  return "bg-purple-50 text-purple-700 border-purple-200";
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case "URGENT":
    case "HIGH":
      return "Must-have";
    case "MEDIUM":
      return "Should-have";
    case "LOW":
    default:
      return "Could-have";
  }
}

function getPriorityBadgeStyle(priority: string) {
  switch (priority) {
    case "URGENT":
    case "HIGH":
      return "bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]";
    case "MEDIUM":
      return "bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]";
    case "LOW":
    default:
      return "bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]";
  }
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case "APPROVED":
    case "DONE":
      return "#10b981"; // green
    case "IN_REVIEW":
    case "IN_PROGRESS":
      return "#f59e0b"; // amber
    case "DRAFT":
    default:
      return "#94a3b8"; // grey
  }
}

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const REQUIREMENT_PROJECT_COLORS = [
  "#C0392B",
  "#8B5CF6",
  "#3B82F6",
  "#059669",
  "#D97706",
  "#EC4899",
  "#6366F1",
];

const REQUIREMENT_STATUS_OPTIONS: FilterOption[] = [
  { value: "DRAFT", label: "Draft", color: "#9CA3AF" },
  { value: "IN_REVIEW", label: "In Review", color: "#D97706" },
  { value: "APPROVED", label: "Approved", color: "#059669" },
];

const REQUIREMENT_PRIORITY_OPTIONS: FilterOption[] = [
  { value: "HIGH", label: "High", color: "#C0392B", textColor: "#C0392B" },
  { value: "MEDIUM", label: "Medium", color: "#D97706", textColor: "#D97706" },
  { value: "LOW", label: "Low", color: "#059669", textColor: "#059669" },
];

export default function RequirementsPage() {
  const { currentProject, projects } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<RequirementItem[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [targetReqId, setTargetReqId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    currentProject ? currentProject.id : "ALL"
  );
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");

  // Create Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createProjectId, setCreateProjectId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createAcceptanceCriteria, setCreateAcceptanceCriteria] = useState("");
  const [createPriority, setCreatePriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("HIGH");
  const [createStatus, setCreateStatus] = useState<"DRAFT" | "IN_REVIEW" | "APPROVED">("DRAFT");
  const [submitting, setSubmitting] = useState(false);

  // Detail / Edit Modal state
  const [activeReq, setActiveReq] = useState<RequirementItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAcceptanceCriteria, setEditAcceptanceCriteria] = useState("");
  const [editPriority, setEditPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("HIGH");
  const [editStatus, setEditStatus] = useState<"DRAFT" | "IN_REVIEW" | "APPROVED" | "IN_PROGRESS" | "DONE" | "ARCHIVED">("DRAFT");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // AI Proposal state
  const [activeProposal, setActiveProposal] = useState<any>(null);
  const [generatingProposalId, setGeneratingProposalId] = useState<string | null>(null);

  // Revisions Modal state
  const [revisionsModalReq, setRevisionsModalReq] = useState<RequirementItem | null>(null);
  const [revisionsList, setRevisionsList] = useState<any[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  // Delete Confirmation state
  const [deleteConfirmReq, setDeleteConfirmReq] = useState<RequirementItem | null>(null);
  const [deletingReq, setDeletingReq] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqsRes, tasksData] = await Promise.all([
        currentProject
          ? api.requirements
              .list(currentProject.id)
              .then((list) => ({ data: list || [] }))
              .catch(async () => ({ data: [] }))
          : api.requirements.listAll({ pageSize: 100 }).catch(async () => ({ data: [] })),
        currentProject
          ? api.tasks.list(currentProject.id).catch(() => [])
          : api.tasks.listAll({ pageSize: 100 }).then((r) => r.data || []).catch(() => []),
      ]);
      setItems(reqsRes.data || []);
      setTasks(tasksData || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to load requirements", "error");
    } finally {
      setLoading(false);
    }
  }, [currentProject, showToast]);

  useEffect(() => {
    setSelectedProjectId(currentProject ? currentProject.id : "ALL");
  }, [currentProject]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("create") === "true") {
        setShowCreate(true);
      }
      const q = params.get("search");
      if (q) {
        setSearchQuery(q);
      }
      const targetId = params.get("id") || params.get("reqId");
      if (targetId) {
        setTargetReqId(targetId);
      }
    }
    loadData();
  }, [loadData]);

  // Auto-open inspected requirement modal if id/reqId is in URL
  useEffect(() => {
    if (!targetReqId || items.length === 0) return;
    const found = items.find(
      (r: any) =>
        r.id === targetReqId ||
        r.id?.toLowerCase() === targetReqId.toLowerCase() ||
        r.displayKey?.toLowerCase() === targetReqId.toLowerCase()
    );
    if (found) {
      openDetailModal(found);
      setTargetReqId(null);
    }
  }, [items, targetReqId]);

  // Compute unique active projects
  const activeProjectsList = useMemo(() => {
    const map = new Map<string, ProjectInfo>();
    for (const p of projects) {
      map.set(p.id, { id: p.id, name: p.name, key: p.key });
    }
    for (const item of items) {
      if (item.project) {
        map.set(item.project.id, item.project);
      }
    }
    return Array.from(map.values());
  }, [projects, items]);

  const requirementProjectOptions: FilterOption[] = useMemo(() => {
    return activeProjectsList.map((p, idx) => ({
      value: p.id,
      label: p.name,
      color: REQUIREMENT_PROJECT_COLORS[idx % REQUIREMENT_PROJECT_COLORS.length],
    }));
  }, [activeProjectsList]);

  // Compute counts for top summary pills
  const statusCounts = useMemo(() => {
    let draft = 0;
    let inReview = 0;
    let approved = 0;
    for (const r of items) {
      if (r.status === "DRAFT") draft++;
      else if (r.status === "IN_REVIEW" || r.status === "IN_PROGRESS") inReview++;
      else if (r.status === "APPROVED" || r.status === "DONE") approved++;
    }
    return {
      DRAFT: draft,
      IN_REVIEW: inReview,
      APPROVED: approved,
    };
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Project filter
      if (selectedProjectId !== "ALL" && item.projectId !== selectedProjectId) {
        return false;
      }
      // Status filter
      if (selectedStatus !== "ALL") {
        if (selectedStatus === "IN_REVIEW") {
          if (item.status !== "IN_REVIEW" && item.status !== "IN_PROGRESS") return false;
        } else if (selectedStatus === "APPROVED") {
          if (item.status !== "APPROVED" && item.status !== "DONE") return false;
        } else if (item.status !== selectedStatus) {
          return false;
        }
      }
      // Priority filter
      if (selectedPriority !== "ALL") {
        if (selectedPriority === "HIGH" && item.priority !== "HIGH" && item.priority !== "URGENT") return false;
        if (selectedPriority === "MEDIUM" && item.priority !== "MEDIUM") return false;
        if (selectedPriority === "LOW" && item.priority !== "LOW") return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchKey = item.displayKey?.toLowerCase().includes(q);
        const matchProject = item.project?.name.toLowerCase().includes(q);
        const matchUpdater = item.updater?.displayName.toLowerCase().includes(q);
        const matchId = item.id.toLowerCase() === q;
        if (!matchTitle && !matchDesc && !matchKey && !matchProject && !matchUpdater && !matchId) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedProjectId, selectedStatus, selectedPriority, searchQuery]);

  // Unique projects in filtered result
  const filteredProjectsCount = useMemo(() => {
    const set = new Set<string>();
    for (const item of filteredItems) {
      set.add(item.projectId);
    }
    return set.size || (activeProjectsList.length > 0 ? activeProjectsList.length : 1);
  }, [filteredItems, activeProjectsList]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`, "info");
  };

  const openCreateModal = () => {
    setCreateProjectId(
      selectedProjectId !== "ALL"
        ? selectedProjectId
        : currentProject?.id || activeProjectsList[0]?.id || ""
    );
    setCreateTitle("");
    setCreateDescription("");
    setCreateAcceptanceCriteria("");
    setCreatePriority("HIGH");
    setCreateStatus("DRAFT");
    setShowCreate(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createProjectId || !createTitle.trim()) {
      showToast("Please provide a project and requirement title", "error");
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.requirements.create(createProjectId, {
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        acceptanceCriteria: createAcceptanceCriteria.trim() || undefined,
        priority: createPriority,
      });

      if (createStatus !== "DRAFT") {
        await api.requirements.update(createProjectId, created.id, {
          version: 1,
          status: createStatus,
        });
      }

      setShowCreate(false);
      showToast("Requirement created successfully", "success");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to create requirement", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailModal = (req: RequirementItem) => {
    setActiveReq(req);
    setEditTitle(req.title);
    setEditDescription(req.description || "");
    setEditAcceptanceCriteria(req.acceptanceCriteria || "");
    setEditPriority(req.priority);
    setEditStatus(req.status);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReq || !editTitle.trim()) return;
    setEditSubmitting(true);
    try {
      await api.requirements.update(activeReq.projectId, activeReq.id, {
        version: activeReq.version,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        acceptanceCriteria: editAcceptanceCriteria.trim() || undefined,
        priority: editPriority,
        status: editStatus,
      });
      showToast("Requirement updated successfully", "success");
      setActiveReq(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to update requirement", "error");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!activeReq) return;
    setDeleteConfirmReq(activeReq);
  };

  const handleConfirmDeleteRequirement = async () => {
    if (!deleteConfirmReq) return;
    setDeletingReq(true);
    try {
      await api.requirements.delete(deleteConfirmReq.projectId, deleteConfirmReq.id);
      showToast("Requirement deleted successfully", "success");
      setDeleteConfirmReq(null);
      setActiveReq(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete requirement", "error");
    } finally {
      setDeletingReq(false);
    }
  };

  const openRevisions = async (req: RequirementItem) => {
    setRevisionsModalReq(req);
    setLoadingRevisions(true);
    try {
      const revs = await api.requirements.listRevisions(req.projectId, req.id);
      setRevisionsList(revs || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load revisions", "error");
    } finally {
      setLoadingRevisions(false);
    }
  };

  const handleGenerateTasks = async (req: RequirementItem) => {
    setGeneratingProposalId(req.id);
    try {
      const res = await api.ai.generateTaskProposal(req.projectId, req.id);
      setActiveProposal(res.proposal || res);
      showToast("Generated task proposal! Review before applying.", "info");
    } catch (err: any) {
      showToast(err.message || "Failed to generate tasks", "error");
    } finally {
      setGeneratingProposalId(null);
    }
  };

  const getLinkedTasks = (reqId: string, reqKey?: string) => {
    return tasks.filter(
      (t) =>
        t.requirementId === reqId ||
        t.requirement?.id === reqId ||
        (reqKey && t.requirement?.displayKey === reqKey)
    );
  };

  return (
    <AppLayout>
      <div className="space-y-5 max-w-7xl mx-auto pb-12">
        {/* Top Breadcrumb & Title Area */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
              <Link href="/dashboard" className="text-[#2563eb] hover:underline font-medium">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Requirements</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
              Requirements
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {filteredItems.length} requirements across {filteredProjectsCount} active {filteredProjectsCount === 1 ? "project" : "projects"}.
            </p>

            {/* Status Summary Pills */}
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === "DRAFT" ? "ALL" : "DRAFT")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  selectedStatus === "DRAFT"
                    ? "bg-slate-100 text-slate-900 border-slate-400 ring-1 ring-slate-400 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#94a3b8]" />
                <span>Draft {statusCounts.DRAFT}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === "IN_REVIEW" ? "ALL" : "IN_REVIEW")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  selectedStatus === "IN_REVIEW"
                    ? "bg-amber-50 text-amber-900 border-amber-400 ring-1 ring-amber-400 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                <span>In Review {statusCounts.IN_REVIEW}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === "APPROVED" ? "ALL" : "APPROVED")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  selectedStatus === "APPROVED"
                    ? "bg-emerald-50 text-emerald-900 border-emerald-400 ring-1 ring-emerald-400 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span>Approved {statusCounts.APPROVED}</span>
              </button>
            </div>
          </div>

          <Button
            onClick={openCreateModal}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 self-start sm:self-auto h-9"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Requirement</span>
          </Button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          {/* Left: Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Project Filter */}
            <FilterDropdown
              label="Project"
              allLabel="All projects"
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              options={requirementProjectOptions}
            />

            {/* Status Filter */}
            <FilterDropdown
              label="Status"
              allLabel="All statuses"
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={REQUIREMENT_STATUS_OPTIONS}
            />

            {/* Priority Filter */}
            <FilterDropdown
              label="Priority"
              allLabel="All priorities"
              value={selectedPriority}
              onChange={setSelectedPriority}
              options={REQUIREMENT_PRIORITY_OPTIONS}
            />
          </div>

          {/* Right: Search Filter */}
          <div className="relative md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks..."
              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Requirements Table Card */}
        {loading ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 p-8 rounded-2xl border border-dashed border-slate-200 bg-white space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No matching requirements found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {items.length === 0
                ? "No requirements created yet in this workspace. Create your first requirement to get started."
                : "Try adjusting your project, status, or priority filters, or clear your search term."}
            </p>
            {items.length === 0 ? (
              <Button
                onClick={openCreateModal}
                className="text-xs bg-[#2563eb] hover:bg-[#1d4ed8] text-white mt-2"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Create First Requirement
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedProjectId("ALL");
                  setSelectedStatus("ALL");
                  setSelectedPriority("ALL");
                  setSearchQuery("");
                }}
                className="text-xs mt-2"
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-[44%]">Requirements</th>
                    <th className="py-3 px-4 w-[18%]">Project</th>
                    <th className="py-3 px-4 w-[13%]">Priority</th>
                    <th className="py-3 px-4 w-[14%]">Updated By</th>
                    <th className="py-3 px-4 w-[11%]">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredItems.map((req) => {
                    const projectName = req.project?.name || "Unknown project";
                    const updaterName = req.updater?.displayName || req.updater?.email || req.creator?.displayName || req.creator?.email || "Unknown user";
                    const priorityLabel = getPriorityLabel(req.priority);
                    const priorityBadgeStyle = getPriorityBadgeStyle(req.priority);
                    const projectBadgeStyle = getProjectBadgeStyle(projectName);
                    const dotColor = getStatusDotColor(req.status);
                    const relativeTime = formatRelativeTime(req.updatedAt);

                    return (
                      <tr
                        key={req.id}
                        onClick={() => openDetailModal(req)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Requirements Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: dotColor }}
                            />
                            <span className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors leading-relaxed">
                              {req.title}
                            </span>
                          </div>
                        </td>

                        {/* Project Column */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border truncate max-w-[190px] ${projectBadgeStyle}`}
                          >
                            {projectName}
                          </span>
                        </td>

                        {/* Priority Column */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${priorityBadgeStyle}`}
                          >
                            {priorityLabel}
                          </span>
                        </td>

                        {/* Updated By Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-2xs ${getAvatarColor(
                                updaterName
                              )}`}
                              title={updaterName}
                            >
                              {getInitials(updaterName)}
                            </div>
                            <span className="text-slate-700 font-medium truncate">
                              {updaterName}
                            </span>
                          </div>
                        </td>

                        {/* Updated Column */}
                        <td className="py-3 px-4 text-slate-500 font-normal">
                          {relativeTime}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* CREATE REQUIREMENT MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => !submitting && setShowCreate(false)}
          />
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10 animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">New Requirement</h3>
                  <p className="text-[11px] text-slate-500">Define specifications and acceptance criteria</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Project Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Project *</label>
                <select
                  required
                  value={createProjectId}
                  onChange={(e) => setCreateProjectId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="" disabled>
                    Select project
                  </option>
                  {activeProjectsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.key})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Title *</label>
                <Input
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="e.g. Auth must support email/password with hashed sessions"
                  className="text-xs h-9"
                />
              </div>

              {/* Priority & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Priority</label>
                  <select
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">Must-have</option>
                    <option value="MEDIUM">Should-have</option>
                    <option value="LOW">Could-have</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Initial Status</label>
                  <select
                    value={createStatus}
                    onChange={(e) => setCreateStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="APPROVED">Approved</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Detailed functional context..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Acceptance Criteria */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Acceptance Criteria</label>
                <textarea
                  rows={3}
                  value={createAcceptanceCriteria}
                  onChange={(e) => setCreateAcceptanceCriteria(e.target.value)}
                  placeholder="- Given valid credentials, when POST /api/v1/auth/login, then a secure cookie is returned."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreate(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs px-4"
                >
                  {submitting ? "Creating..." : "Create Requirement"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUIREMENT DETAIL / EDIT MODAL */}
      {activeReq && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => !editSubmitting && setActiveReq(null)}
          />
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getStatusDotColor(editStatus) }}
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(activeReq.displayKey, "key")}
                  className="font-mono text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1 transition-all"
                  title="Click to copy display key"
                >
                  <span>{activeReq.displayKey}</span>
                  <Copy className="w-3 h-3 text-blue-500" />
                </button>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium border truncate max-w-[180px] ${getProjectBadgeStyle(
                    activeReq.project?.name
                  )}`}
                >
                  {activeReq.project?.name || "Workspace"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveReq(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleUpdate} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Requirement Title *</label>
                <Input
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-xs h-9 font-medium"
                />
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">Must-have</option>
                    <option value="MEDIUM">Should-have</option>
                    <option value="LOW">Could-have</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Context and specifications..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Acceptance Criteria */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Acceptance Criteria</label>
                  <span className="text-[10px] text-slate-400 font-mono">QA & Verification Rules</span>
                </div>
                <textarea
                  rows={3}
                  value={editAcceptanceCriteria}
                  onChange={(e) => setEditAcceptanceCriteria(e.target.value)}
                  placeholder="- Acceptance rules..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* AI & Revision Action Cards */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={generatingProposalId === activeReq.id}
                  onClick={() => handleGenerateTasks(activeReq)}
                  className="h-8 text-xs border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 gap-1.5 px-3"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${generatingProposalId === activeReq.id ? "animate-spin" : "text-blue-600"}`} />
                  <span>{generatingProposalId === activeReq.id ? "Generating Tasks..." : "Generate Tasks with AI"}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openRevisions(activeReq)}
                  className="h-8 text-xs border-slate-200 hover:bg-slate-50 text-slate-700 gap-1.5 px-3"
                >
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Revisions (v{activeReq.version})</span>
                </Button>
              </div>

              {/* Linked Tasks */}
              {getLinkedTasks(activeReq.id, activeReq.displayKey).length > 0 && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <ListTodo className="w-3.5 h-3.5 text-blue-600" />
                      <span>Linked Tasks ({getLinkedTasks(activeReq.id, activeReq.displayKey).length})</span>
                    </span>
                    <Link
                      href={`/tasks?search=${encodeURIComponent(activeReq.displayKey || activeReq.id)}`}
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>Open in Tasks</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {getLinkedTasks(activeReq.id, activeReq.displayKey).map((t: any) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs shadow-2xs"
                      >
                        <span className="font-medium text-slate-800 truncate max-w-[320px]">{t.title}</span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">{t.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveReq(null)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={editSubmitting}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs px-4"
                  >
                    {editSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVISIONS HISTORY MODAL */}
      {revisionsModalReq && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setRevisionsModalReq(null)} />
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Revision History &bull; {revisionsModalReq.displayKey}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRevisionsModalReq(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 overflow-y-auto flex-1">
              {loadingRevisions ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : revisionsList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  No revisions found.
                </p>
              ) : (
                revisionsList.map((rev) => (
                  <div
                    key={rev.id || rev.version}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-blue-600">v{rev.version}</span>
                      <span className="text-[11px] text-slate-500">
                        {formatRelativeTime(rev.createdAt)}
                      </span>
                    </div>
                    <div className="font-medium text-slate-800">{rev.title}</div>
                    {rev.description && (
                      <p className="text-slate-600 text-[11px]">{rev.description}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-500 font-mono">
                      <span>Status: {rev.status}</span>
                      <span>&bull;</span>
                      <span>Priority: {getPriorityLabel(rev.priority)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRevisionsModalReq(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI PROPOSAL REVIEW DIALOG */}
      {activeProposal && (
        <ProposalReviewDialog
          isOpen={!!activeProposal}
          onClose={() => setActiveProposal(null)}
          proposal={activeProposal}
          projectId={activeProposal.projectId || currentProject?.id || activeProjectsList[0]?.id || ""}
          onConfirmed={() => {
            setActiveProposal(null);
            loadData();
          }}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={!!deleteConfirmReq}
        onClose={() => !deletingReq && setDeleteConfirmReq(null)}
        onConfirm={handleConfirmDeleteRequirement}
        title="Delete requirement"
        itemName={deleteConfirmReq?.title}
        itemType="requirement"
        warningText="This action cannot be undone. All linked tasks and traceability links will be detached."
        confirmText="Delete requirement"
        loading={deletingReq}
      />
    </AppLayout>
  );
}
