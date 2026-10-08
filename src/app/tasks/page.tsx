"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterDropdown, FilterOption } from "@/components/ui/filter-dropdown";
import {
  Plus,
  Calendar,
  Search,
  Check,
  LayoutGrid,
  List,
  ChevronDown,
  AlertCircle,
  X,
  Trash2,
  AlertTriangle,
  Sparkles,
  Link as LinkIcon,
  Bot,
  GripVertical,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

interface ProjectInfo {
  id: string;
  name: string;
  key: string;
}

interface AssigneeInfo {
  id: string;
  displayName: string;
  email: string;
}

interface TaskItem {
  id: string;
  projectId: string;
  number: number;
  displayKey: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "IN_REVIEW" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeId?: string | null;
  assignee?: AssigneeInfo | null;
  project?: ProjectInfo | null;
  blockedReason?: string | null;
  dueDate?: string | null;
  requirementId?: string | null;
  sourceMeetingId?: string | null;
  aiProvenance?: {
    sourceEntityType: string;
    sourceRevision: number;
    sourceReferences: Array<{ chunkId: string; title: string; revision: number; locator: string }>;
  } | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

const COLUMNS: Array<{
  status: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
  label: string;
  dotColor: string;
}> = [
  { status: "TODO", label: "TO DO", dotColor: "#94a3b8" },
  { status: "IN_PROGRESS", label: "IN PROGRESS", dotColor: "#3b82f6" },
  { status: "DONE", label: "DONE", dotColor: "#10b981" },
  { status: "BLOCKED", label: "BLOCKED", dotColor: "#ef4444" },
];

function formatDueDate(dueDateStr: string | null | undefined): string {
  if (!dueDateStr) return "-";
  try {
    const parts = dueDateStr.split("-");
    if (parts.length === 3) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${day} ${monthNames[monthIndex] || "Sep"}`;
    }
    const d = new Date(dueDateStr);
    if (isNaN(d.getTime())) return dueDateStr;
    const month = d.toLocaleDateString("en-US", { month: "short" });
    return `${d.getDate()} ${month}`;
  } catch {
    return dueDateStr;
  }
}

function getInitials(name?: string | null): string {
  if (!name) return "??";
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAssigneeColor(name: string): string {
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
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
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

const TASK_PROJECT_COLORS = [
  "#C0392B",
  "#8B5CF6",
  "#3B82F6",
  "#059669",
  "#D97706",
  "#EC4899",
  "#6366F1",
];

const TASK_ASSIGNEE_COLORS = ["#6366F1", "#D97706", "#C0392B", "#059669", "#8B5CF6"];

const TASK_PRIORITY_OPTIONS: FilterOption[] = [
  { value: "HIGH", label: "High", color: "#C0392B", textColor: "#C0392B" },
  { value: "MEDIUM", label: "Medium", color: "#D97706", textColor: "#D97706" },
  { value: "LOW", label: "Low", color: "#059669", textColor: "#059669" },
];

export default function TasksPage() {
  const { currentProject, projects } = useAuth();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    currentProject ? currentProject.id : "ALL"
  );
  const [selectedAssignee, setSelectedAssignee] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null);

  // Column Progressive Disclosure (limit to 4 initially)
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({
    TODO: false,
    IN_PROGRESS: false,
    DONE: false,
    BLOCKED: false,
  });

  // Client mounted state for @hello-pangea/dnd hydration safety
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createInitialStatus, setCreateInitialStatus] = useState<"TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED">("TODO");
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Create Form State
  const [createProjectId, setCreateProjectId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStatus, setCreateStatus] = useState<"TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED">("TODO");
  const [createPriority, setCreatePriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [createDueDate, setCreateDueDate] = useState("");
  const [createAssigneeId, setCreateAssigneeId] = useState("");
  const [createBlockedReason, setCreateBlockedReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit Form State
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<"TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "IN_REVIEW" | "CANCELLED">("TODO");
  const [editPriority, setEditPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [editBlockedReason, setEditBlockedReason] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete Task Confirmation State
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<TaskItem | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (currentProject) {
        const fallbackTasks = await api.tasks.list(currentProject.id);
        setTasks(Array.isArray(fallbackTasks) ? fallbackTasks : (fallbackTasks as any)?.data || []);
      } else {
        const res = await api.tasks.listAll({ pageSize: 100 });
        setTasks(res.data || []);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to load tasks", "error");
    } finally {
      setLoading(false);
    }
  }, [currentProject, showToast]);

  useEffect(() => {
    setSelectedProjectId(currentProject ? currentProject.id : "ALL");
  }, [currentProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Read URL params if any
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("create") === "true") {
        setCreateModalOpen(true);
      }
      const q = params.get("search");
      if (q) {
        setSearchQuery(q);
      }
      const targetId = params.get("id") || params.get("taskId");
      if (targetId) {
        setTargetTaskId(targetId);
      }
    }
  }, []);

  // Auto-open inspected task modal if id/taskId is in URL
  useEffect(() => {
    if (!targetTaskId || tasks.length === 0) return;
    const found = tasks.find(
      (t) =>
        t.id === targetTaskId ||
        t.id.toLowerCase() === targetTaskId.toLowerCase() ||
        t.displayKey?.toLowerCase() === targetTaskId.toLowerCase()
    );
    if (found) {
      openEditModal(found);
      setTargetTaskId(null);
    }
  }, [tasks, targetTaskId]);

  // Compute unique assignees from tasks & project members
  const assigneesList = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const t of tasks) {
      if (t.assignee) {
        map.set(t.assignee.id, { id: t.assignee.id, name: t.assignee.displayName });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  // Compute unique active projects
  const activeProjectsList = useMemo(() => {
    const map = new Map<string, ProjectInfo>();
    for (const p of projects) {
      map.set(p.id, { id: p.id, name: p.name, key: p.key });
    }
    for (const t of tasks) {
      if (t.project) {
        map.set(t.project.id, t.project);
      }
    }
    return Array.from(map.values());
  }, [projects, tasks]);

  const taskProjectOptions: FilterOption[] = useMemo(() => {
    return activeProjectsList.map((p, idx) => ({
      value: p.id,
      label: p.name,
      color: TASK_PROJECT_COLORS[idx % TASK_PROJECT_COLORS.length],
    }));
  }, [activeProjectsList]);

  const taskAssigneeOptions: FilterOption[] = useMemo(() => {
    return assigneesList.map((a, idx) => ({
      value: a.name,
      label: a.name,
      color: TASK_ASSIGNEE_COLORS[idx % TASK_ASSIGNEE_COLORS.length],
    }));
  }, [assigneesList]);

  const isTaskOverdue = useCallback(
    (task: TaskItem) => {
      if (!task.dueDate) return false;
      if (task.status === "DONE" || task.status === "CANCELLED") return false;
      return task.dueDate < todayStr;
    },
    [todayStr]
  );

  // Filter tasks based on controls
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Project filter
      if (selectedProjectId !== "ALL" && t.projectId !== selectedProjectId) {
        return false;
      }
      // Assignee filter
      if (selectedAssignee !== "ALL") {
        if (!t.assignee && selectedAssignee !== "UNASSIGNED") return false;
        if (t.assignee && t.assignee.displayName !== selectedAssignee && t.assignee.id !== selectedAssignee) {
          return false;
        }
      }
      // Priority filter
      if (selectedPriority !== "ALL") {
        if (selectedPriority === "HIGH" && (t.priority !== "HIGH" && t.priority !== "URGENT")) return false;
        if (selectedPriority === "MEDIUM" && t.priority !== "MEDIUM") return false;
        if (selectedPriority === "LOW" && t.priority !== "LOW") return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchProject = t.project?.name.toLowerCase().includes(q);
        const matchAssignee = t.assignee?.displayName.toLowerCase().includes(q);
        const matchReason = t.blockedReason?.toLowerCase().includes(q);
        const matchKey = t.displayKey?.toLowerCase().includes(q);
        const matchId = t.id.toLowerCase() === q;
        if (!matchTitle && !matchProject && !matchAssignee && !matchReason && !matchKey && !matchId) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, selectedProjectId, selectedAssignee, selectedPriority, searchQuery]);

  // Active projects count in filtered result
  const filteredProjectsCount = useMemo(() => {
    const set = new Set<string>();
    for (const t of filteredTasks) {
      set.add(t.projectId);
    }
    return set.size || (activeProjectsList.length > 0 ? activeProjectsList.length : 1);
  }, [filteredTasks, activeProjectsList]);

  // Tasks partitioned by status
  const tasksByStatus = useMemo(() => {
    const map: Record<string, TaskItem[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
      BLOCKED: [],
    };
    for (const t of filteredTasks) {
      let st: string = t.status;
      if (st === "IN_REVIEW") st = "IN_PROGRESS";
      if (st === "CANCELLED") st = "DONE";
      if (!map[st]) {
        map[st] = [];
      }
      map[st].push(t);
    }
    return map;
  }, [filteredTasks]);

  const listSortedTasks = useMemo(() => {
    const statusPriority: Record<string, number> = {
      IN_PROGRESS: 1,
      IN_REVIEW: 1,
      TODO: 2,
      BLOCKED: 3,
      DONE: 4,
      CANCELLED: 5,
    };
    return [...filteredTasks].sort((a, b) => {
      const pA = statusPriority[a.status] || 99;
      const pB = statusPriority[b.status] || 99;
      if (pA !== pB) return pA - pB;
      return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
    });
  }, [filteredTasks]);

  const toggleColumnExpand = (status: string) => {
    setExpandedColumns((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  const openCreateModal = (initialStatus: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED" = "TODO") => {
    setCreateInitialStatus(initialStatus);
    setCreateStatus(initialStatus);
    setCreateProjectId(
      selectedProjectId !== "ALL"
        ? selectedProjectId
        : currentProject?.id || (activeProjectsList[0]?.id ?? "")
    );
    setCreateTitle("");
    setCreateDescription("");
    setCreatePriority("MEDIUM");
    setCreateDueDate("");
    setCreateAssigneeId("");
    setCreateBlockedReason(
      initialStatus === "BLOCKED" ? "No blocked reason recorded" : ""
    );
    setCreateModalOpen(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createProjectId || !createTitle.trim()) {
      showToast("Please provide a project and task title", "error");
      return;
    }
    setSubmitting(true);
    try {
      await api.tasks.create(createProjectId, {
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        status: createStatus,
        priority: createPriority,
        dueDate: createDueDate || undefined,
        assigneeId: createAssigneeId || undefined,
        blockedReason: createStatus === "BLOCKED" ? createBlockedReason.trim() : undefined,
      });
      showToast("Task created successfully", "success");
      setCreateModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to create task", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOnDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId as "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
    const targetStatus = destination.droppableId as "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";

    const taskToMove = tasks.find((t) => t.id === draggableId);
    if (!taskToMove) return;

    const previousTasks = [...tasks];

    // Determine new blocked reason
    let newBlockedReason = taskToMove.blockedReason;
    if (targetStatus === "BLOCKED" && !newBlockedReason) {
      newBlockedReason = "No blocked reason recorded";
    } else if (targetStatus !== "BLOCKED") {
      newBlockedReason = null;
    }

    const updatedTask: TaskItem = {
      ...taskToMove,
      status: targetStatus,
      blockedReason: newBlockedReason,
    };

    // Calculate displayed target tasks for accurate insertion position
    const targetColAll = tasks.filter((t) => {
      let st: string = t.status;
      if (st === "IN_REVIEW") st = "IN_PROGRESS";
      if (st === "CANCELLED") st = "DONE";
      return st === targetStatus && t.id !== taskToMove.id;
    });

    const isExpanded = expandedColumns[targetStatus] || false;
    const targetColDisplayed = isExpanded ? targetColAll : targetColAll.slice(0, 4);

    setTasks((prev) => {
      const remaining = prev.filter((t) => t.id !== taskToMove.id);

      if (destination.index < targetColDisplayed.length) {
        const neighbor = targetColDisplayed[destination.index];
        const neighborIdx = remaining.findIndex((t) => t.id === neighbor.id);
        if (neighborIdx !== -1) {
          remaining.splice(neighborIdx, 0, updatedTask);
          return remaining;
        }
      }

      // If dropped at bottom of column or column is empty, find last matching task
      let lastMatchIdx = -1;
      for (let i = remaining.length - 1; i >= 0; i--) {
        let st: string = remaining[i].status;
        if (st === "IN_REVIEW") st = "IN_PROGRESS";
        if (st === "CANCELLED") st = "DONE";
        if (st === targetStatus) {
          lastMatchIdx = i;
          break;
        }
      }

      if (lastMatchIdx !== -1) {
        remaining.splice(lastMatchIdx + 1, 0, updatedTask);
        return remaining;
      }

      return [...remaining, updatedTask];
    });

    // If cross-column move, persist status change to backend
    if (sourceStatus !== targetStatus) {
      try {
        const saved = await api.tasks.update(taskToMove.projectId, taskToMove.id, {
          version: taskToMove.version,
          status: targetStatus,
          blockedReason: newBlockedReason,
        });

        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskToMove.id
              ? { ...t, version: saved.version, updatedAt: saved.updatedAt }
              : t
          )
        );

        const statusLabels: Record<string, string> = {
          TODO: "TO DO",
          IN_PROGRESS: "IN PROGRESS",
          DONE: "DONE",
          BLOCKED: "BLOCKED",
        };

        showToast(`Moved to ${statusLabels[targetStatus] || targetStatus}`, "success");
      } catch (err: any) {
        console.error("Failed to move task:", err);
        showToast(err.message || "Failed to move task. Reverting...", "error");
        setTasks(previousTasks);
      }
    }
  };

  const openEditModal = (task: TaskItem) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate || "");
    setEditAssigneeId(task.assigneeId || "");
    setEditBlockedReason(task.blockedReason || "");
  };

  useEffect(() => {
    if (!editingTask?.id || !editingTask.projectId) return;
    const taskId = editingTask.id;
    let cancelled = false;
    api.tasks.get(editingTask.projectId, taskId).then((detail: TaskItem) => {
      if (cancelled) return;
      setEditingTask((current) => current?.id === taskId
        ? { ...current, aiProvenance: detail.aiProvenance }
        : current);
    }).catch(() => {
      if (!cancelled) showToast("Could not load task source details. Reopen the task to retry.", "error");
    });
    return () => { cancelled = true; };
  }, [editingTask?.id, editingTask?.projectId, showToast]);

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;
    setEditSubmitting(true);
    try {
      await api.tasks.update(editingTask.projectId, editingTask.id, {
        version: editingTask.version,
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        status: editStatus,
        priority: editPriority,
        dueDate: editDueDate || null,
        assigneeId: editAssigneeId || null,
        blockedReason: editStatus === "BLOCKED" ? editBlockedReason.trim() : null,
      });
      showToast("Task updated successfully", "success");
      setEditingTask(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to update task", "error");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteTask = () => {
    if (!editingTask) return;
    setDeleteConfirmTask(editingTask);
  };

  const handleConfirmDeleteTask = async () => {
    if (!deleteConfirmTask) return;
    setDeletingTask(true);
    try {
      await api.tasks.delete(deleteConfirmTask.projectId, deleteConfirmTask.id);
      showToast("Task deleted successfully", "success");
      setDeleteConfirmTask(null);
      setEditingTask(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete task", "error");
    } finally {
      setDeletingTask(false);
    }
  };

  const renderPriorityBadge = (priority: string) => {
    if (priority === "HIGH" || priority === "URGENT") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
          <span>High</span>
        </span>
      );
    }
    if (priority === "MEDIUM") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
          <span>Med</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
        <span>Low</span>
      </span>
    );
  };

  const renderStatusDot = (status: string) => {
    if (status === "IN_PROGRESS" || status === "IN_REVIEW") {
      return <span className="w-2 h-2 rounded-full bg-[#3b82f6] shrink-0" />;
    }
    if (status === "DONE" || status === "CANCELLED") {
      return <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0" />;
    }
    if (status === "BLOCKED") {
      return <span className="w-2 h-2 rounded-full bg-[#ef4444] shrink-0" />;
    }
    return <span className="w-2 h-2 rounded-full bg-[#94a3b8] shrink-0" />;
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
              <span className="text-slate-800 font-medium">Tasks</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
              Tasks
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {filteredTasks.length} tasks across {filteredProjectsCount} active {filteredProjectsCount === 1 ? "project" : "projects"}.
            </p>
          </div>

          <Button
            onClick={() => openCreateModal("TODO")}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 self-start sm:self-auto h-9"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Task</span>
          </Button>
        </div>

        {/* Filter Toolbar & View Switcher */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          {/* Left: Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Project Dropdown */}
            <FilterDropdown
              label="Project"
              allLabel="All projects"
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              options={taskProjectOptions}
            />

            {/* Assignee Dropdown */}
            <FilterDropdown
              label="Assignee"
              allLabel="Everyone"
              value={selectedAssignee}
              onChange={setSelectedAssignee}
              options={taskAssigneeOptions}
            />

            {/* Priority Dropdown */}
            <FilterDropdown
              label="Priority"
              allLabel="All priorities"
              value={selectedPriority}
              onChange={setSelectedPriority}
              options={TASK_PRIORITY_OPTIONS}
            />
          </div>

          {/* Right: Search & View Switcher */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tasks..."
                className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
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

            {/* View Switcher Toggle */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs h-9">
              <button
                type="button"
                onClick={() => setViewMode("board")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === "board"
                    ? "bg-[#0f172a] text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Board</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === "list"
                    ? "bg-[#0f172a] text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-28 bg-white rounded-xl animate-pulse" />
                <div className="h-28 bg-white rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-20 p-8 rounded-2xl border border-dashed border-slate-200 bg-white space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No matching tasks found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {tasks.length === 0
                ? "No tasks created yet in this workspace. Create your first task to get started."
                : "Try adjusting your project, assignee, or priority filters, or clear your search term."}
            </p>
            {tasks.length === 0 ? (
              <Button
                onClick={() => openCreateModal("TODO")}
                className="text-xs bg-[#2563eb] hover:bg-[#1d4ed8] text-white mt-2"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Create First Task
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedProjectId("ALL");
                  setSelectedAssignee("ALL");
                  setSelectedPriority("ALL");
                  setSearchQuery("");
                }}
                className="text-xs mt-2"
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : viewMode === "board" ? (
          /* Kanban Board View with @hello-pangea/dnd fluid physics */
          isMounted ? (
            <DragDropContext onDragEnd={handleOnDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start pt-1">
                {COLUMNS.map((col) => {
                  const colTasks = tasksByStatus[col.status] || [];
                  const isExpanded = expandedColumns[col.status] || false;
                  const displayedTasks = isExpanded ? colTasks : colTasks.slice(0, 4);
                  const remainingCount = colTasks.length - 4;

                  return (
                    <div
                      key={col.status}
                      className="rounded-2xl p-3 flex flex-col space-y-3 bg-[#f8fafc]/90 border border-slate-200/80 shadow-2xs min-h-[440px]"
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between px-1 pt-1 pb-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: col.dotColor }}
                          />
                          <span className="text-[12px] font-bold text-slate-800 tracking-wider">
                            {col.label}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 px-2 py-0.5 bg-white border border-slate-200 rounded-full font-mono shadow-2xs">
                          {colTasks.length}
                        </span>
                      </div>

                      {/* Droppable Card Container */}
                      <Droppable droppableId={col.status} type="TASK">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`space-y-2.5 flex-1 min-h-[140px] rounded-xl p-1 -m-1 transition-colors duration-150 ${
                              snapshot.isDraggingOver
                                ? "bg-blue-50/70 ring-2 ring-blue-300/40 rounded-xl"
                                : ""
                            }`}
                          >
                            {displayedTasks.map((task, idx) => {
                              const overdue = isTaskOverdue(task);
                              const isBlocked = task.status === "BLOCKED";
                              const isDone = task.status === "DONE" || task.status === "CANCELLED";
                              const projectName = task.project?.name || "Workspace";
                              const assigneeName = task.assignee?.displayName || "Unassigned";

                              return (
                                <Draggable
                                  key={task.id}
                                  draggableId={task.id}
                                  index={idx}
                                >
                                  {(draggableProvided, draggableSnapshot) => (
                                    <div
                                      ref={draggableProvided.innerRef}
                                      {...draggableProvided.draggableProps}
                                      {...draggableProvided.dragHandleProps}
                                      onClick={() => {
                                        if (!draggableSnapshot.isDragging) {
                                          openEditModal(task);
                                        }
                                      }}
                                      style={{
                                        ...draggableProvided.draggableProps.style,
                                        ...(draggableSnapshot.isDragging &&
                                        draggableProvided.draggableProps.style?.transform
                                          ? {
                                              transform: `${draggableProvided.draggableProps.style.transform} rotate(1.5deg)`,
                                            }
                                          : {}),
                                      }}
                                      className={`group relative bg-white border rounded-xl p-3.5 shadow-2xs select-none transition-shadow ${
                                        draggableSnapshot.isDragging
                                          ? "shadow-2xl ring-2 ring-blue-500/50 z-50 bg-white cursor-grabbing border-blue-400"
                                          : "border-slate-200/90 hover:border-slate-300 hover:shadow-xs cursor-grab"
                                      } space-y-2.5`}
                                    >
                                      {/* Top Row: Project Pill + Priority + Drag handle */}
                                      <div className="flex items-center justify-between gap-2">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium border truncate max-w-[190px] ${getProjectBadgeStyle(
                                            projectName
                                          )}`}
                                        >
                                          {projectName}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                          {renderPriorityBadge(task.priority)}
                                          <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                        </div>
                                      </div>

                                      {/* Task Title */}
                                      <h4 className="text-[12.5px] font-semibold text-slate-800 leading-snug group-hover:text-blue-600 transition-colors">
                                        {task.title}
                                      </h4>

                                      {/* Blocked Alert Banner if Blocked */}
                                      {(isBlocked || task.blockedReason) && (
                                        <div className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] rounded-md px-2 py-1 text-[11px] flex items-center gap-1.5 font-normal">
                                          <AlertCircle className="w-3 h-3 shrink-0" />
                                          <span className="truncate">
                                            {task.blockedReason || "No blocked reason recorded"}
                                          </span>
                                        </div>
                                      )}

                                      {/* Bottom Row: Due Date / Completed status + Assignee Avatar */}
                                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                        {/* Left: Due Date or Completed */}
                                        <div className="flex items-center gap-1 text-[11px]">
                                          {isDone ? (
                                            <span className="flex items-center gap-1 text-slate-500 font-medium">
                                              <Check className="w-3.5 h-3.5 text-slate-400 stroke-[2.5]" />
                                              <span>Completed</span>
                                            </span>
                                          ) : task.dueDate ? (
                                            <span
                                              className={`flex items-center gap-1 font-medium ${
                                                overdue ? "text-[#dc2626]" : "text-slate-500"
                                              }`}
                                            >
                                              <Calendar
                                                className={`w-3.5 h-3.5 ${
                                                  overdue ? "text-[#dc2626]" : "text-slate-400"
                                                }`}
                                              />
                                              <span>{formatDueDate(task.dueDate)}</span>
                                            </span>
                                          ) : (
                                            <span className="flex items-center gap-1 text-slate-400">
                                              <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                              <span>-</span>
                                            </span>
                                          )}
                                        </div>

                                        {/* Right: Assignee Avatar with Initials */}
                                        <div
                                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-2xs ${getAssigneeColor(
                                            assigneeName
                                          )}`}
                                          title={assigneeName}
                                        >
                                          {getInitials(assigneeName)}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>

                      {/* Progressive Disclosure Expand Button */}
                      {colTasks.length > 4 && (
                        <button
                          type="button"
                          onClick={() => toggleColumnExpand(col.status)}
                          className="w-full py-2 text-center text-xs font-medium text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-2xs"
                        >
                          {isExpanded ? "Show less" : `+ ${remainingCount} more`}
                        </button>
                      )}

                      {/* Add Task Button at Column Bottom */}
                      <button
                        type="button"
                        onClick={() => openCreateModal(col.status)}
                        className="w-full py-1.5 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add task</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start pt-1">
              {COLUMNS.map((col) => {
                const colTasks = tasksByStatus[col.status] || [];
                const displayedTasks = colTasks.slice(0, 4);
                return (
                  <div
                    key={col.status}
                    className="rounded-2xl p-3 flex flex-col space-y-3 bg-[#f8fafc]/90 border border-slate-200/80 shadow-2xs min-h-[440px]"
                  >
                    <div className="flex items-center justify-between px-1 pt-1 pb-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: col.dotColor }}
                        />
                        <span className="text-[12px] font-bold text-slate-800 tracking-wider">
                          {col.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 px-2 py-0.5 bg-white border border-slate-200 rounded-full font-mono shadow-2xs">
                        {colTasks.length}
                      </span>
                    </div>
                    <div className="space-y-2.5 flex-1 min-h-[140px]">
                      {displayedTasks.map((task) => (
                        <div
                          key={task.id}
                          className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs space-y-2.5"
                        >
                          <h4 className="text-[12.5px] font-semibold text-slate-800 leading-snug">
                            {task.title}
                          </h4>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* List View */
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-[36%]">Task</th>
                    <th className="py-3 px-4 w-[18%]">Project</th>
                    <th className="py-3 px-4 w-[15%]">Assignee</th>
                    <th className="py-3 px-4 w-[10%]">Priority</th>
                    <th className="py-3 px-4 w-[21%]">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {listSortedTasks.map((task) => {
                    const isDone = task.status === "DONE" || task.status === "CANCELLED";
                    const isBlocked = task.status === "BLOCKED";
                    const overdue = isTaskOverdue(task);
                    const projectName = task.project?.name || "Workspace";
                    const assigneeName = task.assignee?.displayName || "Unassigned";

                    return (
                      <tr
                        key={task.id}
                        onClick={() => openEditModal(task)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Task Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {renderStatusDot(task.status)}
                            <span
                              className={`truncate font-medium ${
                                isDone
                                  ? "line-through text-slate-400 font-normal"
                                  : "text-slate-800 group-hover:text-blue-600 transition-colors"
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>
                        </td>

                        {/* Project Column */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border truncate max-w-[210px] ${getProjectBadgeStyle(
                              projectName
                            )}`}
                          >
                            {projectName}
                          </span>
                        </td>

                        {/* Assignee Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 shadow-2xs ${getAssigneeColor(
                                assigneeName
                              )}`}
                            >
                              {getInitials(assigneeName)}
                            </div>
                            <span className="truncate text-slate-700 text-xs font-medium">
                              {assigneeName}
                            </span>
                          </div>
                        </td>

                        {/* Priority Column */}
                        <td className="py-3 px-4">{renderPriorityBadge(task.priority)}</td>

                        {/* Due Column */}
                        <td className="py-3 px-4">
                          {isBlocked ? (
                            <span className="text-[11px] text-slate-500 font-normal block" title={task.blockedReason || "No blocked reason recorded"}>
                              {task.blockedReason || "No blocked reason recorded"}
                            </span>
                          ) : isDone ? (
                            <span className="text-[11px] text-slate-400 font-normal">Completed</span>
                          ) : task.dueDate ? (
                            <span
                              className={`text-[11px] font-medium font-mono ${
                                overdue ? "text-[#dc2626] font-semibold" : "text-slate-600"
                              }`}
                            >
                              {formatDueDate(task.dueDate)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
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

      {/* CREATE TASK MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => !submitting && setCreateModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10 animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create New Task</h3>
                  <p className="text-[11px] text-slate-500">
                    Add a work item to track engineering progress
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Project Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Project *</label>
                  <select
                    required
                    value={createProjectId}
                    onChange={(e) => setCreateProjectId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {activeProjectsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.key})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Task Title *</label>
                  <Input
                    required
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Set up in-app notification service"
                    className="h-9 text-xs"
                  />
                </div>

                {/* Status & Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Status</label>
                    <select
                      value={createStatus}
                      onChange={(e) => setCreateStatus(e.target.value as any)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="TODO">TO DO</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="IN_REVIEW">IN REVIEW</option>
                      <option value="DONE">DONE</option>
                      <option value="BLOCKED">BLOCKED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Priority</label>
                    <select
                      value={createPriority}
                      onChange={(e) => setCreatePriority(e.target.value as any)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="URGENT">Urgent</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Med</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>

                {/* Blocked Reason (if BLOCKED) */}
                {createStatus === "BLOCKED" && (
                  <div className="space-y-1 p-3 bg-red-50 border border-red-200 rounded-lg animate-in fade-in">
                    <label className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Blocked Reason *</span>
                    </label>
                    <Input
                      required
                      value={createBlockedReason}
                      onChange={(e) => setCreateBlockedReason(e.target.value)}
                      placeholder="e.g. Waiting on dependency or review"
                      className="h-8 text-xs bg-white border-red-300 focus:ring-red-500"
                    />
                  </div>
                )}

                {/* Due Date & Assignee */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Due Date</label>
                    <Input
                      type="date"
                      value={createDueDate}
                      onChange={(e) => setCreateDueDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Assignee</label>
                    <select
                      value={createAssigneeId}
                      onChange={(e) => setCreateAssigneeId(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {assigneesList.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Description</label>
                  <textarea
                    rows={3}
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="Implementation guidelines, scope boundaries..."
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateModalOpen(false)}
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
                  {submitting ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / DETAILS TASK MODAL */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => !editSubmitting && setEditingTask(null)}
          />
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10 animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                  {editingTask.displayKey || "TASK"}
                </span>
                <span className="text-xs text-slate-400">v{editingTask.version}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/assistant?prompt=${encodeURIComponent(
                    `Help me implement task [${editingTask.displayKey}]: "${editingTask.title}". Provide actionable architecture advice.`
                  )}&mode=DEVELOPER`}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                  title="Ask Copilot for guidance"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Ask Copilot</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateTask}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Project Badge display */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Project:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getProjectBadgeStyle(
                      editingTask.project?.name
                    )}`}
                  >
                    {editingTask.project?.name || "Workspace"}
                  </span>
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Task Title *</label>
                  <Input
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                {editingTask.aiProvenance && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                    <p className="font-semibold">AI proposal sources</p>
                    <p>Generated from {editingTask.aiProvenance.sourceEntityType.toLowerCase()} revision {editingTask.aiProvenance.sourceRevision}.</p>
                    {editingTask.aiProvenance.sourceReferences.map((source) => (
                      <p key={source.chunkId}>{source.title} · revision {source.revision} · {source.locator}</p>
                    ))}
                  </div>
                )}

                {/* Status & Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="TODO">TO DO</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="IN_REVIEW">IN REVIEW</option>
                      <option value="DONE">DONE</option>
                      <option value="BLOCKED">BLOCKED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as any)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="URGENT">Urgent</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Med</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>

                {/* Blocked Reason (if BLOCKED) */}
                {editStatus === "BLOCKED" && (
                  <div className="space-y-1 p-3 bg-red-50 border border-red-200 rounded-lg animate-in fade-in">
                    <label className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Blocked Reason *</span>
                    </label>
                    <Input
                      required
                      value={editBlockedReason}
                      onChange={(e) => setEditBlockedReason(e.target.value)}
                      placeholder="e.g. Waiting on dependency or review"
                      className="h-8 text-xs bg-white border-red-300 focus:ring-red-500"
                    />
                  </div>
                )}

                {/* Due Date & Assignee */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Due Date</label>
                    <Input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Assignee</label>
                    <select
                      value={editAssigneeId}
                      onChange={(e) => setEditAssigneeId(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {assigneesList.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Description</label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Implementation guidelines, scope boundaries..."
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteTask}
                  disabled={editSubmitting}
                  className="text-xs gap-1.5 h-8 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTask(null)}
                    className="text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={editSubmitting}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs px-4 h-8"
                  >
                    {editSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE TASK CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={!!deleteConfirmTask}
        onClose={() => !deletingTask && setDeleteConfirmTask(null)}
        onConfirm={handleConfirmDeleteTask}
        title="Delete task"
        itemName={deleteConfirmTask?.title}
        itemType="task"
        warningText="This action cannot be undone. The task and its subtask dependencies will be permanently deleted."
        confirmText="Delete task"
        loading={deletingTask}
      />
    </AppLayout>
  );
}
