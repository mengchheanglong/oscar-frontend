"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth, Project } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import {
  Calendar,
  Clock,
  User,
  Zap,
  Check,
  MoreHorizontal,
  Pencil,
  PlusCircle,
  FileText,
  Upload,
  UserPlus,
  Circle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Download,
  Copy,
  Plus,
  ShieldCheck,
  Shield,
  Trash2,
  Archive,
  RefreshCw,
  X,
  Search,
  LayoutList,
  Columns,
  ArrowLeft,
  Image as ImageIcon,
  AlertTriangle,
  Users,
  Loader2,
  Info,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

// --- Safe string extractors to guarantee no objects are rendered as React children ---
function getAssigneeName(assignee: any, fallback = "Unassigned"): string {
  if (!assignee) return fallback;
  if (typeof assignee === "string") return assignee;
  if (typeof assignee === "object") {
    return assignee.displayName || assignee.email || fallback;
  }
  return fallback;
}

function getAssigneeInitials(assignee: any, fallback = "U"): string {
  if (!assignee) return fallback;
  if (typeof assignee === "string") {
    return assignee.slice(0, 2).toUpperCase();
  }
  if (typeof assignee === "object") {
    const text = assignee.displayName || assignee.email || fallback;
    const parts = text.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.slice(0, 2).toUpperCase();
  }
  return fallback;
}

function getUploaderName(doc: any, fallback = "Team member"): string {
  if (!doc) return fallback;
  if (doc.uploadedBy) {
    if (typeof doc.uploadedBy === "string") return doc.uploadedBy;
    if (typeof doc.uploadedBy === "object") {
      return doc.uploadedBy.displayName || doc.uploadedBy.email || fallback;
    }
  }
  if (doc.creator) {
    if (typeof doc.creator === "string") return doc.creator;
    if (typeof doc.creator === "object") {
      return doc.creator.displayName || doc.creator.email || fallback;
    }
  }
  return fallback;
}

function formatTaskStatus(status: any): string {
  if (!status) return "Draft";
  const s = String(status).toUpperCase();
  if (s === "DONE" || s === "COMPLETED") return "Done";
  if (s === "IN_PROGRESS" || s === "IN PROGRESS") return "In Progress";
  if (s === "TODO" || s === "TO DO" || s === "DRAFT") return "Draft";
  return String(status);
}

function formatTaskPriority(priority: any): string {
  if (!priority) return "Medium";
  const p = String(priority).toUpperCase();
  if (p === "HIGH" || p === "CRITICAL") return "High";
  if (p === "MEDIUM") return "Medium";
  if (p === "LOW") return "Low";
  return String(priority);
}

function formatDocSize(doc: any): string {
  if (doc.size) return String(doc.size);
  if (typeof doc.sizeBytes === "number") {
    if (doc.sizeBytes < 1024 * 1024) {
      return `${Math.round(doc.sizeBytes / 1024)} KB`;
    }
    return `${(doc.sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return "2.4 MB";
}

function formatDocStatus(status: any): string {
  if (!status) return "Indexed";
  const s = String(status).toUpperCase();
  if (s === "READY" || s === "INDEXED") return "Indexed";
  if (s === "PROCESSING" || s === "PENDING") return "Processing";
  if (s === "FAILED" || s === "ERROR") return "Failed";
  return String(status);
}

function getReqApprovalStatus(req: any): { label: string; badgeClass: string } {
  const val = String(req?.priority || req?.status || "").toLowerCase();
  if (val.includes("appr") || val === "done" || val === "active") {
    return { label: "Approved", badgeClass: "bg-[#E8F5E9] text-[#2D8A60]" };
  }
  if (val.includes("rev") || val.includes("progress")) {
    return { label: "In-Review", badgeClass: "bg-[#FEF3C7] text-[#D97706]" };
  }
  if (val.includes("draft")) {
    return { label: "Draft", badgeClass: "bg-slate-100 text-slate-600" };
  }
  return { label: "Approved", badgeClass: "bg-[#E8F5E9] text-[#2D8A60]" };
}

function getReqMoscowPriority(req: any): { label: string; badgeClass: string } {
  const val = String(req?.status || req?.priority || "").toLowerCase();
  if (val.includes("must") || val.includes("high") || val.includes("crit")) {
    return { label: "Must-have", badgeClass: "border border-blue-400 text-blue-600 bg-white" };
  }
  if (val.includes("should") || val.includes("med")) {
    return { label: "Should-have", badgeClass: "border border-amber-400 text-amber-700 bg-white" };
  }
  if (val.includes("could") || val.includes("low")) {
    return { label: "Could-have", badgeClass: "border border-slate-300 text-slate-600 bg-white" };
  }
  return { label: "Must-have", badgeClass: "border border-blue-400 text-blue-600 bg-white" };
}

function getReqDisplayKey(req: any, fallbackProjectKey = "AIW"): string {
  if (!req) return "REQ-1";
  if (req.displayKey) return String(req.displayKey);
  if (req.number) return `${fallbackProjectKey}-REQ-${req.number}`;
  if (req.key) return String(req.key);
  if (typeof req.id === "string") {
    return req.id.length > 8 ? `REQ-${req.id.slice(0, 4)}` : req.id;
  }
  return "REQ-1";
}

function getTaskDisplayKey(task: any, fallbackProjectKey = "AIW"): string {
  if (!task) return "TASK-1";
  if (task.displayKey) return String(task.displayKey);
  if (task.number) return `${fallbackProjectKey}-TASK-${task.number}`;
  if (task.key) return String(task.key);
  if (typeof task.id === "string") {
    return task.id.length > 8 ? `TASK-${task.id.slice(0, 4)}` : task.id;
  }
  return "TASK-1";
}

function formatRelativeTime(dateStr?: string | Date): string {
  if (!dateStr) return "recently";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return "just now";
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "recently";
  }
}

function formatActivityAction(act: any): string {
  const action = String(act.action || "").toLowerCase();
  const entityType = String(act.entityType || "item").toLowerCase();
  const details = act.details?.title || act.details?.name || "";
  if (action === "create") return `created ${entityType}${details ? ` "${details}"` : ""}`;
  if (action === "update") return `updated ${entityType}${details ? ` "${details}"` : ""}`;
  if (action === "delete") return `deleted ${entityType}`;
  return `${action} ${entityType}`;
}





export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  const { projects, currentProject, setCurrentProject, user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [projectData, setProjectData] = useState<any>(null);
  const [projectNotFound, setProjectNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "requirements" | "tasks" | "documents" | "audit">("overview");

  // Tab data states (100% real backend database entities)
  const [tabRequirements, setTabRequirements] = useState<any[]>([]);
  const [tabTasks, setTabTasks] = useState<any[]>([]);
  const [tabDocuments, setTabDocuments] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingTabData, setLoadingTabData] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Requirements tab filters and view states
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [reqSearch, setReqSearch] = useState("");
  const [reqStatusFilter, setReqStatusFilter] = useState("All");
  const [reqPriorityFilter, setReqPriorityFilter] = useState("All");
  const [showEditReqModal, setShowEditReqModal] = useState(false);
  const [editReqTitle, setEditReqTitle] = useState("");
  const [editReqDescription, setEditReqDescription] = useState("");
  const [editReqStatus, setEditReqStatus] = useState("Approved");
  const [editReqPriority, setEditReqPriority] = useState("Must-have");

  // Tasks tab view states
  const [taskViewMode, setTaskViewMode] = useState<"list" | "kanban">("list");
  const [taskSearch, setTaskSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Documents tab view states
  const [docSearch, setDocSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // Upload modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete document modal states
  const [docToDelete, setDocToDelete] = useState<any | null>(null);

  // Dynamic Members state
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, "CONTRIBUTOR" | "MANAGER" | "VIEWER">>({});
  const [submittingMember, setSubmittingMember] = useState(false);

  // Ownership transfer state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [newOwnerUserId, setNewOwnerUserId] = useState("");
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Audit Log tab state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const loadMembers = React.useCallback(async () => {
    if (!projectId) return;
    setLoadingMembers(true);
    try {
      const list = await api.projects.getMembers(projectId);
      setMembers(list && list.length > 0 ? list : []);
    } catch (err: any) {
      console.error("Failed to load project members", err);
    } finally {
      setLoadingMembers(false);
    }
  }, [projectId]);

  const loadCandidates = React.useCallback(async () => {
    if (!projectId) return;
    setLoadingCandidates(true);
    try {
      const res = await api.projects.getMemberCandidates(projectId);
      if (Array.isArray(res)) {
        setCandidates(res);
      } else {
        setCandidates([]);
      }
    } catch {
      try {
        const wsMembers = await api.workspace.getMembers();
        const existingMemberIds = new Set(members.map((m: any) => m.userId || m.user?.id || m.id));
        const eligible = wsMembers.filter((u: any) => !existingMemberIds.has(u.id));
        setCandidates(eligible);
      } catch {
        setCandidates([]);
      }
    } finally {
      setLoadingCandidates(false);
    }
  }, [projectId, members]);

  useEffect(() => {
    if (showInviteModal) {
      setSelectedCandidates({});
      setCandidateSearch("");
      loadCandidates();
    }
  }, [showInviteModal, loadCandidates]);

  const filteredCandidates = useMemo(() => {
    if (!candidateSearch.trim()) return candidates;
    const q = candidateSearch.toLowerCase();
    return candidates.filter((c: any) => {
      const name = String(c.displayName || "").toLowerCase();
      const email = String(c.email || "").toLowerCase();
      const role = String(c.professionalRole || "").toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [candidates, candidateSearch]);

  const loadAuditLogs = React.useCallback(async (page = 1) => {
    if (!projectId) return;
    setLoadingAudit(true);
    try {
      const res = await api.projects.getAuditLogs(projectId, page, 25);
      setAuditLogs(res.data || []);
      setAuditTotal(res.meta?.total || (res.data?.length ?? 0));
      setAuditPage(page);
    } catch (err: any) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoadingAudit(false);
    }
  }, [projectId]);

  // Master data loader for project workspace (100% real backend entities)
  const loadAllProjectData = React.useCallback(async () => {
    if (!projectId) return;
    setLoadingInitial(true);

    try {
      // 1. Load project details if not in memory
      const found = projects.find((p) => p.id === projectId);
      if (found) {
        setProjectData(found);
        if (currentProject?.id !== found.id) {
          setCurrentProject(found);
        }
      } else {
        try {
          const res = await api.projects.get(projectId);
          setProjectData(res);
          if (res) setCurrentProject(res);
        } catch (err: any) {
          if (err?.status === 404) {
            setProjectNotFound(true);
          }
        }
      }

      // 2. Parallel fetch for all workspace entities
      const [membersRes, reqsRes, tasksRes, docsRes, dashRes] = await Promise.allSettled([
        api.projects.getMembers(projectId),
        api.requirements.list(projectId),
        api.tasks.list(projectId),
        api.documents.list(projectId),
        api.dashboard.get(projectId),
      ]);

      if (membersRes.status === "fulfilled" && Array.isArray(membersRes.value)) {
        setMembers(membersRes.value);
      } else {
        setMembers([]);
      }

      if (reqsRes.status === "fulfilled" && Array.isArray(reqsRes.value)) {
        setTabRequirements(reqsRes.value);
      } else {
        setTabRequirements([]);
      }

      if (tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value)) {
        setTabTasks(tasksRes.value);
      } else {
        setTabTasks([]);
      }

      if (docsRes.status === "fulfilled" && Array.isArray(docsRes.value)) {
        setTabDocuments(docsRes.value);
      } else {
        setTabDocuments([]);
      }

      if (dashRes.status === "fulfilled" && dashRes.value) {
        setDashboardStats(dashRes.value);
        if (Array.isArray(dashRes.value.recentActivity)) {
          setRecentActivities(dashRes.value.recentActivity);
        }
      }
    } catch (err: any) {
      console.error("Failed to load project workspace data", err);
    } finally {
      setLoadingInitial(false);
    }
  }, [projectId, projects, currentProject?.id, setCurrentProject]);

  useEffect(() => {
    loadAllProjectData();
  }, [loadAllProjectData]);

  // Load audit logs when audit tab is active
  useEffect(() => {
    if (activeTab === "audit") {
      loadAuditLogs(auditPage);
    }
  }, [activeTab, auditPage, loadAuditLogs]);

  // Filtered requirements
  const filteredRequirements = useMemo(() => {
    return tabRequirements.filter((req) => {
      const matchSearch =
        !reqSearch.trim() ||
        String(req.title || "").toLowerCase().includes(reqSearch.toLowerCase()) ||
        String(req.id || "").toLowerCase().includes(reqSearch.toLowerCase()) ||
        String(req.key || req.displayKey || "").toLowerCase().includes(reqSearch.toLowerCase());
      const statusStr = String(req.status || "");
      const priorityStr = String(req.priority || "");
      const matchStatus =
        reqStatusFilter === "All" ||
        statusStr.toLowerCase() === reqStatusFilter.toLowerCase();
      const matchPriority =
        reqPriorityFilter === "All" ||
        priorityStr.toLowerCase() === reqPriorityFilter.toLowerCase();
      return matchSearch && matchStatus && matchPriority;
    });
  }, [tabRequirements, reqSearch, reqStatusFilter, reqPriorityFilter]);

  // Related tasks for selected requirement matching real database tasks
  const reqRelatedTasks = useMemo(() => {
    if (!selectedReq) return [];
    const reqId = selectedReq.id;
    const reqKey = selectedReq.key || selectedReq.displayKey;
    const reqNum = selectedReq.number;

    return tabTasks.filter((t: any) => {
      return (
        t.requirementId === reqId ||
        t.linkedReq === reqId ||
        (reqKey && (t.linkedReq === reqKey || t.requirementId === reqKey)) ||
        (typeof reqNum === "number" && (t.linkedReqNumber === reqNum || t.requirementNumber === reqNum))
      );
    });
  }, [selectedReq, tabTasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tabTasks.filter((task) => {
      if (!taskSearch.trim()) return true;
      const q = taskSearch.toLowerCase();
      const assigneeStr = getAssigneeName(task.assignee, "").toLowerCase();
      return (
        String(task.title || "").toLowerCase().includes(q) ||
        String(task.id || "").toLowerCase().includes(q) ||
        String(task.displayKey || "").toLowerCase().includes(q) ||
        assigneeStr.includes(q)
      );
    });
  }, [tabTasks, taskSearch]);

  // Kanban task grouped
  const kanbanTasks = useMemo(() => {
    const todo = filteredTasks.filter((t) => {
      const s = formatTaskStatus(t.status);
      return s === "Draft" || s === "TO DO" || s === "TODO" || s === "To Do";
    });
    const inProgress = filteredTasks.filter((t) => {
      const s = formatTaskStatus(t.status);
      return s === "In Progress";
    });
    const done = filteredTasks.filter((t) => {
      const s = formatTaskStatus(t.status);
      return s === "Done";
    });
    return { todo, inProgress, done };
  }, [filteredTasks]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return tabDocuments.filter((doc) => {
      if (!docSearch.trim()) return true;
      const q = docSearch.toLowerCase();
      const uploaderStr = getUploaderName(doc, "").toLowerCase();
      return (
        String(doc.title || doc.originalFilename || "").toLowerCase().includes(q) ||
        uploaderStr.includes(q)
      );
    });
  }, [tabDocuments, docSearch]);

  // Dynamic Overview metrics
  const totalTasksCount = tabTasks.length;
  const doneTasksCount = useMemo(() => {
    return tabTasks.filter((t) => {
      const s = formatTaskStatus(t.status).toLowerCase();
      return s === "done" || s === "completed";
    }).length;
  }, [tabTasks]);

  const progressPercent = useMemo(() => {
    if (totalTasksCount > 0) {
      return Math.round((doneTasksCount / totalTasksCount) * 100);
    }
    return dashboardStats?.taskProgress?.percentage ?? 0;
  }, [totalTasksCount, doneTasksCount, dashboardStats]);

  const daysLeft = useMemo(() => {
    const target = projectData?.targetDate || projectData?.deadline;
    if (!target) return null;
    try {
      const targetTime = new Date(target).getTime();
      const now = Date.now();
      const diff = Math.ceil((targetTime - now) / (1000 * 60 * 60 * 24));
      return isNaN(diff) ? null : diff;
    } catch {
      return null;
    }
  }, [projectData?.targetDate, projectData?.deadline]);

  const projectOwnerMember = useMemo(() => {
    return (
      members.find((m) => m.accessRole === "OWNER") ||
      null
    );
  }, [members]);

  const projectLeadName = useMemo(() => {
    if (projectOwnerMember) {
      const u = projectOwnerMember.user || projectOwnerMember;
      return u?.displayName || u?.email || "Not assigned";
    }
    if (projectData?.owner) {
      return projectData.owner.displayName || projectData.owner.email || "Not assigned";
    }
    return "Not assigned";
  }, [projectOwnerMember, projectData]);

  // Real document upload
  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(20);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      setUploadProgress(50);
      await api.documents.upload(projectId, formData);
      setUploadProgress(100);
      showToast(`"${file.name}" uploaded successfully`, "success");
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadProgress(0);
      // Reload real documents from backend
      const refreshed = await api.documents.list(projectId);
      setTabDocuments(refreshed || []);
    } catch (err: any) {
      console.error("Document upload failed", err);
      setUploadError(err.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setUploadError(`"${file.name}" is larger than the 20 MB limit.`);
      setUploadFile(file);
      return;
    }

    setUploadError(null);
    setUploadFile(file);
    handleUploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setUploadError(`"${file.name}" is larger than the 20 MB limit.`);
      setUploadFile(file);
      return;
    }

    setUploadError(null);
    setUploadFile(file);
    handleUploadFile(file);
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;
    const docId = docToDelete.id;
    const docName = String(docToDelete.title || docToDelete.originalFilename || "Document");
    try {
      await api.documents.delete(projectId, docId);
      setTabDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
      setDocToDelete(null);
      showToast(`"${docName}" removed from knowledge base`, "info");
    } catch (err: any) {
      console.error("Failed to delete document", err);
      showToast(err.message || "Failed to delete document", "error");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedEntries = Object.entries(selectedCandidates);
    if (selectedEntries.length === 0) {
      showToast("Please select at least one team member to invite", "error");
      return;
    }

    setSubmittingMember(true);
    try {
      let addedCount = 0;
      for (const [userId, role] of selectedEntries) {
        await api.projects.addMember(projectId, {
          userId,
          accessRole: role,
        });
        addedCount++;
      }

      showToast(
        addedCount === 1
          ? "Team member added to project successfully!"
          : `${addedCount} team members added to project successfully!`,
        "success",
      );
      setSelectedCandidates({});
      setShowInviteModal(false);
      await loadMembers();
      await loadAllProjectData();
    } catch (err: any) {
      showToast(err.message || "Failed to add member", "error");
    } finally {
      setSubmittingMember(false);
    }
  };

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOwnerUserId) return;
    setSubmittingTransfer(true);
    try {
      await api.projects.transferOwnership(projectId, { newOwnerUserId });
      showToast("Project ownership transferred successfully", "success");
      setShowTransferModal(false);
      await loadMembers();
      const updatedProj = await api.projects.get(projectId);
      setProjectData(updatedProj);
    } catch (err: any) {
      showToast(err.message || "Failed to transfer ownership", "error");
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const handleArchiveToggle = async () => {
    const isArchived = projectData?.status === "ARCHIVED";
    try {
      if (isArchived) {
        const res = await api.projects.unarchive(projectId);
        setProjectData(res);
        showToast("Project restored to ACTIVE status", "success");
      } else {
        const res = await api.projects.archive(projectId);
        setProjectData(res);
        showToast("Project archived", "info");
      }
      setShowOptions(false);
    } catch (err: any) {
      showToast(err.message || "Failed to toggle archive status", "error");
    }
  };

  const projectName = projectData?.name || "Unknown project";
  const projectKey = projectData?.key || "AIW";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`, "info");
  };

  if (projectNotFound) {
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto py-20 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 font-serif">Project Workspace Not Found</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            The workspace with ID <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">{projectId}</code> does not exist or you do not have permission to view it.
          </p>
          <div className="pt-2">
            <Button
              onClick={() => router.push("/projects")}
              size="sm"
              className="text-xs bg-codex-accent hover:bg-codex-hover text-white rounded-lg px-4"
            >
              Back to Projects
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Breadcrumb matching media_1790901601198.png */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/projects" className="text-blue-600 hover:underline transition-colors font-medium">
            Projects
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-800">{projectName}</span>
          {activeTab === "requirements" && (
            <>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-slate-600">Requirements</span>
            </>
          )}
          {activeTab === "tasks" && (
            <>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-slate-600">Tasks</span>
            </>
          )}
          {activeTab === "documents" && (
            <>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-slate-600">Documents</span>
            </>
          )}
        </div>

        {/* Title & Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
                {projectName}
              </h1>
              {projectData?.status === "ARCHIVED" ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  <Archive className="w-3 h-3 mr-1" /> Archived
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60]">
                  On track
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {projectData?.description || "No description provided."}
            </p>
          </div>

          <div className="flex items-center gap-2 relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditModal(true)}
              className="gap-1.5 text-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs h-8 px-3 rounded-lg"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </Button>

            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOptions(!showOptions)}
                className="w-8 h-8 p-0 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs rounded-lg"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>

              {showOptions && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-30 space-y-0.5 text-xs animate-in fade-in">
                  <button
                    onClick={() => {
                      copyToClipboard(projectKey, "project key");
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Project Key</span>
                  </button>
                  <button
                    onClick={() => {
                      copyToClipboard(window.location.href, "project link");
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Page Link</span>
                  </button>
                  <button
                    onClick={() => {
                      if (projectData) setCurrentProject(projectData);
                      showToast(`Active workspace set to ${projectName}`, "success");
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <Check className="w-3.5 h-3.5 text-[#2D8A60]" />
                    <span>Set Active Workspace</span>
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setShowInviteModal(true);
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Invite Team Member</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowTransferModal(true);
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-700 hover:bg-amber-50 text-left"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span>Transfer Ownership</span>
                  </button>
                  <button
                    onClick={handleArchiveToggle}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <Archive className="w-3.5 h-3.5 text-slate-500" />
                    <span>{projectData?.status === "ARCHIVED" ? "Unarchive Project" : "Archive Project"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation matching media_1790901601198.png */}
        <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-medium pt-1">
          <button
            onClick={() => {
              setActiveTab("overview");
              setSelectedReq(null);
              setSelectedTask(null);
              setSelectedDoc(null);
            }}
            className={`pb-2.5 transition-all relative ${
              activeTab === "overview"
                ? "text-blue-600 font-semibold border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => {
              setActiveTab("requirements");
              setSelectedReq(null);
              setSelectedTask(null);
              setSelectedDoc(null);
            }}
            className={`pb-2.5 transition-all relative ${
              activeTab === "requirements"
                ? "text-blue-600 font-semibold border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Requirements
          </button>
          <button
            onClick={() => {
              setActiveTab("tasks");
              setSelectedReq(null);
              setSelectedDoc(null);
            }}
            className={`pb-2.5 transition-all relative ${
              activeTab === "tasks"
                ? "text-blue-600 font-semibold border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => {
              setActiveTab("documents");
              setSelectedReq(null);
              setSelectedTask(null);
            }}
            className={`pb-2.5 transition-all relative ${
              activeTab === "documents"
                ? "text-blue-600 font-semibold border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Documents
          </button>
        </div>

        {/* =========================================================================
            TAB 1: OVERVIEW (matching media_1790901601198.png)
           ========================================================================= */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Card 1: Description */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 font-serif">
                  Description
                </h2>
                <div className="text-xs text-slate-600 leading-relaxed space-y-3">
                  <p>
                    {projectData?.description || "No description provided."}
                  </p>
                  <p>
                    The workspace is powered by pgvector semantic search and an integrated AI Copilot for grounded Q&amp;A, requirement analysis, and citation-backed project intelligence.
                  </p>
                </div>
              </div>

              {/* Card 2: Progress */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 font-serif">
                  Progress
                </h2>

                {/* KPI Metrics Row with Radial Ring */}
                <div className="flex flex-wrap items-center gap-8">
                  {/* Radial Ring */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-blue-600 transition-all duration-500"
                          strokeDasharray={`${progressPercent}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-bold font-serif text-slate-900">{progressPercent}%</span>
                        <span className="text-[8px] text-slate-400">complete</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric 1 */}
                  <div>
                    <div className="text-base font-bold font-serif text-slate-900">
                      {doneTasksCount} / {totalTasksCount}
                    </div>
                    <div className="text-[11px] text-slate-400">Tasks done</div>
                  </div>

                  {/* Metric 2 */}
                  <div>
                    <div className="text-base font-bold font-serif text-slate-900">
                      {tabRequirements.length}
                    </div>
                    <div className="text-[11px] text-slate-400">Requirements</div>
                  </div>

                  {/* Metric 3 */}
                  <div>
                    <div className="text-base font-bold font-serif text-slate-900">
                      {tabDocuments.length}
                    </div>
                    <div className="text-[11px] text-slate-400">Documents</div>
                  </div>

                  {/* Metric 4 */}
                  <div>
                    <div className="text-base font-bold font-serif text-slate-900">
                      {daysLeft !== null
                        ? daysLeft > 0
                          ? `${daysLeft} days`
                          : "Due today"
                        : `${members.length} members`}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {daysLeft !== null ? "To target deadline" : "Team members"}
                    </div>
                  </div>
                </div>

                {/* Milestones List */}
                <div className="pt-2 border-t border-slate-100 space-y-4">
                  {/* Milestone 1 */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full ${
                        tabRequirements.length > 0 ? "bg-[#2D8A60] text-white" : "bg-blue-600 text-white"
                      } flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      {tabRequirements.length > 0 ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Planning & Architecture</span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium ${
                            tabRequirements.length > 0
                              ? "bg-[#E8F5E9] text-[#2D8A60]"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {tabRequirements.length > 0 ? "Done" : "In Progress"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {tabRequirements.length} requirements scoped
                      </p>
                    </div>
                  </div>

                  {/* Milestone 2 */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full ${
                        doneTasksCount > 0
                          ? "bg-[#2D8A60] text-white"
                          : totalTasksCount > 0
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 text-slate-400"
                      } flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      {doneTasksCount > 0 ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Database, Backend & Auth</span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium ${
                            doneTasksCount > 0
                              ? "bg-[#E8F5E9] text-[#2D8A60]"
                              : totalTasksCount > 0
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {doneTasksCount > 0 ? "Done" : totalTasksCount > 0 ? "In Progress" : "Upcoming"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {doneTasksCount} of {totalTasksCount} tasks done
                      </p>
                    </div>
                  </div>

                  {/* Milestone 3 */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full ${
                        progressPercent === 100 && totalTasksCount > 0
                          ? "bg-[#2D8A60] text-white"
                          : totalTasksCount > 0
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 text-slate-400"
                      } flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      {progressPercent === 100 && totalTasksCount > 0 ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Core Workspace Features</span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium ${
                            progressPercent === 100 && totalTasksCount > 0
                              ? "bg-[#E8F5E9] text-[#2D8A60]"
                              : totalTasksCount > 0
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {progressPercent === 100 && totalTasksCount > 0 ? "Done" : totalTasksCount > 0 ? "In Progress" : "Upcoming"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Active project phase</p>
                    </div>
                  </div>

                  {/* Milestone 4 */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full ${
                        progressPercent === 100 && totalTasksCount > 0
                          ? "bg-[#2D8A60] text-white"
                          : "bg-slate-200 text-slate-400"
                      } flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-600">QA, Deployment & Sign-off</span>
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                          Upcoming
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {projectData?.targetDate
                          ? `Due ${formatDate(projectData.targetDate)}`
                          : "Target delivery"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Recent Activity */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 font-serif">
                    Recent Activity
                  </h2>
                  <button
                    onClick={() => setActiveTab("audit")}
                    className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                  >
                    View all
                  </button>
                </div>

                <div className="relative pl-1 space-y-4 text-xs">
                  {recentActivities.length > 0 ? (
                    recentActivities.slice(0, 6).map((act: any, idx: number) => {
                      const actorName = act.actor?.displayName || act.actor?.email || "Team member";
                      const initials = getAssigneeInitials(act.actor, "TM");
                      const actionDesc = formatActivityAction(act);
                      const timeAgo = formatRelativeTime(act.createdAt);
                      const colors = [
                        "bg-[#4f46e5]",
                        "bg-[#d97706]",
                        "bg-[#e11d48]",
                        "bg-[#818cf8]",
                        "bg-slate-900",
                        "bg-teal-600",
                      ];
                      const avatarBg = colors[idx % colors.length];

                      return (
                        <div key={act.id || idx} className="relative flex items-start gap-3.5 pb-4">
                          {idx < Math.min(recentActivities.length, 6) - 1 && (
                            <span
                              className="absolute left-3.5 top-3.5 -bottom-0.5 w-[1.5px] -translate-x-1/2 bg-slate-200"
                              aria-hidden="true"
                            />
                          )}
                          <div
                            className={`relative z-10 w-7 h-7 rounded-full ${avatarBg} text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <p className="text-slate-700 leading-relaxed">
                              <span className="font-bold text-slate-900">{actorName}</span>{" "}
                              {actionDesc}
                            </p>
                            <span className="text-[11px] text-slate-400 mt-0.5 block">
                              {timeAgo}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      No recent activity recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Card 1: Project Details */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 font-serif">
                  Project Details
                </h2>

                <div className="space-y-3 text-xs">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Circle className="w-3.5 h-3.5 text-slate-400" />
                      <span>Status</span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60]">
                      {String(projectData?.status || "Unknown")}
                    </span>
                  </div>

                  {/* Deadline */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Deadline</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-800">
                        {projectData?.targetDate
                          ? formatDate(projectData.targetDate)
                          : projectData?.deadline
                          ? formatDate(projectData.deadline)
                          : "Not set"}
                      </span>
                      {daysLeft !== null && daysLeft > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#FEF3C7] text-[#D97706]">
                          {daysLeft}d left
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Zap className="w-3.5 h-3.5 text-slate-400" />
                      <span>Priority</span>
                    </div>
                    <span className="font-medium text-slate-800">
                      {String(projectData?.priority || "Not set")}
                    </span>
                  </div>

                  {/* Project Lead */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Project Lead</span>
                    </div>
                    <span className="font-medium text-slate-800 truncate max-w-[150px] text-right">
                      {projectLeadName}
                    </span>
                  </div>

                  {/* Created */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Created</span>
                    </div>
                    <span className="font-medium text-slate-800">
                      {projectData?.createdAt ? formatDate(projectData.createdAt) : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Team Members (100% real database members) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 font-serif">
                    Team Members
                  </h2>
                  <span className="text-xs font-semibold text-slate-600">{members.length}</span>
                </div>

                <div className="space-y-3">
                  {members.length > 0 ? (
                    members.map((member: any, idx: number) => {
                      const memUser = member.user || member;
                      const name = memUser?.displayName || memUser?.email || "Team Member";
                      const initials = getAssigneeInitials(memUser, "TM");
                      const roleLabel =
                        member.accessRole === "OWNER"
                          ? "Project Lead"
                          : member.accessRole === "MANAGER"
                          ? "Project Manager"
                          : member.accessRole === "CONTRIBUTOR"
                          ? "Contributor"
                          : "Viewer";

                      const memberId = member.userId || member.id;
                      const assignedCount = tabTasks.filter(
                        (t: any) => t.assigneeId === memberId || t.assignee?.id === memberId
                      ).length;

                      const colors = [
                        "bg-blue-600",
                        "bg-[#818cf8]",
                        "bg-slate-900",
                        "bg-[#c0392b]",
                        "bg-[#d97706]",
                      ];
                      const avatarColor = colors[idx % colors.length];

                      return (
                        <div key={member.id || idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-full ${avatarColor} text-white font-bold text-xs flex items-center justify-center shrink-0`}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate">{name}</div>
                              <div className="text-[11px] text-slate-400">{roleLabel}</div>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {assignedCount} {assignedCount === 1 ? "task" : "tasks"}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No team members found.
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Quick Action matching media_1790901601198.png */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 font-serif">
                  Quick Action
                </h2>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setActiveTab("tasks");
                      setSelectedTask(null);
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-medium text-slate-700 transition-all shadow-2xs text-left"
                  >
                    <PlusCircle className="w-4 h-4 text-blue-600" />
                    <span>New Tasks</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("requirements");
                      setSelectedReq(null);
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-medium text-slate-700 transition-all shadow-2xs text-left"
                  >
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span>Browse Requirements</span>
                  </button>

                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-medium text-slate-700 transition-all shadow-2xs text-left"
                  >
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>Upload Document</span>
                  </button>

                  <Link
                    href={`/meetings?create=true`}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-medium text-slate-700 transition-all shadow-2xs text-left"
                  >
                    <Calendar className="w-4 h-4 text-slate-600" />
                    <span>Schedule Meeting</span>
                  </Link>

                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-medium text-slate-700 transition-all shadow-2xs text-left"
                  >
                    <UserPlus className="w-4 h-4 text-slate-600" />
                    <span>Invite Member</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: REQUIREMENTS (matching media_1790901612294.png & media_1790904481908.png)
           ========================================================================= */}
        {activeTab === "requirements" && (
          <div className="space-y-4">
            {selectedReq ? (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Back to Requirements link matching media_1790904481908.png */}
                <button
                  onClick={() => setSelectedReq(null)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Requirements</span>
                </button>

                {/* ID badge & Title row with Edit button */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pt-1">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-medium text-blue-600 bg-blue-100/70 border border-blue-200 mb-2">
                      {String(selectedReq.displayKey || selectedReq.id || "Key unavailable")}
                    </span>
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 font-serif">
                      {String(selectedReq.title || "Requirement Title")}
                    </h1>
                  </div>

                  <button
                    onClick={() => {
                      setEditReqTitle(selectedReq.title || "");
                      setEditReqDescription(
                        selectedReq.description ||
                          "Users sign in with email and password. Passwords are hashed, sessions are secure, and every request is scoped to the signed-in user."
                      );
                      setEditReqStatus(getReqApprovalStatus(selectedReq).label);
                      setEditReqPriority(getReqMoscowPriority(selectedReq).label);
                      setShowEditReqModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs shrink-0 self-start sm:self-center cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>

                {/* 2-Column Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
                  {/* Left Column: Description & Related tasks */}
                  <div className="lg:col-span-8 space-y-4">
                    {/* Card 1: Description */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                      <h2 className="text-sm font-bold text-slate-900 font-serif mb-2">
                        Description
                      </h2>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {String(
                          selectedReq.description ||
                            "Users sign in with email and password. Passwords are hashed, sessions are secure, and every request is scoped to the signed-in user."
                        )}
                      </p>
                    </div>

                    {/* Card 2: Related tasks */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                      <div className="flex items-center gap-2 mb-4">
                        <h2 className="text-sm font-bold text-slate-900 font-serif">
                          Related tasks
                        </h2>
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold flex items-center justify-center">
                          {selectedReq.tasksCount ?? reqRelatedTasks.length}
                        </span>
                      </div>

                      {/* Tasks list */}
                      {reqRelatedTasks.length > 0 ? (
                        <div className="space-y-3.5">
                          {reqRelatedTasks.map((task: any) => {
                            const taskTitle = String(task.title || "Task");
                            const taskStatus = formatTaskStatus(task.status);
                            const isDone = taskStatus.toLowerCase() === "done" || taskStatus.toLowerCase() === "completed";
                            const assigneeName = getAssigneeName(task.assignee, "Unassigned");
                            const assigneeInitials = getAssigneeInitials(task.assignee, task.assigneeInitials || "U");
                            const assigneeColor = task.assigneeColor || (assigneeInitials === "MF" ? "bg-[#4f46e5]" : "bg-[#d97706]");

                            return (
                              <div
                                key={task.id}
                                onClick={() => {
                                  setActiveTab("tasks");
                                  setSelectedTask(task);
                                }}
                                className="flex items-center gap-3 py-1 cursor-pointer hover:bg-slate-50/80 rounded-lg px-2 -mx-2 transition-colors"
                              >
                                <span className="w-2 h-2 rounded-full bg-emerald-700 shrink-0" />
                                <span className="text-xs font-medium text-slate-800 truncate max-w-xs sm:max-w-sm">
                                  {taskTitle}
                                </span>
                                <span className="text-xs text-slate-400 ml-auto shrink-0 mr-3">
                                  {taskStatus}
                                </span>
                                <div className="w-36 sm:w-64 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                  <div
                                    className={`h-full rounded-full ${
                                      isDone ? "w-full bg-[#1b5e3a]" : "w-1/2 bg-[#1b5e3a]"
                                    }`}
                                  />
                                </div>
                                <div
                                  className={`w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 ml-1 ${assigneeColor}`}
                                  title={assigneeName}
                                >
                                  {assigneeInitials}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No tasks linked to this requirement yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Details */}
                  <div className="lg:col-span-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                      <h2 className="text-sm font-bold text-slate-900 font-serif">
                        Details
                      </h2>

                      <div className="space-y-3.5 text-xs">
                        {/* ID */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">ID</span>
                          <span className="font-mono font-bold text-slate-800">
                            {getReqDisplayKey(selectedReq, projectData?.key || "AIW")}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Status</span>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${getReqApprovalStatus(selectedReq).badgeClass}`}>
                            {getReqApprovalStatus(selectedReq).label}
                          </span>
                        </div>

                        {/* Priority */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Priority</span>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${getReqMoscowPriority(selectedReq).badgeClass}`}>
                            {getReqMoscowPriority(selectedReq).label}
                          </span>
                        </div>

                        {/* Created by */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Created by</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">
                              {getUploaderName(selectedReq, "Team member")}
                            </span>
                            <div className="w-5 h-5 rounded-full bg-[#d97706] text-white text-[9px] font-bold flex items-center justify-center">
                              {getAssigneeInitials(selectedReq.creator || selectedReq.uploadedBy, "TM")}
                            </div>
                          </div>
                        </div>

                        {/* Date */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Date</span>
                          <span className="font-medium text-slate-800">
                            {selectedReq.createdAt
                              ? formatDate(selectedReq.createdAt)
                              : selectedReq.date || "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Header & Subtitle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-serif">
                      Requirements
                    </h2>
                    <p className="text-xs text-slate-500">
                      Everything this project must do, scoped to {projectName}.
                    </p>
                  </div>
                  <Link href={`/requirements?create=true`}>
                    <Button size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs h-8 px-3">
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Requirement</span>
                    </Button>
                  </Link>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* Search input */}
                    <div className="relative min-w-[240px] max-w-sm">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={reqSearch}
                        onChange={(e) => setReqSearch(e.target.value)}
                        placeholder="Search by ID or title..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    {/* Status select */}
                    <select
                      value={reqStatusFilter}
                      onChange={(e) => setReqStatusFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs cursor-pointer focus:outline-none"
                    >
                      <option value="All">Status: All</option>
                      <option value="Must-have">Status: Must-have</option>
                      <option value="Should-have">Status: Should-have</option>
                      <option value="Could-have">Status: Could-have</option>
                    </select>

                    {/* Priority select */}
                    <select
                      value={reqPriorityFilter}
                      onChange={(e) => setReqPriorityFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs cursor-pointer focus:outline-none"
                    >
                      <option value="All">Priority: All</option>
                      <option value="Approved">Priority: Approved</option>
                      <option value="In-Review">Priority: In-Review</option>
                      <option value="Draft">Priority: Draft</option>
                    </select>
                  </div>

                  <div className="text-xs text-slate-400">
                    {filteredRequirements.length} of {tabRequirements.length} requirements
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-[11px] font-medium uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-5 w-28">ID</th>
                          <th className="py-3 px-5">TITLE</th>
                          <th className="py-3 px-5 w-36">STATUS</th>
                          <th className="py-3 px-5 w-36">PRIORITY</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRequirements.length > 0 ? (
                          filteredRequirements.map((req) => {
                            const displayKey = getReqDisplayKey(req, projectData?.key || "AIW");
                            const titleStr = String(req.title || "Untitled Requirement");
                            const moscow = getReqMoscowPriority(req);
                            const approval = getReqApprovalStatus(req);

                            return (
                              <tr
                                key={req.id}
                                onClick={() => setSelectedReq(req)}
                                className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                              >
                                <td className="py-3.5 px-5">
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-medium text-blue-600 bg-blue-50 border border-blue-200">
                                    {displayKey}
                                  </span>
                                </td>
                                <td className="py-3.5 px-5 font-normal text-slate-800">
                                  {titleStr}
                                </td>
                                <td className="py-3.5 px-5">
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${moscow.badgeClass}`}>
                                    {moscow.label}
                                  </span>
                                </td>
                                <td className="py-3.5 px-5">
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${approval.badgeClass}`}>
                                    {approval.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-xs text-slate-400">
                              {tabRequirements.length === 0
                                ? "No requirements created yet for this project."
                                : "No requirements match your filters."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: TASKS (matching media_1790901630484.png, 1790901639552, 1790901686713)
           ========================================================================= */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            {/* Task Detail View if a task is selected */}
            {selectedTask ? (
              <div className="space-y-4 animate-in fade-in duration-150">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Tasks</span>
                </button>

                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 font-serif">
                    {String(selectedTask.title || "Task")}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs h-8 px-3 rounded-lg"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Description */}
                  <div className="lg:col-span-8">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
                      <h3 className="text-sm font-bold text-slate-900 font-serif">
                        Description
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {String(
                          selectedTask.description ||
                            "Build the email/password authentication endpoint with hashed passwords and secure sessions."
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Details */}
                  <div className="lg:col-span-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5 shadow-xs">
                      <h3 className="text-sm font-bold text-slate-900 font-serif">
                        Details
                      </h3>

                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Status</span>
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60]">
                            {formatTaskStatus(selectedTask.status)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Priority</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            {formatTaskPriority(selectedTask.priority)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Assigned to</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800">
                              {getAssigneeName(selectedTask.assignee, "Unassigned")}
                            </span>
                            <div className="w-5 h-5 rounded-full bg-[#d97706] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {getAssigneeInitials(selectedTask.assignee, selectedTask.assigneeInitials || "U")}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Due Date</span>
                          <span className="font-medium text-slate-800">
                            {selectedTask.dueDate
                              ? formatDate(selectedTask.dueDate)
                              : selectedTask.due || "No due date"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Linked requirements</span>
                          {selectedTask.requirement || selectedTask.linkedReq || selectedTask.requirementId ? (
                            <button
                              onClick={() => {
                                const targetReqKey = selectedTask.requirement?.key || selectedTask.linkedReq;
                                const targetReqId = selectedTask.requirementId || selectedTask.requirement?.id;
                                const found = tabRequirements.find(
                                  (r: any) =>
                                    (targetReqId && r.id === targetReqId) ||
                                    (targetReqKey && (r.key === targetReqKey || r.displayKey === targetReqKey))
                                );
                                if (found) {
                                  setSelectedReq(found);
                                  setActiveTab("requirements");
                                } else {
                                  showToast("Linked requirement details not found in this project", "info");
                                }
                              }}
                              className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                            >
                              {selectedTask.requirement?.key || selectedTask.linkedReq || (selectedTask.requirementId ? `REQ-${selectedTask.requirementId.slice(0, 4)}` : "REQ")}
                            </button>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Header & Subtitle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-serif">
                      Tasks
                    </h2>
                    <p className="text-xs text-slate-500">
                      Everything the team is building for {projectName}.
                    </p>
                  </div>
                  <Link href={`/tasks?create=true`}>
                    <Button size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs h-8 px-3">
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Task</span>
                    </Button>
                  </Link>
                </div>

                {/* Filter & View Mode Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative min-w-[240px] max-w-sm">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        placeholder="Search by ID or title..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>
                    <span className="text-xs text-slate-400">
                      {filteredTasks.length} of {tabTasks.length} tasks
                    </span>
                  </div>

                  {/* List / Kanban Switcher */}
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs shadow-2xs">
                    <button
                      onClick={() => setTaskViewMode("list")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                        taskViewMode === "list"
                          ? "bg-black text-white font-medium shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <LayoutList className="w-3.5 h-3.5" />
                      <span>List</span>
                    </button>
                    <button
                      onClick={() => setTaskViewMode("kanban")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                        taskViewMode === "kanban"
                          ? "bg-black text-white font-medium shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Columns className="w-3.5 h-3.5" />
                      <span>Kanban</span>
                    </button>
                  </div>
                </div>

                {/* --- TASK LIST VIEW --- */}
                {taskViewMode === "list" && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-[11px] font-medium uppercase tracking-wider">
                          <tr>
                            <th className="py-3 px-5">TASK</th>
                            <th className="py-3 px-5 w-32">STATUS</th>
                            <th className="py-3 px-5 w-32">PRIORITY</th>
                            <th className="py-3 px-5 w-48">ASSIGNEE</th>
                            <th className="py-3 px-5 w-32">DUE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredTasks.length > 0 ? (
                            filteredTasks.map((task) => {
                              const statusStr = formatTaskStatus(task.status);
                              const priorityStr = formatTaskPriority(task.priority);
                              const isDone = statusStr === "Done";
                              const assigneeName = getAssigneeName(task.assignee, "Unassigned");
                              const assigneeInitials = getAssigneeInitials(task.assignee, task.assigneeInitials || "U");
                              const displayKey = getTaskDisplayKey(task, projectData?.key || "AIW");

                              return (
                                <tr
                                  key={task.id}
                                  onClick={() => setSelectedTask(task)}
                                  className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                                >
                                  <td className="py-3.5 px-5">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-slate-500 bg-slate-100 border border-slate-200 shrink-0">
                                        {displayKey}
                                      </span>
                                      <span
                                        className={`text-xs ${
                                          isDone
                                            ? "line-through text-slate-400"
                                            : "font-normal text-slate-800"
                                        }`}
                                      >
                                        {String(task.title || "Untitled Task")}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-5">
                                    {isDone ? (
                                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60]">
                                        Done
                                      </span>
                                    ) : statusStr === "In Progress" ? (
                                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700">
                                        In Progress
                                      </span>
                                    ) : (
                                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                                        Draft
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-5">
                                    {priorityStr === "High" ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                        High
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                        Medium
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-5">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                          task.assigneeColor || "bg-slate-700"
                                        }`}
                                      >
                                        {assigneeInitials}
                                      </div>
                                      <span className="text-slate-800 text-xs font-normal">
                                        {assigneeName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-5 text-slate-500 font-normal">
                                    {task.dueDate
                                      ? formatDate(task.dueDate)
                                      : task.due || "No due date"}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                                {tabTasks.length === 0
                                  ? "No tasks found in this project."
                                  : "No tasks match your search."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* --- TASK KANBAN VIEW (matching media_1790901686713.png) --- */}
                {taskViewMode === "kanban" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {/* Column 1: TO DO */}
                    <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-3 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          <span className="text-xs font-bold text-slate-800 tracking-wider">TO DO</span>
                        </div>
                        <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center">
                          {kanbanTasks.todo.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {kanbanTasks.todo.length > 0 ? (
                          kanbanTasks.todo.map((t) => {
                            const priorityStr = formatTaskPriority(t.priority);
                            const initials = getAssigneeInitials(t.assignee, "U");
                            const displayKey = getTaskDisplayKey(t, projectData?.key || "AIW");

                            return (
                              <div
                                key={t.id}
                                onClick={() => setSelectedTask(t)}
                                className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
                              >
                                <div className="space-y-1">
                                  <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-medium text-slate-500 bg-slate-100 border border-slate-200">
                                    {displayKey}
                                  </span>
                                  <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                                    {String(t.title || "Task")}
                                  </h4>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-medium">
                                    <span className="w-1 h-1 rounded-full bg-rose-600" />
                                    {priorityStr}
                                  </span>
                                  <div
                                    className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                      t.assigneeColor || "bg-slate-700"
                                    }`}
                                  >
                                    {initials}
                                  </div>
                                </div>
                                {t.dueDate && (
                                  <span className="text-[10px] text-slate-400 block">
                                    Due {formatDate(t.dueDate)}
                                  </span>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
                            No to-do tasks
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => router.push("/tasks?create=true")}
                        className="w-full py-2 text-center text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add task</span>
                      </button>
                    </div>

                    {/* Column 2: IN PROGRESS */}
                    <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-3 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                          <span className="text-xs font-bold text-slate-800 tracking-wider">IN PROGRESS</span>
                        </div>
                        <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center">
                          {kanbanTasks.inProgress.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {kanbanTasks.inProgress.length > 0 ? (
                          kanbanTasks.inProgress.map((t) => {
                            const priorityStr = formatTaskPriority(t.priority);
                            const initials = getAssigneeInitials(t.assignee, "U");
                            const displayKey = getTaskDisplayKey(t, projectData?.key || "AIW");

                            return (
                              <div
                                key={t.id}
                                onClick={() => setSelectedTask(t)}
                                className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
                              >
                                <div className="space-y-1">
                                  <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-medium text-slate-500 bg-slate-100 border border-slate-200">
                                    {displayKey}
                                  </span>
                                  <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                                    {String(t.title || "Task")}
                                  </h4>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-medium">
                                    <span className="w-1 h-1 rounded-full bg-rose-600" />
                                    {priorityStr}
                                  </span>
                                  <div
                                    className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                      t.assigneeColor || "bg-indigo-600"
                                    }`}
                                  >
                                    {initials}
                                  </div>
                                </div>
                                {t.dueDate && (
                                  <span className="text-[10px] text-slate-400 block">
                                    Due {formatDate(t.dueDate)}
                                  </span>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
                            No in-progress tasks
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => router.push("/tasks?create=true")}
                        className="w-full py-2 text-center text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add task</span>
                      </button>
                    </div>

                    {/* Column 3: DONE */}
                    <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-3 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#2D8A60]" />
                          <span className="text-xs font-bold text-slate-800 tracking-wider">DONE</span>
                        </div>
                        <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center">
                          {kanbanTasks.done.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {kanbanTasks.done.length > 0 ? (
                          kanbanTasks.done.map((t) => {
                            const priorityStr = formatTaskPriority(t.priority);
                            const initials = getAssigneeInitials(t.assignee, "U");
                            const displayKey = getTaskDisplayKey(t, projectData?.key || "AIW");

                            return (
                              <div
                                key={t.id}
                                onClick={() => setSelectedTask(t)}
                                className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
                              >
                                <div className="space-y-1">
                                  <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-medium text-slate-500 bg-slate-100 border border-slate-200">
                                    {displayKey}
                                  </span>
                                  <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                                    {String(t.title || "Task")}
                                  </h4>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                  {priorityStr === "High" ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-medium">
                                      <span className="w-1 h-1 rounded-full bg-rose-600" />
                                      High
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium">
                                      <span className="w-1 h-1 rounded-full bg-amber-600" />
                                      Medium
                                    </span>
                                  )}
                                  <div
                                    className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                      t.assigneeColor || "bg-emerald-600"
                                    }`}
                                  >
                                    {initials}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
                            No completed tasks
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => router.push("/tasks?create=true")}
                        className="w-full py-2 text-center text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add task</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: DOCUMENTS (matching media_1790901769184, 1790901776102)
           ========================================================================= */}
        {activeTab === "documents" && (
          <div className="space-y-4">
            {/* Document Detail View if a document is selected */}
            {selectedDoc ? (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Knowledge Base</span>
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDocToDelete(selectedDoc)}
                    className="gap-1.5 text-xs text-slate-700 hover:text-red-600 border-slate-200 hover:bg-red-50 shadow-xs h-8 px-3 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Preview + Indexing Status */}
                  <div className="lg:col-span-8 space-y-4">
                    {/* Preview Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 font-serif">
                            {String(selectedDoc.title || selectedDoc.originalFilename || "Document")}
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            {String(selectedDoc.mimeType || selectedDoc.type || "Type unavailable")} · {formatDocSize(selectedDoc)} · Uploaded by {getUploaderName(selectedDoc, "Team member")} · {selectedDoc.createdAt ? formatDate(selectedDoc.createdAt) : selectedDoc.uploadedDate || "Date unavailable"}
                          </p>
                        </div>
                      </div>

                      {/* Dashed Preview Box */}
                      <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-slate-50/50 space-y-1">
                        <p className="text-xs text-slate-500 font-medium">
                          Preview not available for this file type.
                        </p>
                        <p className="text-xs text-slate-400">
                          Download the file to view its full contents.
                        </p>
                      </div>
                    </div>

                    {/* Indexing Status Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
                      <h4 className="text-sm font-bold text-slate-900 font-serif">
                        Indexing Status
                      </h4>
                      <div className="p-3.5 rounded-xl bg-[#E8F5E9] text-[#2D8A60] text-xs leading-relaxed">
                        This document is ingested into the pgvector knowledge base. AI Copilot uses its semantic content for cross-referencing and contextual citation.
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Details */}
                  <div className="lg:col-span-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5 shadow-xs">
                      <h4 className="text-sm font-bold text-slate-900 font-serif">
                        Details
                      </h4>

                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Type</span>
                          <span className="font-semibold text-slate-800">{String(selectedDoc.mimeType || selectedDoc.type || "Type unavailable")}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Size</span>
                          <span className="font-semibold text-slate-800">{formatDocSize(selectedDoc)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Uploaded by</span>
                          <span className="font-semibold text-slate-800">{getUploaderName(selectedDoc, "Team member")}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Uploaded</span>
                          <span className="font-semibold text-slate-800">{selectedDoc.createdAt ? formatDate(selectedDoc.createdAt) : selectedDoc.uploadedDate || "Date unavailable"}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Status</span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A60]" />
                            {String(selectedDoc.processingStatus || selectedDoc.status || "Unknown")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Knowledge Base Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-serif">
                      Knowledge Base
                    </h2>
                    <p className="text-xs text-slate-500">
                      Every document on this project — source material ingested into the pgvector knowledge base for AI Copilot retrieval.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowUploadModal(true)}
                    className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs h-8 px-3"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </Button>
                </div>

                {/* Informational Blue Banner */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-900 text-xs leading-relaxed">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    Documents uploaded here are automatically ingested into the project knowledge base with vector embeddings. AI Copilot uses them for semantic search, grounded Q&amp;A, and citation-backed insights.
                  </p>
                </div>

                {/* Filter & Counter */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="relative min-w-[240px] max-w-sm">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      placeholder="Search documents..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>
                  <div className="text-xs text-slate-400">
                    {filteredDocuments.length} of {tabDocuments.length} documents
                  </div>
                </div>

                {/* Documents List matching media_1790901769184.png */}
                {filteredDocuments.length > 0 ? (
                  <div className="space-y-3">
                    {filteredDocuments.map((doc) => {
                      const docTitle = String(doc.title || doc.originalFilename || "Document");
                      const isPdf = docTitle.toLowerCase().endsWith(".pdf") || doc.mimeType?.includes("pdf");
                      const isWord = docTitle.toLowerCase().endsWith(".docx") || doc.mimeType?.includes("word");
                      const isImage =
                        docTitle.toLowerCase().endsWith(".png") ||
                        docTitle.toLowerCase().endsWith(".jpg") ||
                        doc.mimeType?.includes("image");
                      const statusStr = formatDocStatus(doc.status);
                      const docSizeStr = formatDocSize(doc);
                      const uploaderName = getUploaderName(doc, "Team member");
                      const dateStr = doc.createdAt ? formatDate(doc.createdAt) : doc.uploadedDate || "Date unavailable";

                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDoc(doc)}
                          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between gap-4 cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isPdf
                                  ? "bg-rose-50 text-rose-600"
                                  : isWord
                                  ? "bg-blue-50 text-blue-600"
                                  : "bg-purple-50 text-purple-600"
                              }`}
                            >
                              {isImage ? (
                                <ImageIcon className="w-5 h-5" />
                              ) : (
                                <FileText className="w-5 h-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-slate-900 truncate">
                                {docTitle}
                              </h4>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {doc.type || (isPdf ? "PDF" : isWord ? "Word" : "Image")} · {docSizeStr} · Uploaded by {uploaderName} · {dateStr}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {statusStr === "Indexed" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A60]" />
                                Indexed
                              </span>
                            ) : statusStr === "Processing" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                Processing
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                Failed
                              </span>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDocToDelete(doc);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                      <FileText className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      {tabDocuments.length === 0 ? "No documents uploaded yet" : "No documents match your search"}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Upload specifications, architecture diagrams, and meeting notes to build this project&apos;s knowledge base.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            UPLOAD DOCUMENT MODAL (matching media_1790901783636, 1790901789453, 1790901798228)
           ========================================================================= */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-serif">
                    Upload document
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Adds to {projectName}&apos;s knowledge base.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadError(null);
                    setUploadFile(null);
                    setUploadProgress(0);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Error banner if > 10MB */}
              {uploadError ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{uploadError}</span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowUploadModal(false);
                        setUploadError(null);
                        setUploadFile(null);
                      }}
                      className="text-xs rounded-lg h-8 px-3"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setUploadError(null);
                        setUploadFile(null);
                        fileInputRef.current?.click();
                      }}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-8 px-3"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : isUploading && uploadFile ? (
                /* Uploading progress state */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-900">{uploadFile.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {(uploadFile.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 block pt-0.5">
                        Uploading... {uploadProgress}%
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsUploading(false);
                        setShowUploadModal(false);
                        setUploadFile(null);
                        setUploadProgress(0);
                      }}
                      className="text-xs rounded-lg h-8 px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Initial drop zone */
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer space-y-2"
                  >
                    <div className="w-8 h-8 rounded-full bg-white text-slate-700 flex items-center justify-center mx-auto shadow-2xs">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900">
                        Drop a file here, or click to browse
                      </p>
                      <p className="text-[11px] text-slate-500">
                        PDF, Word, or image — up to 10 MB
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUploadModal(false)}
                      className="text-xs rounded-lg h-8 px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            DELETE CONFIRMATION MODAL (matching media_1790901805661.png)
           ========================================================================= */}
        <DeleteConfirmModal
          isOpen={!!docToDelete}
          onClose={() => setDocToDelete(null)}
          onConfirm={handleDeleteDocument}
          title="Delete document"
          itemName={docToDelete ? String(docToDelete.title || docToDelete.originalFilename || "Document") : undefined}
          itemType="document"
          warningText="This action cannot be undone. If it is already indexed, the AI Copilot will no longer be able to reference it."
          confirmText="Delete document"
        />

        {/* =========================================================================
            INVITE MEMBER MODAL
           ========================================================================= */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-codex-accent" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-serif">Invite Team Members</h3>
                    <p className="text-[11px] text-slate-400">
                      Select colleagues from your team to add them to this workspace.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4 text-xs">
                {/* Search bar & selection counter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Available Team Members</span>
                    {Object.keys(selectedCandidates).length > 0 && (
                      <span className="text-[11px] font-medium text-codex-accent bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        {Object.keys(selectedCandidates).length} selected
                      </span>
                    )}
                  </div>

                  {candidates.length > 3 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={candidateSearch}
                        onChange={(e) => setCandidateSearch(e.target.value)}
                        placeholder="Filter members by name, email, or role..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-codex-accent"
                      />
                    </div>
                  )}

                  {loadingCandidates ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin text-codex-accent" />
                      <span>Loading team members...</span>
                    </div>
                  ) : candidates.length === 0 ? (
                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                      <Users className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">All team members are already in this workspace</p>
                      <p className="text-[11px] text-slate-400">
                        Need to bring someone new into your team? Invite them to the workspace first.
                      </p>
                      <div className="pt-1">
                        <Link
                          href="/team"
                          className="inline-flex items-center gap-1 text-xs font-medium text-codex-accent hover:underline"
                        >
                          <span>Manage Workspace Team in Team Settings</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ) : filteredCandidates.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                      No team members found matching &quot;{candidateSearch}&quot;
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50">
                      {filteredCandidates.map((candidate: any) => {
                        const isSelected = !!selectedCandidates[candidate.id];
                        const currentRole = selectedCandidates[candidate.id] || "CONTRIBUTOR";
                        return (
                          <div
                            key={candidate.id}
                            className={`p-2.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                              isSelected ? "bg-white" : "hover:bg-slate-100/60"
                            }`}
                          >
                            <label className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  setSelectedCandidates((prev) => {
                                    const next = { ...prev };
                                    if (e.target.checked) {
                                      next[candidate.id] = "CONTRIBUTOR";
                                    } else {
                                      delete next[candidate.id];
                                    }
                                    return next;
                                  });
                                }}
                                className="rounded border-slate-300 text-codex-accent focus:ring-codex-accent/20 h-3.5 w-3.5"
                              />
                              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700 shrink-0">
                                {(candidate.displayName || candidate.email || "U")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-800 truncate leading-tight">
                                  {candidate.displayName || candidate.email}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {candidate.email}
                                  {candidate.professionalRole ? ` • ${candidate.professionalRole}` : ""}
                                </p>
                              </div>
                            </label>

                            {isSelected && (
                              <select
                                value={currentRole}
                                onChange={(e) => {
                                  const newRole = e.target.value as "CONTRIBUTOR" | "MANAGER" | "VIEWER";
                                  setSelectedCandidates((prev) => ({
                                    ...prev,
                                    [candidate.id]: newRole,
                                  }));
                                }}
                                className="h-7 text-[11px] font-medium bg-white border border-slate-200 rounded-lg px-2 text-slate-700 outline-none focus:ring-1 focus:ring-codex-accent cursor-pointer shrink-0"
                              >
                                <option value="CONTRIBUTOR">Contributor</option>
                                <option value="MANAGER">Manager</option>
                                <option value="VIEWER">Viewer</option>
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <Link
                    href="/team"
                    className="text-[11px] text-slate-400 hover:text-codex-accent hover:underline flex items-center gap-1"
                  >
                    <span>Manage team</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInviteModal(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submittingMember || Object.keys(selectedCandidates).length === 0}
                      className="text-xs bg-codex-accent hover:bg-codex-hover text-white flex items-center gap-1.5"
                    >
                      {submittingMember ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>
                            {Object.keys(selectedCandidates).length <= 1
                              ? "Add to Project"
                              : `Add to Project (${Object.keys(selectedCandidates).length})`}
                          </span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            EDIT PROJECT MODAL
           ========================================================================= */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 font-serif">Edit Project Workspace</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Project Name</label>
                  <input
                    type="text"
                    defaultValue={projectName}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Project Key</label>
                  <input
                    type="text"
                    defaultValue={projectKey}
                    disabled
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Description</label>
                  <textarea
                    rows={3}
                    defaultValue={projectData?.description || ""}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setShowEditModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    showToast("Project details saved successfully!", "success");
                    setShowEditModal(false);
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            EDIT REQUIREMENT MODAL
           ========================================================================= */}
        {showEditReqModal && selectedReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium text-blue-600 bg-blue-50 border border-blue-200">
                    {String(selectedReq.displayKey || selectedReq.id || "Key unavailable")}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 font-serif">Edit Requirement</h3>
                </div>
                <button
                  onClick={() => setShowEditReqModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Title</label>
                  <input
                    type="text"
                    value={editReqTitle}
                    onChange={(e) => setEditReqTitle(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Requirement title"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Description</label>
                  <textarea
                    rows={4}
                    value={editReqDescription}
                    onChange={(e) => setEditReqDescription(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                    placeholder="Describe requirement behavior and constraints..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Status</label>
                    <select
                      value={editReqStatus}
                      onChange={(e) => setEditReqStatus(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="Approved">Approved</option>
                      <option value="In-Review">In-Review</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Priority (MoSCoW)</label>
                    <select
                      value={editReqPriority}
                      onChange={(e) => setEditReqPriority(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="Must-have">Must-have</option>
                      <option value="Should-have">Should-have</option>
                      <option value="Could-have">Could-have</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditReqModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    const updated = {
                      ...selectedReq,
                      title: editReqTitle,
                      description: editReqDescription,
                      status: editReqPriority,
                      priority: editReqStatus,
                    };
                    setSelectedReq(updated);
                    setTabRequirements((prev) =>
                      prev.map((r) => (r.id === selectedReq.id ? { ...r, ...updated } : r))
                    );
                    showToast("Requirement updated successfully!", "success");
                    setShowEditReqModal(false);
                    if (projectId && selectedReq.id && !selectedReq.id.startsWith("REQ-")) {
                      try {
                        await api.requirements.update(projectId, selectedReq.id, {
                          version: typeof selectedReq.version === "number" ? selectedReq.version : 1,
                          title: editReqTitle,
                          description: editReqDescription,
                        });
                      } catch (err) {
                        console.error("Backend update requirement error:", err);
                      }
                    }
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
