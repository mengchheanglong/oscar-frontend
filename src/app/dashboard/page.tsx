"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  CheckSquare,
  FileText,
  Files,
  FileCode,
  Image as ImageIcon,
  FileCheck2,
  Calendar,
  Bookmark,
  Sparkles,
  ArrowRight,
  Plus,
  Clock,
  User as UserIcon,
} from "lucide-react";

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "Recently";
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatActivity(action: string, entityType: string, metadata: any): { text: string; highlight?: string } {
  switch (action) {
    case "CREATE_TASK":
      return { text: "created task", highlight: metadata?.title || metadata?.name || "Task" };
    case "UPDATE_TASK_STATUS":
      return { text: `updated task status to ${metadata?.newStatus || "updated"}`, highlight: metadata?.title };
    case "CREATE_REQUIREMENT":
      return { text: "defined requirement", highlight: metadata?.title || metadata?.displayKey || "Requirement" };
    case "UPDATE_REQUIREMENT":
      return { text: "updated requirement", highlight: metadata?.title || "Requirement" };
    case "CREATE_DECISION":
      return { text: "recorded decision", highlight: metadata?.title || "Architecture Decision" };
    case "UPDATE_DECISION":
      return { text: "updated decision", highlight: metadata?.title || "Decision" };
    case "UPLOAD_DOCUMENT":
    case "CREATE_DOCUMENT":
      return { text: "uploaded document", highlight: metadata?.title || metadata?.originalFilename || "Document" };
    case "CREATE_MEETING":
      return { text: "scheduled meeting", highlight: metadata?.title || "Meeting" };
    case "PROJECT_CREATED":
      return { text: "created project workspace", highlight: metadata?.name || "" };
    default:
      return { text: action.replace(/_/g, " ").toLowerCase(), highlight: metadata?.title || metadata?.name };
  }
}

export default function DashboardPage() {
  const { currentProject, user, projects, setCurrentProject } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [recentReqs, setRecentReqs] = useState<any[]>([]);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        if (!currentProject) {
          // "All Projects" consolidated dashboard
          const [allTasksRes, allReqsRes, allDocsRes] = await Promise.all([
            api.tasks.listAll({ pageSize: 100 }).catch(() => ({ data: [] })),
            api.requirements.listAll({ pageSize: 100 }).catch(() => ({ data: [] })),
            api.documents.listAll({ pageSize: 10 }).catch(() => ({ data: [] })),
          ]);

          const allTasks: any[] = allTasksRes?.data || [];
          const allReqs: any[] = allReqsRes?.data || [];
          const allDocs: any[] = allDocsRes?.data || [];

          // Compute aggregate metrics
          const taskCounts: Record<string, number> = {
            TODO: 0,
            IN_PROGRESS: 0,
            IN_REVIEW: 0,
            DONE: 0,
            BLOCKED: 0,
            CANCELLED: 0,
          };
          let overdueCount = 0;
          const today = new Date().toISOString().split("T")[0];
          for (const t of allTasks) {
            if (taskCounts[t.status] !== undefined) taskCounts[t.status]++;
            if (t.dueDate && t.dueDate < today && t.status !== "DONE" && t.status !== "CANCELLED") {
              overdueCount++;
            }
          }

          const reqCounts: Record<string, number> = {
            DRAFT: 0,
            APPROVED: 0,
            IN_PROGRESS: 0,
            DONE: 0,
          };
          for (const r of allReqs) {
            if (reqCounts[r.status] !== undefined) reqCounts[r.status]++;
          }

          setStats({
            taskCountsByStatus: taskCounts,
            overdueTasksCount: overdueCount,
            requirementCountsByStatus: reqCounts,
            taskProgress: {
              total: allTasks.length,
              completed: taskCounts.DONE,
              percentage:
                allTasks.length > 0
                  ? Math.round((taskCounts.DONE / allTasks.length) * 100)
                  : 0,
            },
          });

          setRecentReqs(allReqs.slice(0, 3));
          setRecentDocs(allDocs.slice(0, 3));
          setActivity([]);
          return;
        }

        const [dashData, actEnvelope, reqsRes, docsRes] = await Promise.all([
          api.dashboard.get(currentProject.id).catch(() => null),
          api.dashboard.getActivity(currentProject.id, 1, 10).catch(() => null),
          api.requirements.list(currentProject.id).catch(() => []),
          api.documents.list(currentProject.id).catch(() => ({ data: [] })),
        ]);

        const rawDash = dashData?.data ?? dashData;
        if (rawDash) setStats(rawDash);

        if (actEnvelope?.data && actEnvelope.data.length > 0) {
          setActivity(actEnvelope.data);
        } else if (rawDash?.recentActivity && rawDash.recentActivity.length > 0) {
          setActivity(rawDash.recentActivity);
        } else {
          setActivity([]);
        }

        const rawReqs: any[] = Array.isArray(reqsRes) ? reqsRes : ((reqsRes as any)?.data ?? []);
        setRecentReqs(rawReqs.slice(0, 3));

        const rawDocs: any[] = Array.isArray(docsRes) ? docsRes : ((docsRes as any)?.data ?? []);
        setRecentDocs(rawDocs.slice(0, 3));
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [currentProject]);

  // Derived user name & date
  const userName = user?.displayName
    ? user.displayName.split(" ")[0]
    : user?.fullName
    ? user.fullName.split(" ")[0]
    : "Member";

  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  // Real Metrics from backend
  const activeProjectsCount = projects.filter((p) => p.status !== "ARCHIVED").length;
  const totalProjectsCount = projects.length;

  const todoTasks = stats?.taskCountsByStatus?.TODO ?? 0;
  const inProgressTasks = stats?.taskCountsByStatus?.IN_PROGRESS ?? 0;
  const inReviewTasks = stats?.taskCountsByStatus?.IN_REVIEW ?? 0;
  const doneTasks = stats?.taskCountsByStatus?.DONE ?? 0;
  const cancelledTasks = stats?.taskCountsByStatus?.CANCELLED ?? 0;

  const openTasksCount = todoTasks + inProgressTasks + inReviewTasks;
  const overdueTasksCount = stats?.overdueTasksCount ?? 0;

  const reqDraft = stats?.requirementCountsByStatus?.DRAFT ?? 0;
  const reqApproved = stats?.requirementCountsByStatus?.APPROVED ?? 0;
  const reqInProgress = stats?.requirementCountsByStatus?.IN_PROGRESS ?? 0;
  const reqDone = stats?.requirementCountsByStatus?.DONE ?? 0;
  const totalReqs = reqDraft + reqApproved + reqInProgress + reqDone;

  const docsCount = recentDocs.length;

  // Task breakdown percentages
  const totalTasks = stats?.taskProgress?.total ?? (todoTasks + inProgressTasks + inReviewTasks + doneTasks);
  const progressPct = stats?.taskProgress?.percentage ?? (totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0);

  const todoPct = totalTasks > 0 ? Math.round((todoTasks / totalTasks) * 100) : 0;
  const inProgPct = totalTasks > 0 ? Math.round(((inProgressTasks + inReviewTasks) / totalTasks) * 100) : 0;
  const donePct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const blockedPct = Math.max(0, 100 - (todoPct + inProgPct + donePct));

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        {/* Welcome Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-serif">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Welcome back, {userName} — here&apos;s the live overview for{" "}
            <span className="font-semibold text-slate-800">{currentProject?.name || "all workspaces"}</span>.{" "}
            {todayFormatted}
          </p>
        </div>

        {/* Top 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Active Projects */}
          <Link
            href="/projects"
            className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-codex-accent/40 hover:shadow-sm transition-all block group"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-slate-400 group-hover:text-codex-accent transition-colors" />
                <span>Active Projects</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-codex-accent" />
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900 font-serif">
              {activeProjectsCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {totalProjectsCount} total workspace{totalProjectsCount === 1 ? "" : "s"}
            </div>
          </Link>

          {/* Card 2: Open Tasks */}
          <Link
            href="/tasks"
            className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-codex-accent/40 hover:shadow-sm transition-all block group"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-slate-400 group-hover:text-codex-accent transition-colors" />
                <span>Open Tasks</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-codex-accent" />
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900 font-serif">
              {openTasksCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {overdueTasksCount > 0 ? (
                <span className="text-amber-600 font-medium">{overdueTasksCount} overdue</span>
              ) : (
                `${doneTasks} completed`
              )}
            </div>
          </Link>

          {/* Card 3: Requirements */}
          <Link
            href="/requirements"
            className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-codex-accent/40 hover:shadow-sm transition-all block group"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400 group-hover:text-codex-accent transition-colors" />
                <span>Requirements</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-codex-accent" />
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900 font-serif">
              {totalReqs}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {reqApproved} approved · {reqDraft} draft
            </div>
          </Link>

          {/* Card 4: Documents */}
          <Link
            href="/documents"
            className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-codex-accent/40 hover:shadow-sm transition-all block group"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <div className="flex items-center gap-2">
                <Files className="w-4 h-4 text-slate-400 group-hover:text-codex-accent transition-colors" />
                <span>Documents</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-codex-accent" />
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900 font-serif">
              {docsCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Project knowledge assets
            </div>
          </Link>
        </div>

        {/* 2-Column Split: Main Left (~70%) and Right Activity Sidebar (~30%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Left Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Featured Project Hero Banner (Dark Navy Card) */}
            <div className="bg-[#161927] rounded-2xl p-6 text-white shadow-md border border-slate-800 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 max-w-xl">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-codex-hover border border-blue-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-codex-accent animate-pulse" />
                    Key: {currentProject?.key || "AIW"} · Role: {currentProject?.currentUserRole || "Member"}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {currentProject?.name || "Active Workspace"}
                    </h2>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      {currentProject?.description ||
                        "Centralize requirements, decisions, tasks, meetings, and documents into one permission-aware workspace."}
                    </p>
                  </div>

                  {/* Stats Row */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs text-slate-300">
                    <div>
                      <span className="font-bold text-white">{doneTasks} / {totalTasks}</span> Tasks done
                    </div>
                    <div>
                      <span className="font-bold text-white">{totalReqs}</span> Requirements
                    </div>
                    <div>
                      <span className="font-bold text-white">{docsCount}</span> Documents
                    </div>
                    <div>
                      <span className="font-bold text-white capitalize">{currentProject?.status?.toLowerCase() || "Active"}</span> Status
                    </div>
                  </div>
                </div>

                {/* Circular Progress Indicator */}
                <div className="flex flex-col items-center justify-center shrink-0 space-y-2.5">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-800"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-codex-accent transition-all duration-500"
                        strokeDasharray={`${progressPct}, 100`}
                        strokeLinecap="round"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-base font-bold text-white leading-none">{progressPct}%</span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">
                        complete
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold text-codex-hover bg-blue-500/10 border border-blue-500/30">
                    {stats?.taskProgress?.label || `${progressPct}% done`}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Active Projects List */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Your Projects</h3>
                <Link
                  href="/projects"
                  className="text-xs font-semibold text-codex-accent hover:underline flex items-center gap-1"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No projects available. Create your first project to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((proj) => {
                    const isSelected = currentProject?.id === proj.id;
                    return (
                      <div
                        key={proj.id}
                        onClick={() => setCurrentProject(proj)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? "border-codex-accent/60 bg-blue-50/20 shadow-xs"
                            : "border-slate-200/90 hover:border-codex-accent/40 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {proj.key}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {proj.name}
                            </span>
                            {isSelected && (
                              <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700">
                                Active Workspace
                              </Badge>
                            )}
                          </div>
                          <Badge variant={proj.status === "ACTIVE" ? "ontrack" : "secondary"}>
                            {proj.status === "ACTIVE" ? "Active" : proj.status}
                          </Badge>
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {proj.description || "Workspace for requirements, tasks, decisions, and documents."}
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span>Role: {proj.currentUserRole || "Member"}</span>
                          <span>Created {formatTimeAgo(proj.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Task Statistics Section */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Task Statistics</h3>
                <Link
                  href="/tasks"
                  className="text-xs font-semibold text-codex-accent hover:underline flex items-center gap-1"
                >
                  <span>All tasks</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Segmented Horizontal Bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-slate-400 transition-all duration-300"
                  style={{ width: `${todoPct}%` }}
                  title={`To Do: ${todoTasks}`}
                />
                <div
                  className="h-full bg-codex-accent transition-all duration-300"
                  style={{ width: `${inProgPct}%` }}
                  title={`In Progress / Review: ${inProgressTasks + inReviewTasks}`}
                />
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${donePct}%` }}
                  title={`Done: ${doneTasks}`}
                />
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${blockedPct}%` }}
                  title={`Cancelled / Other: ${cancelledTasks}`}
                />
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-6 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-slate-400 shrink-0" />
                  <span className="text-slate-600">To Do</span>
                  <span className="font-bold text-slate-900">{todoTasks}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-codex-accent shrink-0" />
                  <span className="text-slate-600">In Progress</span>
                  <span className="font-bold text-slate-900">{inProgressTasks + inReviewTasks}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
                  <span className="text-slate-600">Done</span>
                  <span className="font-bold text-slate-900">{doneTasks}</span>
                </div>
                {cancelledTasks > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-500 shrink-0" />
                    <span className="text-slate-600">Cancelled</span>
                    <span className="font-bold text-slate-900">{cancelledTasks}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Recent Requirements Section */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Recent Requirements</h3>
                <Link
                  href="/requirements"
                  className="text-xs font-semibold text-codex-accent hover:underline flex items-center gap-1"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {recentReqs.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No requirements created yet in this workspace.{" "}
                  <Link href="/requirements" className="text-codex-accent hover:underline font-medium">
                    Define a requirement
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentReqs.map((req) => (
                    <Link
                      key={req.id}
                      href={`/requirements?search=${encodeURIComponent(req.displayKey || req.title)}`}
                      className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0 group block"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-codex-accent flex items-center justify-center shrink-0 border border-blue-100">
                          <FileCheck2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs font-semibold text-slate-900 truncate group-hover:text-codex-accent transition-colors">
                            {req.title}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            {req.displayKey && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                                {req.displayKey}
                              </span>
                            )}
                            <span>Priority: {req.priority || "MEDIUM"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant={req.status === "APPROVED" ? "ontrack" : req.status === "IN_PROGRESS" ? "atrisk" : "secondary"}>
                          {req.status}
                        </Badge>
                        <span className="text-[10px] text-slate-400">{formatTimeAgo(req.updatedAt || req.createdAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Recent Documents Section */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Recent Documents</h3>
                <Link
                  href="/documents"
                  className="text-xs font-semibold text-codex-accent hover:underline flex items-center gap-1"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {recentDocs.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No documents uploaded yet.{" "}
                  <Link href="/documents" className="text-codex-accent hover:underline font-medium">
                    Upload a project document
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentDocs.map((doc) => {
                    const isPdf = doc.mimeType?.includes("pdf") || doc.originalFilename?.endsWith(".pdf");
                    const isImg = doc.mimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(doc.originalFilename);

                    return (
                      <Link
                        key={doc.id}
                        href={`/documents?search=${encodeURIComponent(doc.title || doc.originalFilename)}`}
                        className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0 group block"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                              isPdf
                                ? "bg-red-50 text-red-600 border-red-100"
                                : isImg
                                ? "bg-blue-50 text-codex-accent border-blue-100"
                                : "bg-amber-50 text-amber-600 border-amber-100"
                            }`}
                          >
                            {isPdf ? (
                              <FileText className="w-4 h-4" />
                            ) : isImg ? (
                              <ImageIcon className="w-4 h-4" />
                            ) : (
                              <FileCode className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="text-xs font-semibold text-slate-900 truncate group-hover:text-codex-accent transition-colors">
                              {doc.title || doc.originalFilename}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                              <span className="font-mono text-[10px] text-slate-400">
                                {formatBytes(doc.sizeBytes)} · Rev {doc.revision ?? 1}
                              </span>
                              <span>Status: {doc.processingStatus || "Unknown"}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTimeAgo(doc.createdAt)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Recent Activity Feed (~30%) */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs sticky top-20">
              <h3 className="text-base font-bold font-serif text-slate-900 mb-5">Recent Activity</h3>

              {activity.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No activity recorded yet for this project.
                </div>
              ) : (
                <div className="relative">
                  {activity.map((item, idx) => {
                    const actorName = item.actor?.displayName || item.actor?.email?.split("@")[0] || "Team Member";
                    const actorInitials = actorName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "TM";
                    const isLast = idx === activity.length - 1;
                    const parsed = formatActivity(item.action, item.entityType, item.metadata);

                    return (
                      <div key={item.id || idx} className={`relative flex items-start gap-3.5 ${isLast ? "" : "pb-5"}`}>
                        {!isLast && (
                          <span
                            className="absolute left-4 top-4 -bottom-1 w-[1.5px] -translate-x-1/2 bg-slate-200"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative z-10 w-8 h-8 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                          {actorInitials}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-xs text-slate-700 leading-relaxed">
                            <span className="font-bold text-slate-900">{actorName}</span>{" "}
                            {parsed.text}{" "}
                            {parsed.highlight && (
                              <span className="font-medium text-codex-accent">
                                &ldquo;{parsed.highlight}&rdquo;
                              </span>
                            )}
                          </p>
                          <span className="text-[11px] text-slate-400 mt-1 block">
                            {formatTimeAgo(item.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
