"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import {
  Check,
  ChevronRight,
  LayoutGrid,
  List as ListIcon,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

export type GoalCategory =
  "BUSINESS" | "TECHNICAL" | "FINANCIAL" | "PERSONAL" | "OPERATIONS";

export type GoalStatus =
  "PLANNED" | "ACTIVE" | "ACHIEVED" | "PAUSED" | "ABANDONED";

export type GoalConfidence = "HIGH" | "MEDIUM" | "LOW";

export type GoalReviewCadence =
  "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY";

export interface GoalMilestone {
  id: string;
  title: string;
  targetDate?: string | null;
  completed: boolean;
  completedAt?: string | null;
}

export interface GoalInitiative {
  id: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
}

export interface GoalMetricItem {
  id: string;
  goalId: string;
  name: string;
  unit: string;
  baselineValue: number;
  currentValue: number;
  targetValue: number;
  observationDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface GoalItem {
  id: string;
  userId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  motivation?: string | null;
  status: GoalStatus;
  timeframe?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  baseline?: string | null;
  target?: string | null;
  progress: number;
  measuredProgress?: number;
  confidence: GoalConfidence;
  category: GoalCategory;
  dependencies?: string | null;
  risks?: string | null;
  reviewCadence: GoalReviewCadence;
  lastReviewedAt?: string | null;
  milestones?: GoalMilestone[] | null;
  initiatives?: GoalInitiative[] | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  metrics?: GoalMetricItem[];
  project?: { id: string; name: string; key: string } | null;
}

export interface GoalSummaryResponse {
  id: string;
  title: string;
  status: GoalStatus;
  measuredProgress: number;
  metricsProgress: number;
  milestonesProgress: number;
  tasksProgress: number;
  linkedTasks: Array<{
    id: string;
    number: number;
    title: string;
    status: string;
    priority: string;
    assigneeName?: string | null;
  }>;
  linkedDecisions: Array<{
    id: string;
    number: number;
    title: string;
    status: string;
    decidedAt?: string | null;
  }>;
}

const CATEGORY_COLORS: Record<GoalCategory, string> = {
  BUSINESS: "bg-blue-50 text-blue-700 border-blue-200",
  TECHNICAL: "bg-purple-50 text-purple-700 border-purple-200",
  FINANCIAL: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PERSONAL: "bg-amber-50 text-amber-700 border-amber-200",
  OPERATIONS: "bg-muted text-foreground border-border",
};

const STATUS_COLORS: Record<GoalStatus, string> = {
  PLANNED: "bg-sky-50 text-sky-700 border-sky-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ACHIEVED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  PAUSED: "bg-amber-50 text-amber-700 border-amber-200",
  ABANDONED: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function GoalsPage() {
  const router = useRouter();
  const { user, currentProject, projects, setCurrentProject } = useAuth();
  const { showToast } = useToast();

  const canWriteGoal = (goal: GoalItem) =>
    !goal.projectId
      ? goal.userId === user?.id
      : projects.some(
          (project) =>
            project.id === goal.projectId &&
            project.status !== "ARCHIVED" &&
            (user?.systemRole === "ADMIN" ||
              ["OWNER", "MANAGER", "CONTRIBUTOR"].includes(
                project.currentUserRole || "",
              )),
        );
  const [metricObservationDate, setMetricObservationDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filters
  const [scopeFilter, setScopeFilter] = useState<
    "ALL" | "PROJECT" | "PERSONAL"
  >("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer / Selection
  const [selectedGoal, setSelectedGoal] = useState<GoalItem | null>(null);
  const [goalSummary, setGoalSummary] = useState<GoalSummaryResponse | null>(
    null,
  );
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "metrics" | "milestones" | "work" | "revisions"
  >("overview");
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addMetricModalOpen, setAddMetricModalOpen] = useState(false);

  // Form states for Create Goal
  const [formTitle, setFormTitle] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formMotivation, setFormMotivation] = useState("");
  const [formCategory, setFormCategory] = useState<GoalCategory>("BUSINESS");
  const [formCadence, setFormCadence] = useState<GoalReviewCadence>("WEEKLY");
  const [formTimeframe, setFormTimeframe] = useState("Q4 2026");
  const [formTargetDate, setFormTargetDate] = useState("");
  const [formScope, setFormScope] = useState<string>(
    currentProject?.id || "PERSONAL",
  );
  const [formMilestones, setFormMilestones] = useState<string>("");
  const [formInitiatives, setFormInitiatives] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for Add Metric
  const [metricName, setMetricName] = useState("");
  const [metricUnit, setMetricUnit] = useState("");
  const [metricTargetValue, setMetricTargetValue] = useState<number>(100);
  const [metricCurrentValue, setMetricCurrentValue] = useState<number>(0);
  const [metricNotes, setMetricNotes] = useState("");

  // Quick edit metric
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const [editingMetricValue, setEditingMetricValue] = useState<number>(0);

  // Load goals
  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      // Load user goals and project goals
      const [userGoalsRes, projectGoalsRes] = await Promise.all([
        api.goals.listUserGoals({ limit: 100 }),
        currentProject
          ? api.goals.listProjectGoals(currentProject.id, { limit: 100 })
          : Promise.resolve({ data: [] }),
      ]);

      const allGoalsMap = new Map<string, GoalItem>();
      if (Array.isArray(userGoalsRes?.data)) {
        for (const g of userGoalsRes.data) allGoalsMap.set(g.id, g);
      }
      if (Array.isArray(projectGoalsRes?.data)) {
        for (const g of projectGoalsRes.data) allGoalsMap.set(g.id, g);
      }

      setGoals(Array.from(allGoalsMap.values()));
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to load goals",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [currentProject, showToast]);

  useEffect(() => {
    void loadGoals();
  }, [loadGoals]);

  // Load goal summary when drawer opens
  const loadSummary = useCallback(
    async (goal: GoalItem) => {
      setLoadingSummary(true);
      try {
        const summary = await api.goals.getSummary(
          goal.id,
          goal.projectId || undefined,
        );
        setGoalSummary(summary?.data || summary);
      } catch (err: unknown) {
        showToast(
          err instanceof Error ? err.message : "Failed to load goal summary",
          "error",
        );
      } finally {
        setLoadingSummary(false);
      }
    },
    [showToast],
  );

  const loadRevisions = useCallback(
    async (goal: GoalItem) => {
      setLoadingRevisions(true);
      try {
        const revs = await api.goals.listRevisions(
          goal.id,
          goal.projectId || undefined,
        );
        setRevisions(Array.isArray(revs) ? revs : []);
      } catch (err: unknown) {
        showToast(
          err instanceof Error ? err.message : "Failed to load revisions",
          "error",
        );
      } finally {
        setLoadingRevisions(false);
      }
    },
    [showToast],
  );

  const openGoalDrawer = (goal: GoalItem) => {
    setSelectedGoal(goal);
    setActiveTab("overview");
    void loadSummary(goal);
    void loadRevisions(goal);
  };

  const closeGoalDrawer = () => {
    setSelectedGoal(null);
    setGoalSummary(null);
    setRevisions([]);
  };

  // Filtered goals
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      // Scope filter
      if (scopeFilter === "PERSONAL" && g.projectId) return false;
      if (
        scopeFilter === "PROJECT" &&
        (!g.projectId || (currentProject && g.projectId !== currentProject.id))
      )
        return false;

      // Status filter
      if (statusFilter !== "ALL" && g.status !== statusFilter) return false;

      // Category filter
      if (categoryFilter !== "ALL" && g.category !== categoryFilter)
        return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = g.title.toLowerCase().includes(q);
        const matchesTarget = g.target?.toLowerCase().includes(q) || false;
        const matchesMotivation =
          g.motivation?.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesTarget && !matchesMotivation) return false;
      }

      return true;
    });
  }, [
    goals,
    scopeFilter,
    statusFilter,
    categoryFilter,
    searchQuery,
    currentProject,
  ]);

  const openGoalForm = (goal?: GoalItem) => {
    setEditingGoal(goal || null);
    setFormTitle(goal?.title || "");
    setFormTarget(goal?.target || "");
    setFormMotivation(goal?.motivation || "");
    setFormCategory(goal?.category || "BUSINESS");
    setFormCadence(goal?.reviewCadence || "WEEKLY");
    setFormTimeframe(goal?.timeframe || "");
    setFormTargetDate(goal?.targetDate?.slice(0, 10) || "");
    setFormScope(
      goal ? goal.projectId || "PERSONAL" : currentProject?.id || "PERSONAL",
    );
    setFormMilestones(
      goal?.milestones?.map((item) => item.title).join("\n") || "",
    );
    setFormInitiatives(
      goal?.initiatives?.map((item) => item.title).join("\n") || "",
    );
    setCreateModalOpen(true);
  };

  // Create Goal Handler
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const milestoneItems = formMilestones
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(
          (title, idx) =>
            editingGoal?.milestones?.find((item) => item.title === title) || {
              id: `m-${Date.now()}-${idx}`,
              title,
              completed: false,
            },
        );

      const initiativeItems = formInitiatives
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(
          (title, idx) =>
            editingGoal?.initiatives?.find((item) => item.title === title) || {
              id: `init-${Date.now()}-${idx}`,
              title,
              status: "TODO" as const,
            },
        );

      const projectId = formScope === "PERSONAL" ? undefined : formScope;
      const payload: any = {
        title: formTitle.trim(),
        target: formTarget.trim() || (editingGoal ? null : undefined),
        motivation: formMotivation.trim() || (editingGoal ? null : undefined),
        category: formCategory,
        reviewCadence: formCadence,
        timeframe: formTimeframe.trim() || (editingGoal ? null : undefined),
        targetDate: formTargetDate.trim() || (editingGoal ? null : undefined),
        milestones: milestoneItems.length > 0 ? milestoneItems : undefined,
        initiatives: initiativeItems.length > 0 ? initiativeItems : undefined,
      };

      if (editingGoal) {
        const result = await api.goals.update(
          editingGoal.id,
          {
            ...payload,
            version: editingGoal.version,
            milestones: milestoneItems,
            initiatives: initiativeItems,
            revisionReason: "Updated goal details",
          },
          editingGoal.projectId || undefined,
        );
        const saved = result?.data || result;
        setSelectedGoal(saved);
        void loadSummary(saved);
        void loadRevisions(saved);
      } else await api.goals.create(payload, projectId);
      showToast(editingGoal ? "Goal updated" : "Goal created", "success");
      setCreateModalOpen(false);

      // Reset form
      setFormTitle("");
      setFormTarget("");
      setFormMotivation("");
      setFormMilestones("");
      setFormInitiatives("");
      void loadGoals();
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to create goal",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status update
  const handleUpdateStatus = async (newStatus: GoalStatus) => {
    if (!selectedGoal || !canWriteGoal(selectedGoal)) return;
    try {
      const updated = await api.goals.update(
        selectedGoal.id,
        {
          version: selectedGoal.version,
          status: newStatus,
          revisionReason: `Status changed to ${newStatus}`,
        },
        selectedGoal.projectId || undefined,
      );

      const updatedGoal = updated?.data || updated;
      setSelectedGoal(updatedGoal);
      showToast(`Goal status updated to ${newStatus}`, "info");
      void loadGoals();
      void loadSummary(updatedGoal);
      void loadRevisions(updatedGoal);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to update status",
        "error",
      );
    }
  };

  const handleInitiativeStatus = async (
    id: string,
    status: GoalInitiative["status"],
  ) => {
    if (!selectedGoal || !canWriteGoal(selectedGoal)) return;
    try {
      const result = await api.goals.update(
        selectedGoal.id,
        {
          version: selectedGoal.version,
          initiatives: (selectedGoal.initiatives || []).map((item) =>
            item.id === id ? { ...item, status } : item,
          ),
          revisionReason: "Updated initiative status",
        },
        selectedGoal.projectId || undefined,
      );
      const saved = result?.data || result;
      setSelectedGoal(saved);
      void loadGoals();
      void loadSummary(saved);
      void loadRevisions(saved);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Initiative could not be updated",
        "error",
      );
    }
  };

  // Toggle milestone completion
  const handleToggleMilestone = async (milestoneId: string) => {
    if (!selectedGoal || !canWriteGoal(selectedGoal)) return;
    const currentMilestones = selectedGoal.milestones || [];
    const updatedMilestones = currentMilestones.map((m) =>
      m.id === milestoneId
        ? {
            ...m,
            completed: !m.completed,
            completedAt: !m.completed ? new Date().toISOString() : null,
          }
        : m,
    );

    try {
      const updated = await api.goals.update(
        selectedGoal.id,
        {
          version: selectedGoal.version,
          milestones: updatedMilestones,
          revisionReason: "Updated milestone progress",
        },
        selectedGoal.projectId || undefined,
      );

      const updatedGoal = updated?.data || updated;
      setSelectedGoal(updatedGoal);
      void loadGoals();
      void loadSummary(updatedGoal);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to update milestone",
        "error",
      );
    }
  };

  // Add metric
  const handleAddMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedGoal ||
      !canWriteGoal(selectedGoal) ||
      !metricName.trim() ||
      !metricUnit.trim()
    )
      return;

    try {
      await api.goals.addMetric(
        selectedGoal.id,
        {
          name: metricName.trim(),
          unit: metricUnit.trim(),
          targetValue: Number(metricTargetValue),
          currentValue: Number(metricCurrentValue),
          observationDate: metricObservationDate,
          notes: metricNotes.trim() || undefined,
        },
        selectedGoal.projectId || undefined,
      );

      showToast("Metric added", "success");
      setAddMetricModalOpen(false);
      setMetricName("");
      setMetricUnit("");
      setMetricNotes("");

      // Refresh goal
      const refreshed = await api.goals.get(
        selectedGoal.id,
        selectedGoal.projectId || undefined,
      );
      setSelectedGoal(refreshed?.data || refreshed);
      void loadGoals();
      void loadSummary(refreshed?.data || refreshed);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to add metric",
        "error",
      );
    }
  };

  // Quick edit metric value
  const handleSaveMetricValue = async (metricId: string) => {
    if (!selectedGoal || !canWriteGoal(selectedGoal)) return;
    try {
      await api.goals.updateMetric(
        selectedGoal.id,
        metricId,
        {
          currentValue: Number(editingMetricValue),
          observationDate: new Date().toISOString().slice(0, 10),
        },
        selectedGoal.projectId || undefined,
      );

      setEditingMetricId(null);
      showToast("Metric progress updated", "info");

      const refreshed = await api.goals.get(
        selectedGoal.id,
        selectedGoal.projectId || undefined,
      );
      setSelectedGoal(refreshed?.data || refreshed);
      void loadGoals();
      void loadSummary(refreshed?.data || refreshed);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to update metric",
        "error",
      );
    }
  };

  // Delete metric
  const handleDeleteMetric = async (metricId: string) => {
    if (!selectedGoal || !canWriteGoal(selectedGoal)) return;
    try {
      await api.goals.deleteMetric(
        selectedGoal.id,
        metricId,
        selectedGoal.projectId || undefined,
      );
      showToast("Metric deleted", "info");

      const refreshed = await api.goals.get(
        selectedGoal.id,
        selectedGoal.projectId || undefined,
      );
      setSelectedGoal(refreshed?.data || refreshed);
      void loadGoals();
      void loadSummary(refreshed?.data || refreshed);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to delete metric",
        "error",
      );
    }
  };

  // Delete goal
  const handleDeleteGoal = async () => {
    if (!selectedGoal || !canWriteGoal(selectedGoal)) return;
    try {
      await api.goals.delete(
        selectedGoal.id,
        selectedGoal.projectId || undefined,
      );
      showToast("Goal deleted", "info");
      setDeleteModalOpen(false);
      closeGoalDrawer();
      void loadGoals();
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to delete goal",
        "error",
      );
    }
  };

  // Strategic Review launcher
  const launchStrategicReview = (goal?: GoalItem) => {
    const targetGoal = goal || selectedGoal;
    const prompt = targetGoal
      ? `Conduct a strategic review for goal: "${targetGoal.title}". Evaluate measured progress, alignment with tasks and decisions, and recommend what we should NOT do.`
      : `Conduct a strategic review of our active strategic goals. Evaluate progress across projects, spot gaps, and recommend priorities.`;

    if (targetGoal)
      setCurrentProject(
        projects.find((project) => project.id === targetGoal.projectId) || null,
      );
    router.push(
      `/assistant?mode=STRATEGY&prompt=${encodeURIComponent(prompt)}${targetGoal ? `&goalId=${encodeURIComponent(targetGoal.id)}` : ""}`,
    );
  };

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        {/* Header Bar */}
        <header className="bg-card border-b border-border px-6 py-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-7xl mx-auto w-full">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Target className="w-4 h-4" />
                </div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  Goals
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Define measurable outcomes, connect initiatives to tasks, and
                review progress with OSCAR.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => launchStrategicReview()}
                className="text-xs border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 text-amber-800 font-medium flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                Strategic Review
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setFormScope(currentProject?.id || "PERSONAL");
                  openGoalForm();
                }}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                New Goal
              </Button>
            </div>
          </div>
        </header>

        {/* Filter and Search Bar */}
        <div className="bg-card border-b border-border px-6 py-3 flex-shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 max-w-7xl mx-auto w-full">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Scope filter */}
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value as any)}
                className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Scopes</option>
                {currentProject && (
                  <option value="PROJECT">
                    Project: {currentProject.name}
                  </option>
                )}
                <option value="PERSONAL">Personal Goals</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PLANNED">Planned</option>
                <option value="ACHIEVED">Achieved</option>
                <option value="PAUSED">Paused</option>
                <option value="ABANDONED">Abandoned</option>
              </select>

              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Categories</option>
                <option value="BUSINESS">Business</option>
                <option value="TECHNICAL">Technical</option>
                <option value="FINANCIAL">Financial</option>
                <option value="PERSONAL">Personal</option>
                <option value="OPERATIONS">Operations</option>
              </select>

              {/* Search input */}
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search goals..."
                  className="pl-8 text-xs py-1 h-8 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-label="Table view"
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <section
          aria-label="Goal results"
          className="flex-1 overflow-y-auto px-6 py-6"
        >
          <div className="max-w-7xl mx-auto w-full">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
                <RefreshCw className="w-6 h-6 animate-spin mb-3 text-indigo-500" />
                <span className="text-xs font-medium">Loading goals...</span>
              </div>
            ) : filteredGoals.length === 0 ? (
              <div className="bg-card border border-dashed border-slate-300 rounded-2xl p-12 text-center max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  No Goals Found
                </h3>
                <p className="text-xs text-muted-foreground mt-1 mb-5">
                  {searchQuery ||
                  statusFilter !== "ALL" ||
                  categoryFilter !== "ALL"
                    ? "Try adjusting your filters to find matching goals."
                    : "Start by defining your first strategic goal to give OSCAR context on what matters."}
                </p>
                <Button
                  size="sm"
                  onClick={() => openGoalForm()}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Goal
                </Button>
              </div>
            ) : viewMode === "grid" ? (
              /* Grid / Card View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredGoals.map((goal) => {
                  const milestonesCount = goal.milestones?.length || 0;
                  const completedMilestones =
                    goal.milestones?.filter((m) => m.completed).length || 0;
                  const metricsCount = goal.metrics?.length || 0;

                  return (
                    <div
                      key={goal.id}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openGoalDrawer(goal);
                        }
                      }}
                      onClick={() => openGoalDrawer(goal)}
                      className="group bg-card rounded-xl border border-border/90 hover:border-indigo-300 p-5 shadow-2xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Pills */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              CATEGORY_COLORS[goal.category]
                            }`}
                          >
                            {goal.category}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              STATUS_COLORS[goal.status]
                            }`}
                          >
                            {goal.status}
                          </span>
                        </div>

                        {/* Title & Target */}
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {goal.title}
                        </h3>

                        {goal.target && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            <span className="font-semibold text-muted-foreground">
                              Target:
                            </span>{" "}
                            {goal.target}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 pt-4 border-t border-border">
                        {/* Progress Bar */}
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground text-[11px] font-medium">
                            Measured Progress
                          </span>
                          <span className="font-bold text-foreground text-xs">
                            {goal.measuredProgress ?? goal.progress}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              (goal.measuredProgress ?? goal.progress) >= 100
                                ? "bg-indigo-600"
                                : (goal.measuredProgress ?? goal.progress) >= 50
                                  ? "bg-emerald-500"
                                  : "bg-blue-500"
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(0, goal.measuredProgress ?? goal.progress))}%`,
                            }}
                          />
                        </div>

                        {/* Badges footer */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3 pt-1">
                          <div className="flex items-center gap-3">
                            {metricsCount > 0 && (
                              <span>{metricsCount} metrics</span>
                            )}
                            {milestonesCount > 0 && (
                              <span>
                                {completedMilestones}/{milestonesCount}{" "}
                                milestones
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-muted-foreground">
                            {goal.projectId ? (
                              <span className="bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded text-[10px]">
                                {goal.project?.name || "Project"}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                Personal
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Table View */
              <div className="bg-card border border-border/90 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs text-muted-foreground">
                  <thead className="bg-muted/80 text-[11px] font-semibold text-foreground uppercase border-b border-border">
                    <tr>
                      <th className="px-5 py-3">Goal</th>
                      <th className="px-4 py-3">Scope</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Cadence</th>
                      <th className="px-4 py-3 w-40">Progress</th>
                      <th className="px-3 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGoals.map((goal) => (
                      <tr
                        key={goal.id}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openGoalDrawer(goal);
                          }
                        }}
                        onClick={() => openGoalDrawer(goal)}
                        className="hover:bg-muted/80 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-foreground line-clamp-1">
                            {goal.title}
                          </div>
                          {goal.target && (
                            <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {goal.target}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                          {goal.projectId ? (
                            <span className="bg-muted border border-border px-2 py-0.5 rounded text-[10px]">
                              {goal.project?.name || "Project"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">
                              Personal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              CATEGORY_COLORS[goal.category]
                            }`}
                          >
                            {goal.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              STATUS_COLORS[goal.status]
                            }`}
                          >
                            {goal.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">
                          {goal.reviewCadence}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.max(0, goal.measuredProgress ?? goal.progress))}%`,
                                }}
                              />
                            </div>
                            <span className="font-bold text-foreground text-[11px]">
                              {goal.measuredProgress ?? goal.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-right whitespace-nowrap">
                          <ChevronRight className="w-4 h-4 text-muted-foreground inline" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Goal Detail Drawer */}
      {selectedGoal && (
        <Modal
          label={selectedGoal.title}
          onClose={closeGoalDrawer}
          placement="right"
        >
          {/* Drawer container */}
          <aside className="relative w-full max-w-2xl bg-card h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <header className="px-6 py-4 border-b border-border flex items-start justify-between bg-muted/60 flex-shrink-0">
              <div className="flex-1 pr-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      CATEGORY_COLORS[selectedGoal.category]
                    }`}
                  >
                    {selectedGoal.category}
                  </span>

                  <span className="text-[11px] text-muted-foreground font-medium">
                    {selectedGoal.projectId
                      ? `Project: ${selectedGoal.project?.name || "Scoped"}`
                      : "Personal"}
                  </span>

                  <span className="text-[11px] text-muted-foreground">
                    · Cadence: {selectedGoal.reviewCadence}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-foreground leading-snug">
                  {selectedGoal.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeGoalDrawer}
                  aria-label="Close details"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Strategic Review Banner inside Drawer */}
            <div className="bg-muted border-b border-border px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                <Sparkles className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span>Review progress and priorities with OSCAR</span>
              </div>
              <Button
                size="sm"
                onClick={() => launchStrategicReview(selectedGoal)}
                className="text-xs bg-primary hover:opacity-90 text-primary-foreground font-semibold shadow-2xs py-1 h-7"
              >
                Start Review
              </Button>
            </div>

            {/* Status & Quick Actions Bar */}
            <div className="px-6 py-3 border-b border-border flex items-center justify-between text-xs bg-card">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">
                  Status:
                </span>
                <select
                  value={selectedGoal.status}
                  onChange={(e) =>
                    handleUpdateStatus(e.target.value as GoalStatus)
                  }
                  className="border border-border rounded-md px-2 py-1 bg-card font-semibold text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PLANNED">PLANNED</option>
                  <option value="ACHIEVED">ACHIEVED</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="ABANDONED">ABANDONED</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!canWriteGoal(selectedGoal)}
                  onClick={() => openGoalForm(selectedGoal)}
                  className="text-xs font-medium hover:underline"
                >
                  Edit goal
                </button>
                <button
                  type="button"
                  disabled={!canWriteGoal(selectedGoal)}
                  onClick={() => setDeleteModalOpen(true)}
                  className="text-rose-600 hover:text-rose-700 text-xs font-medium flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Goal
                </button>
              </div>
            </div>

            {/* Drawer Tabs */}
            <div className="px-6 border-b border-border flex gap-4 text-xs font-semibold text-muted-foreground bg-card">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`py-2.5 border-b-2 transition-colors ${
                  activeTab === "overview"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent hover:text-foreground"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("metrics")}
                className={`py-2.5 border-b-2 transition-colors ${
                  activeTab === "metrics"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent hover:text-foreground"
                }`}
              >
                Metrics ({selectedGoal.metrics?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("milestones")}
                className={`py-2.5 border-b-2 transition-colors ${
                  activeTab === "milestones"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent hover:text-foreground"
                }`}
              >
                Milestones ({selectedGoal.milestones?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("work")}
                className={`py-2.5 border-b-2 transition-colors ${
                  activeTab === "work"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent hover:text-foreground"
                }`}
              >
                Linked Work
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("revisions")}
                className={`py-2.5 border-b-2 transition-colors ${
                  activeTab === "revisions"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent hover:text-foreground"
                }`}
              >
                History
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Measured Progress Breakdown */}
                  <div className="bg-muted/80 border border-border/90 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Measured Progress Breakdown
                        </h4>
                        {loadingSummary && (
                          <RefreshCw className="w-3 h-3 text-muted-foreground animate-spin" />
                        )}
                      </div>
                      <span className="text-base font-extrabold text-indigo-600">
                        {goalSummary?.measuredProgress ?? selectedGoal.progress}
                        %
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              goalSummary?.measuredProgress ??
                                selectedGoal.progress,
                            ),
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-card border border-border rounded-lg p-2.5">
                        <div className="text-[10px] text-muted-foreground font-medium">
                          Metrics Progress
                        </div>
                        <div className="text-sm font-bold text-foreground mt-0.5">
                          {goalSummary?.metricsProgress ?? 0}%
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          Outcome
                        </div>
                      </div>

                      <div className="bg-card border border-border rounded-lg p-2.5">
                        <div className="text-[10px] text-muted-foreground font-medium">
                          Milestones
                        </div>
                        <div className="text-sm font-bold text-foreground mt-0.5">
                          {goalSummary?.milestonesProgress ?? 0}%
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          Milestones
                        </div>
                      </div>

                      <div className="bg-card border border-border rounded-lg p-2.5">
                        <div className="text-[10px] text-muted-foreground font-medium">
                          Tasks Done
                        </div>
                        <div className="text-sm font-bold text-foreground mt-0.5">
                          {goalSummary?.tasksProgress ?? 0}%
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          Activity
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Target & Motivation */}
                  {selectedGoal.target && (
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                        Specific Target
                      </h4>
                      <p className="text-xs text-foreground leading-relaxed bg-card border border-border rounded-lg p-3">
                        {selectedGoal.target}
                      </p>
                    </div>
                  )}

                  {selectedGoal.motivation && (
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                        Motivation / Strategic Value
                      </h4>
                      <p className="text-xs text-foreground leading-relaxed bg-card border border-border rounded-lg p-3">
                        {selectedGoal.motivation}
                      </p>
                    </div>
                  )}

                  {/* Key Initiatives */}
                  {selectedGoal.initiatives &&
                    selectedGoal.initiatives.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                          Key Initiatives
                        </h4>
                        <div className="space-y-2">
                          {selectedGoal.initiatives.map((init) => (
                            <div
                              key={init.id}
                              className="bg-card border border-border rounded-lg p-3 flex items-center justify-between text-xs"
                            >
                              <span className="font-medium text-foreground">
                                {init.title}
                              </span>
                              <select
                                aria-label={`Status of ${init.title}`}
                                disabled={!canWriteGoal(selectedGoal)}
                                value={init.status}
                                onChange={(event) =>
                                  void handleInitiativeStatus(
                                    init.id,
                                    event.target
                                      .value as GoalInitiative["status"],
                                  )
                                }
                                className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                              >
                                <option value="TODO">To do</option>
                                <option value="IN_PROGRESS">In progress</option>
                                <option value="DONE">Done</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {activeTab === "metrics" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Quantified Key Results
                    </h4>
                    <Button
                      size="sm"
                      disabled={!canWriteGoal(selectedGoal)}
                      onClick={() => setAddMetricModalOpen(true)}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1 h-7"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Metric
                    </Button>
                  </div>

                  {!selectedGoal.metrics ||
                  selectedGoal.metrics.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground">
                      No metrics added yet. Add measurable metrics to drive
                      empirical progress calculations.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedGoal.metrics.map((metric) => {
                        const progressPct =
                          metric.targetValue !== metric.baselineValue
                            ? Math.round(
                                ((metric.currentValue - metric.baselineValue) /
                                  (metric.targetValue - metric.baselineValue)) *
                                  100,
                              )
                            : 0;

                        return (
                          <div
                            key={metric.id}
                            className="bg-card border border-border rounded-xl p-4 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h5 className="text-xs font-bold text-foreground">
                                  {metric.name}
                                </h5>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                  Current:{" "}
                                  <span className="font-semibold text-foreground">
                                    {metric.currentValue} {metric.unit}
                                  </span>{" "}
                                  / Target:{" "}
                                  <span className="font-semibold text-foreground">
                                    {metric.targetValue} {metric.unit}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Observed{" "}
                                  {metric.observationDate ||
                                    "date not recorded"}
                                </p>
                                {metric.notes && (
                                  <p className="text-[11px] text-muted-foreground mt-1 italic">
                                    &ldquo;{metric.notes}&rdquo;
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                {editingMetricId === metric.id ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      value={editingMetricValue}
                                      onChange={(e) =>
                                        setEditingMetricValue(
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-16 h-7 text-xs py-0 px-2"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSaveMetricValue(metric.id)
                                      }
                                      aria-label="Save metric value"
                                      className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingMetricId(null)}
                                      aria-label="Cancel editing"
                                      className="p-1.5 bg-slate-200 text-muted-foreground rounded hover:bg-slate-300"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMetricId(metric.id);
                                      setEditingMetricValue(
                                        metric.currentValue,
                                      );
                                    }}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded bg-indigo-50 border border-indigo-100"
                                  >
                                    Update
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteMetric(metric.id)}
                                  aria-label="Delete metric"
                                  className="p-1 text-muted-foreground hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-3">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                <span>Progress</span>
                                <span className="font-semibold text-foreground">
                                  {progressPct}%
                                </span>
                              </div>
                              <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 rounded-full"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, progressPct))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "milestones" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                    Milestones Checklist
                  </h4>

                  {!selectedGoal.milestones ||
                  selectedGoal.milestones.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground">
                      No milestones set for this goal.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedGoal.milestones.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => handleToggleMilestone(m.id)}
                          className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        >
                          <input
                            type="checkbox"
                            disabled={!canWriteGoal(selectedGoal)}
                            checked={m.completed}
                            onChange={() => {}} // handled by parent div click
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          <span
                            className={`text-xs font-medium flex-1 ${
                              m.completed
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {m.title}
                          </span>
                          {m.targetDate && (
                            <span className="text-[10px] text-muted-foreground">
                              {m.targetDate}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "work" && (
                <div className="space-y-6">
                  {/* Linked Tasks */}
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      Linked Tasks ({goalSummary?.linkedTasks?.length || 0})
                    </h4>
                    {!goalSummary?.linkedTasks ||
                    goalSummary.linkedTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        No tasks currently linked to this goal.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {goalSummary.linkedTasks.map((task) => (
                          <div
                            key={task.id}
                            className="bg-card border border-border rounded-lg p-3 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-muted-foreground text-[10px]">
                                #{task.number}
                              </span>
                              <Link
                                href={`/tasks?search=${encodeURIComponent(task.title)}`}
                                className="font-medium text-foreground hover:text-indigo-600 hover:underline"
                              >
                                {task.title}
                              </Link>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                task.status === "DONE"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {task.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Linked Decisions */}
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      Linked Decisions (
                      {goalSummary?.linkedDecisions?.length || 0})
                    </h4>
                    {!goalSummary?.linkedDecisions ||
                    goalSummary.linkedDecisions.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        No decisions currently linked to this goal.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {goalSummary.linkedDecisions.map((dec) => (
                          <div
                            key={dec.id}
                            className="bg-card border border-border rounded-lg p-3 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-muted-foreground text-[10px]">
                                #{dec.number}
                              </span>
                              <Link
                                href={`/decisions?search=${encodeURIComponent(dec.title)}`}
                                className="font-medium text-foreground hover:text-indigo-600 hover:underline"
                              >
                                {dec.title}
                              </Link>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                dec.status === "ACCEPTED"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {dec.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "revisions" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                    Revision History
                  </h4>
                  {loadingRevisions ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Loading revisions...
                    </div>
                  ) : revisions.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">
                      No revision records found.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {revisions.map((rev) => (
                        <div key={rev.id} className="py-3 text-xs">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="font-semibold text-foreground">
                              Version {rev.version}
                            </span>
                            <span className="text-[10px]">
                              {new Date(rev.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-foreground font-medium mt-1">
                            {rev.reason || "Goal updated"}
                          </p>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            Status: {rev.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </Modal>
      )}

      {/* Create Goal Modal */}
      {createModalOpen && (
        <Modal
          label={editingGoal ? "Edit goal" : "New goal"}
          onClose={() => setCreateModalOpen(false)}
          busy={isSubmitting}
        >
          <div className="bg-card rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <header className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground text-sm">
                {editingGoal ? "Edit goal" : "New goal"}
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                aria-label="Close modal"
                className="text-muted-foreground hover:text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <form
              onSubmit={handleCreateGoal}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Goal Title *
                </label>
                <Input
                  required
                  aria-label="Goal title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Achieve $10k MRR with 20 active customers"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Specific Target
                </label>
                <Input
                  aria-label="Target outcome"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  placeholder="e.g. 20 paying customers with churn < 2%"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Motivation / Strategic Why
                </label>
                <textarea
                  aria-label="Why this matters"
                  value={formMotivation}
                  onChange={(e) => setFormMotivation(e.target.value)}
                  placeholder="Explain why this outcome matters and how it informs priority decisions."
                  className="w-full text-xs border border-border rounded-lg p-2.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) =>
                      setFormCategory(e.target.value as GoalCategory)
                    }
                    className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-card"
                  >
                    <option value="BUSINESS">Business</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="FINANCIAL">Financial</option>
                    <option value="PERSONAL">Personal</option>
                    <option value="OPERATIONS">Operations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Review Cadence
                  </label>
                  <select
                    value={formCadence}
                    onChange={(e) =>
                      setFormCadence(e.target.value as GoalReviewCadence)
                    }
                    className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-card"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Bi-weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="DAILY">Daily</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Scope
                  </label>
                  <select
                    disabled={!!editingGoal}
                    value={formScope}
                    onChange={(e) => setFormScope(e.target.value)}
                    className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-card"
                  >
                    <option value="PERSONAL">Personal Goal (No Project)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        Project: {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Timeframe
                  </label>
                  <Input
                    aria-label="Timeframe"
                    value={formTimeframe}
                    onChange={(e) => setFormTimeframe(e.target.value)}
                    placeholder="e.g. Q4 2026"
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Target Date
                </label>
                <Input
                  type="date"
                  aria-label="Target date"
                  value={formTargetDate}
                  onChange={(e) => setFormTargetDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Milestones (one per line)
                </label>
                <textarea
                  aria-label="Milestones"
                  value={formMilestones}
                  onChange={(e) => setFormMilestones(e.target.value)}
                  placeholder="Deploy beta to production&#10;Onboard first 5 design partners&#10;Reach 20 paying customers"
                  className="w-full text-xs border border-border rounded-lg p-2.5"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Key Initiatives (one per line)
                </label>
                <textarea
                  aria-label="Initiatives"
                  value={formInitiatives}
                  onChange={(e) => setFormInitiatives(e.target.value)}
                  placeholder="Setup Stripe billing portal&#10;Conduct weekly feedback calls"
                  className="w-full text-xs border border-border rounded-lg p-2.5"
                  rows={2}
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
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
                  disabled={isSubmitting}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  {isSubmitting
                    ? "Saving…"
                    : editingGoal
                      ? "Save changes"
                      : "Create goal"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Add Metric Modal */}
      {addMetricModalOpen && (
        <Modal
          label="Add metric"
          onClose={() => setAddMetricModalOpen(false)}
          busy={false}
        >
          <div className="bg-card rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-foreground text-sm mb-4">
              Add Key Metric
            </h3>
            <form onSubmit={handleAddMetric} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Metric Name *
                </label>
                <Input
                  required
                  aria-label="Metric name"
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  placeholder="e.g. Monthly Recurring Revenue"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Target Value *
                  </label>
                  <Input
                    required
                    type="number"
                    aria-label="Target value"
                    value={metricTargetValue}
                    onChange={(e) =>
                      setMetricTargetValue(Number(e.target.value))
                    }
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Current Value
                  </label>
                  <Input
                    type="number"
                    aria-label="Current value"
                    value={metricCurrentValue}
                    onChange={(e) =>
                      setMetricCurrentValue(Number(e.target.value))
                    }
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Unit *
                </label>
                <Input
                  required
                  aria-label="Unit"
                  value={metricUnit}
                  onChange={(e) => setMetricUnit(e.target.value)}
                  placeholder="e.g. USD, users, %"
                  className="text-xs"
                />
              </div>

              <label className="block text-xs font-semibold">
                Observed on
                <input
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
                  type="date"
                  required
                  value={metricObservationDate}
                  onChange={(event) =>
                    setMetricObservationDate(event.target.value)
                  }
                />
              </label>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Notes
                </label>
                <Input
                  aria-label="Observation notes"
                  value={metricNotes}
                  onChange={(e) => setMetricNotes(e.target.value)}
                  placeholder="Source or context note"
                  className="text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddMetricModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  Save Metric
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Delete Goal Modal */}
      {deleteModalOpen && selectedGoal && (
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDeleteGoal}
          title="Delete Goal"
          itemName={selectedGoal.title}
          itemType="goal"
          warningText="Are you sure you want to delete this goal? This will unlink associated metrics and progress data."
        />
      )}
    </AppLayout>
  );
}
