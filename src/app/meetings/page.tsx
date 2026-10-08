"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { ProposalReviewDialog } from "@/components/ai/proposal-review-dialog";
import { api } from "@/lib/api";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import {
  Plus,
  Clock,
  Search,
  ArrowLeft,
  Pencil,
  Check,
  ChevronDown,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

interface ProjectInfo {
  id: string;
  name: string;
  key: string;
}

interface MemberInfo {
  id: string;
  name: string;
  displayName: string;
  email?: string;
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

function formatDateBadge(dateStr: string | Date | undefined) {
  if (!dateStr) return { day: "—", month: "" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { day: "—", month: "" };
  const day = d.getDate();
  const monthNames = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEPT",
    "OCT",
    "NOV",
    "DEC",
  ];
  const month = monthNames[d.getMonth()];
  return { day: String(day), month };
}

function formatMeetingTime(dateStr: string | Date | undefined): string {
  if (!dateStr) return "10:00 AM";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "10:00 AM";
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? "0" + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

function formatDetailDate(dateStr: string | Date | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const m = monthNames[d.getMonth()];
  const day = d.getDate() < 10 ? `0${d.getDate()}` : `${d.getDate()}`;
  return `${m} ${day}, ${d.getFullYear()}`;
}

function parseTimeToHoursMinutes(timeStr: string): { hours: number; minutes: number } {
  const trimmed = (timeStr || "").trim().toUpperCase();
  const isPM = trimmed.includes("PM");
  const isAM = trimmed.includes("AM");
  const clean = trimmed.replace(/[^\d:]/g, "");
  const parts = clean.split(":");
  let hours = parseInt(parts[0] || "10", 10);
  let minutes = parseInt(parts[1] || "0", 10);
  if (isNaN(hours)) hours = 10;
  if (isNaN(minutes)) minutes = 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return { hours, minutes };
}

function getAttendeeAvatar(user: {
  userId?: string;
  id?: string;
  displayName?: string;
  name?: string;
  email?: string;
}) {
  const name = user.displayName || user.name || user.email || "Member";
  const trimmed = name.trim();

  let initials = "U";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (trimmed.length >= 2) {
    initials = trimmed.slice(0, 2).toUpperCase();
  } else if (trimmed.length === 1) {
    initials = trimmed.toUpperCase();
  }

  const colors = [
    "bg-[#2563eb]",
    "bg-[#f59e0b]",
    "bg-[#0f172a]",
    "bg-[#dc2626]",
    "bg-[#7c3aed]",
    "bg-[#059669]",
    "bg-[#ea580c]",
    "bg-[#0891b2]",
  ];
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];

  return { initials, color, name: trimmed };
}

export default function MeetingsPage() {
  const { currentProject, projects } = useAuth();
  const { showToast } = useToast();

  // Navigation view: 'list' | 'detail' | 'new' | 'edit'
  const [view, setView] = useState<"list" | "detail" | "new" | "edit">("list");
  const [activeMeeting, setActiveMeeting] = useState<any | null>(null);

  // Meetings data
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    currentProject ? currentProject.id : "ALL"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Real project members map: projectId -> MemberInfo[]
  const [projectMembersMap, setProjectMembersMap] = useState<Record<string, MemberInfo[]>>({});

  // Form states (used for both New and Edit views)
  const [formTitle, setFormTitle] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formTime, setFormTime] = useState("10:00 AM");
  const [selectedAttendeeUserIds, setSelectedAttendeeUserIds] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // AI Proposal state
  const [activeProposal, setActiveProposal] = useState<any>(null);
  const [generatingProposalId, setGeneratingProposalId] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirmMeeting, setDeleteConfirmMeeting] = useState<any | null>(null);
  const [deletingMeeting, setDeletingMeeting] = useState(false);

  // Close project dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node)
      ) {
        setProjectDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch project members for a specific project
  const fetchProjectMembers = useCallback(async (projId: string) => {
    if (!projId || projId === "ALL") return [];
    try {
      const res = await api.projects.getMembers(projId);
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      const members: MemberInfo[] = list.map((item: any) => ({
        id: item.user?.id || item.userId || item.id,
        name: item.user?.displayName || item.user?.email || "Member",
        displayName: item.user?.displayName || item.user?.email || "Member",
        email: item.user?.email,
      }));
      setProjectMembersMap((prev) => ({ ...prev, [projId]: members }));
      return members;
    } catch (err) {
      console.error("Failed to load members for project " + projId, err);
      return [];
    }
  }, []);

  // Load all real meetings and pre-cache members across projects
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let projs = currentProject ? [currentProject] : projects;
      if (!projs || projs.length === 0) {
        projs = (await api.projects.list()) || [];
      }

      // Fetch meetings and members concurrently
      const results = await Promise.all(
        projs.map(async (p: any) => {
          try {
            const res = await api.meetings.list(p.id);
            const list = Array.isArray(res) ? res : (res as any)?.data || [];
            return list.map((m: any) => ({
              ...m,
              projectName: m.projectName || p.name,
              projectId: m.projectId || p.id,
              project: m.project || { id: p.id, name: p.name, key: p.key },
            }));
          } catch {
            return [];
          }
        })
      );

      // Pre-load members for each project
      const membersMap: Record<string, MemberInfo[]> = {};
      await Promise.all(
        projs.map(async (p: any) => {
          try {
            const mems = await api.projects.getMembers(p.id);
            const list = Array.isArray(mems) ? mems : (mems as any)?.data || [];
            membersMap[p.id] = list.map((item: any) => ({
              id: item.user?.id || item.userId || item.id,
              name: item.user?.displayName || item.user?.email || "Member",
              displayName: item.user?.displayName || item.user?.email || "Member",
              email: item.user?.email,
            }));
          } catch {
            membersMap[p.id] = [];
          }
        })
      );
      setProjectMembersMap(membersMap);

      const allMeetings = results.flat();
      setMeetings(allMeetings);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to load meetings", "error");
    } finally {
      setLoading(false);
    }
  }, [projects, currentProject, showToast]);

  // Initial URL query handling
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("create") === "true") {
        openNewMeetingView();
      }
      const targetId = params.get("id") || params.get("meetingId");
      if (targetId && meetings.length > 0) {
        const found = meetings.find(
          (m) => m.id === targetId || m.id?.toLowerCase() === targetId.toLowerCase()
        );
        if (found) {
          openDetailView(found);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetings]);

  useEffect(() => {
    setSelectedProjectId(currentProject ? currentProject.id : "ALL");
  }, [currentProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Active projects list for dropdown
  const allProjects = useMemo(() => {
    const map = new Map<string, ProjectInfo>();
    for (const p of projects) {
      map.set(p.id, { id: p.id, name: p.name, key: p.key });
    }
    for (const m of meetings) {
      if (m.project) {
        map.set(m.project.id, m.project);
      } else if (m.projectId && m.projectName) {
        map.set(m.projectId, { id: m.projectId, name: m.projectName, key: "" });
      }
    }
    return Array.from(map.values());
  }, [projects, meetings]);

  const selectedProjectObj = useMemo(() => {
    if (selectedProjectId === "ALL") return null;
    return allProjects.find((p) => p.id === selectedProjectId) || null;
  }, [allProjects, selectedProjectId]);

  // Filter meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (selectedProjectId !== "ALL" && m.projectId !== selectedProjectId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (m.title || "").toLowerCase().includes(q);
        const matchNotes = (m.notes || "").toLowerCase().includes(q);
        const matchProject = (m.projectName || m.project?.name || "").toLowerCase().includes(q);
        const matchAttendees = (m.attendees || []).some(
          (a: any) =>
            (a.displayName || "").toLowerCase().includes(q) ||
            (a.email || "").toLowerCase().includes(q)
        );
        if (!matchTitle && !matchNotes && !matchProject && !matchAttendees) {
          return false;
        }
      }
      return true;
    });
  }, [meetings, selectedProjectId, searchQuery]);

  // Split into Upcoming and Past based on current time
  const { upcomingMeetings, pastMeetings } = useMemo(() => {
    const now = new Date();
    const upcoming: any[] = [];
    const past: any[] = [];

    for (const m of filteredMeetings) {
      const start = new Date(m.startsAt || m.createdAt);
      if (start >= now) {
        upcoming.push(m);
      } else {
        past.push(m);
      }
    }

    upcoming.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    past.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

    return { upcomingMeetings: upcoming, pastMeetings: past };
  }, [filteredMeetings]);

  const activeProjectsCount = useMemo(() => {
    const set = new Set<string>();
    for (const m of meetings) {
      if (m.projectId) set.add(m.projectId);
    }
    return set.size || allProjects.length || 1;
  }, [meetings, allProjects]);

  // Current available members for selected form project
  const availableMembers = useMemo(() => {
    if (!formProjectId) return [];
    return projectMembersMap[formProjectId] || [];
  }, [formProjectId, projectMembersMap]);

  // When formProjectId changes, ensure its members are loaded if not in map
  useEffect(() => {
    if (formProjectId && formProjectId !== "ALL" && !projectMembersMap[formProjectId]) {
      fetchProjectMembers(formProjectId);
    }
  }, [formProjectId, projectMembersMap, fetchProjectMembers]);

  // Navigation handlers
  const openDetailView = (meeting: any) => {
    setActiveMeeting(meeting);
    setView("detail");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("id", meeting.id);
      url.searchParams.delete("create");
      window.history.pushState({}, "", url.toString());
    }
  };

  const openNewMeetingView = () => {
    setFormTitle("");
    const targetProjId =
      selectedProjectId !== "ALL"
        ? selectedProjectId
        : currentProject?.id || allProjects[0]?.id || "";
    setFormProjectId(targetProjId);
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormTime("10:00 AM");
    setSelectedAttendeeUserIds([]);
    setFormNotes("");
    if (targetProjId && !projectMembersMap[targetProjId]) {
      fetchProjectMembers(targetProjId);
    }
    setView("new");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("create", "true");
      url.searchParams.delete("id");
      window.history.pushState({}, "", url.toString());
    }
  };

  const openEditView = (meeting: any) => {
    setActiveMeeting(meeting);
    setFormTitle(meeting.title || "");
    const projId = meeting.projectId || currentProject?.id || allProjects[0]?.id || "";
    setFormProjectId(projId);
    if (projId && !projectMembersMap[projId]) {
      fetchProjectMembers(projId);
    }
    if (meeting.startsAt) {
      const d = new Date(meeting.startsAt);
      setFormDate(d.toISOString().split("T")[0]);
      setFormTime(formatMeetingTime(d));
    } else {
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormTime("10:00 AM");
    }
    const attIds = (meeting.attendees || []).map((a: any) => a.userId || a.id);
    setSelectedAttendeeUserIds(attIds);
    setFormNotes(meeting.notes || meeting.agenda || "");
    setView("edit");
  };

  const handleBackToList = () => {
    setView("list");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("id");
      url.searchParams.delete("create");
      window.history.pushState({}, "", url.toString());
    }
  };

  const toggleAttendee = (userId: string) => {
    setSelectedAttendeeUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Create Meeting submit
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast("Please provide a meeting title", "error");
      return;
    }
    const targetProjId = formProjectId || currentProject?.id || allProjects[0]?.id;
    if (!targetProjId) {
      showToast("Please select a project", "error");
      return;
    }

    setSubmitting(true);
    try {
      const { hours, minutes } = parseTimeToHoursMinutes(formTime);
      const start = new Date(formDate);
      start.setHours(hours, minutes, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

      await api.meetings.create(targetProjId, {
        title: formTitle.trim(),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        notes: formNotes.trim() || undefined,
        attendeeUserIds:
          selectedAttendeeUserIds.length > 0 ? selectedAttendeeUserIds : undefined,
      });

      showToast("Meeting created successfully!", "success");
      await loadData();
      handleBackToList();
    } catch (err: any) {
      showToast(err.message || "Failed to create meeting", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Meeting submit
  const handleSaveEditMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMeeting || !formTitle.trim()) {
      showToast("Please provide a meeting title", "error");
      return;
    }

    setSubmitting(true);
    try {
      const { hours, minutes } = parseTimeToHoursMinutes(formTime);
      const start = new Date(formDate);
      start.setHours(hours, minutes, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      await api.meetings.update(
        activeMeeting.projectId || formProjectId,
        activeMeeting.id,
        {
          version: activeMeeting.version ?? 1,
          title: formTitle.trim(),
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          notes: formNotes.trim() || undefined,
          attendeeUserIds: selectedAttendeeUserIds,
        }
      );

      showToast("Meeting updated successfully!", "success");
      await loadData();

      // Refresh active meeting object in state
      const proj = allProjects.find((p) => p.id === (activeMeeting.projectId || formProjectId));
      const membersForProj = projectMembersMap[activeMeeting.projectId || formProjectId] || [];
      const updatedObj = {
        ...activeMeeting,
        version: (activeMeeting.version ?? 1) + 1,
        title: formTitle.trim(),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        notes: formNotes.trim(),
        projectName: proj?.name || activeMeeting.projectName,
        attendees: selectedAttendeeUserIds.map((uid) => {
          const m = membersForProj.find((mem) => mem.id === uid);
          return {
            userId: uid,
            displayName: m?.displayName || m?.name || "Member",
          };
        }),
      };
      setActiveMeeting(updatedObj);
      setView("detail");
    } catch (err: any) {
      showToast(err.message || "Failed to update meeting", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Meeting
  const handleDeleteMeeting = (meeting: any) => {
    if (!meeting) return;
    setDeleteConfirmMeeting(meeting);
  };

  const handleConfirmDeleteMeeting = async () => {
    if (!deleteConfirmMeeting) return;
    setDeletingMeeting(true);
    try {
      await api.meetings.delete(deleteConfirmMeeting.projectId, deleteConfirmMeeting.id);
      showToast("Meeting deleted successfully", "success");
      setDeleteConfirmMeeting(null);
      handleBackToList();
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete meeting", "error");
    } finally {
      setDeletingMeeting(false);
    }
  };

  // AI Meeting Analysis
  const handleGenerateAnalysis = async (meeting: any) => {
    const projId = meeting.projectId || currentProject?.id;
    if (!projId) return;
    if (!meeting.transcriptText && !meeting.notes) {
      showToast("Meeting must have notes or a transcript for AI analysis.", "error");
      return;
    }
    setGeneratingProposalId(meeting.id);
    try {
      const res = await api.ai.generateMeetingAnalysis(projId, meeting.id);
      setActiveProposal(res.proposal || res);
      showToast("Generated meeting analysis! Review proposals before applying.", "info");
    } catch (err: any) {
      showToast(err.message || "Failed to generate meeting analysis", "error");
    } finally {
      setGeneratingProposalId(null);
    }
  };

  // Active meeting attendees with name resolution
  const activeMeetingAttendees = useMemo(() => {
    if (!activeMeeting) return [];
    const list = activeMeeting.attendees || [];
    const projMembers = projectMembersMap[activeMeeting.projectId] || [];
    return list.map((att: any) => {
      const mem = projMembers.find((m) => m.id === (att.userId || att.id));
      return {
        userId: att.userId || att.id,
        displayName: att.displayName || mem?.displayName || mem?.name || "Member",
        email: att.email || mem?.email,
      };
    });
  }, [activeMeeting, projectMembersMap]);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16 pt-1">
        {/* ========================================================================= */}
        {/* VIEW 1: MEETINGS LIST VIEW (IMAGE 1)                                      */}
        {/* ========================================================================= */}
        {view === "list" && (
          <div className="space-y-6">
            {/* Top Breadcrumbs and New Meetings Button */}
            <div className="flex items-start justify-between">
              <div>
                <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                  <Link href="/dashboard" className="text-[#2563eb] hover:underline font-medium">
                    Dashboard
                  </Link>
                  <span>/</span>
                  <span className="text-slate-800 font-medium">Meetings</span>
                </nav>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
                  Meetings
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {filteredMeetings.length} meeting{filteredMeetings.length === 1 ? "" : "s"} across{" "}
                  {activeProjectsCount} active {activeProjectsCount === 1 ? "project" : "projects"}.
                </p>
              </div>

              {/* + New Meetings Button */}
              <button
                type="button"
                onClick={openNewMeetingView}
                className="bg-[#3b82f6] hover:bg-blue-600 active:bg-blue-700 text-white font-medium text-xs rounded-xl px-4 py-2.5 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ New Meetings</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex items-center justify-between gap-4">
              {/* Project: All Dropdown */}
              <div className="relative" ref={projectDropdownRef}>
                <button
                  type="button"
                  onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-normal text-slate-700 hover:border-slate-300 shadow-2xs transition-colors cursor-pointer"
                >
                  <span>
                    Project: {selectedProjectObj ? selectedProjectObj.name : "All"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {projectDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProjectId("ALL");
                        setProjectDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between ${
                        selectedProjectId === "ALL"
                          ? "font-semibold text-blue-600 bg-blue-50/50"
                          : "text-slate-700"
                      }`}
                    >
                      <span>Project: All</span>
                      {selectedProjectId === "ALL" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    {allProjects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          setProjectDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between ${
                          selectedProjectId === p.id
                            ? "font-semibold text-blue-600 bg-blue-50/50"
                            : "text-slate-700"
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {selectedProjectId === p.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter meetings... search box */}
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter meetings..."
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Meetings Lists */}
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Loading meetings...
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="py-16 text-center bg-white border border-slate-200 rounded-2xl p-8 shadow-2xs">
                <p className="text-sm font-medium text-slate-700">No meetings found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {searchQuery
                    ? `No meetings match "${searchQuery}"`
                    : "No meetings logged yet for the selected project filter."}
                </p>
                <button
                  type="button"
                  onClick={openNewMeetingView}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + New Meetings
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* UPCOMING SECTION */}
                {upcomingMeetings.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>Upcoming</span>
                      <span className="text-xs font-normal text-slate-400">
                        {upcomingMeetings.length}
                      </span>
                    </h2>
                    <div className="space-y-3">
                      {upcomingMeetings.map((m) => {
                        const dateBadge = formatDateBadge(m.startsAt);
                        const meetingAttendees = m.attendees || [];

                        return (
                          <div
                            key={m.id}
                            onClick={() => openDetailView(m)}
                            className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              {/* Date Square Badge */}
                              <div className="w-12 h-12 rounded-xl bg-slate-100/90 border border-slate-200/80 flex flex-col items-center justify-center shrink-0">
                                <span className="text-base font-bold text-slate-800 leading-none">
                                  {dateBadge.day}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-none mt-1">
                                  {dateBadge.month}
                                </span>
                              </div>

                              {/* Title and Project Pill */}
                              <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                  {m.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getProjectBadgeStyle(
                                      m.projectName || m.project?.name
                                    )}`}
                                  >
                                    {m.projectName || m.project?.name || "Workspace"}
                                  </span>
                                  <span className="text-xs text-slate-400 font-normal">
                                    {formatMeetingTime(m.startsAt)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Overlapping Attendee Avatars */}
                            {meetingAttendees.length > 0 && (
                              <div className="flex items-center -space-x-1.5 shrink-0 pl-4">
                                {meetingAttendees.map((att: any, idx: number) => {
                                  const avatar = getAttendeeAvatar(att);
                                  return (
                                    <div
                                      key={att.userId || att.id || idx}
                                      title={att.displayName || att.email || "Member"}
                                      className={`w-6 h-6 rounded-full text-[10px] font-semibold text-white ring-2 ring-white flex items-center justify-center ${avatar.color}`}
                                    >
                                      {avatar.initials}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PAST SECTION */}
                {pastMeetings.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>Past</span>
                      <span className="text-xs font-normal text-slate-400">
                        {pastMeetings.length}
                      </span>
                    </h2>
                    <div className="space-y-3">
                      {pastMeetings.map((m) => {
                        const dateBadge = formatDateBadge(m.startsAt);
                        const meetingAttendees = m.attendees || [];

                        return (
                          <div
                            key={m.id}
                            onClick={() => openDetailView(m)}
                            className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              {/* Date Square Badge */}
                              <div className="w-12 h-12 rounded-xl bg-slate-100/90 border border-slate-200/80 flex flex-col items-center justify-center shrink-0">
                                <span className="text-base font-bold text-slate-800 leading-none">
                                  {dateBadge.day}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-none mt-1">
                                  {dateBadge.month}
                                </span>
                              </div>

                              {/* Title and Project Pill */}
                              <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                  {m.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getProjectBadgeStyle(
                                      m.projectName || m.project?.name
                                    )}`}
                                  >
                                    {m.projectName || m.project?.name || "Workspace"}
                                  </span>
                                  <span className="text-xs text-slate-400 font-normal">
                                    {formatMeetingTime(m.startsAt)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Overlapping Attendee Avatars */}
                            {meetingAttendees.length > 0 && (
                              <div className="flex items-center -space-x-1.5 shrink-0 pl-4">
                                {meetingAttendees.map((att: any, idx: number) => {
                                  const avatar = getAttendeeAvatar(att);
                                  return (
                                    <div
                                      key={att.userId || att.id || idx}
                                      title={att.displayName || att.email || "Member"}
                                      className={`w-6 h-6 rounded-full text-[10px] font-semibold text-white ring-2 ring-white flex items-center justify-center ${avatar.color}`}
                                    >
                                      {avatar.initials}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: MEETING DETAIL VIEW (IMAGE 2)                                     */}
        {/* ========================================================================= */}
        {view === "detail" && activeMeeting && (
          <div className="space-y-5">
            {/* Top Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-xs text-slate-500">
              <Link href="/projects" className="text-[#2563eb] hover:underline font-medium">
                Projects
              </Link>
              <span>/</span>
              <button
                type="button"
                onClick={handleBackToList}
                className="text-slate-800 hover:text-slate-900 font-medium cursor-pointer"
              >
                Meetings
              </button>
            </nav>

            {/* Filter and Search Bar Row */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative" ref={projectDropdownRef}>
                <button
                  type="button"
                  onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-normal text-slate-700 hover:border-slate-300 shadow-2xs transition-colors cursor-pointer"
                >
                  <span>
                    Project: {selectedProjectObj ? selectedProjectObj.name : "All"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter meetings..."
                  disabled
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-400 shadow-2xs cursor-not-allowed"
                />
              </div>
            </div>

            {/* Back to Meetings link */}
            <div>
              <button
                type="button"
                onClick={handleBackToList}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1.5 font-medium cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Meetings</span>
              </button>
            </div>

            {/* Title and Edit Button Header */}
            <div className="flex items-center justify-between pt-1">
              <h1 className="text-lg font-semibold text-slate-900">
                {activeMeeting.title}
              </h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteMeeting(activeMeeting)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 bg-white hover:bg-red-50 text-xs font-medium text-red-600 shadow-2xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEditView(activeMeeting)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <Pencil className="w-3 h-3 text-slate-500" />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* 2-Column Detail Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pt-1">
              {/* Left Column (col-span-2): Notes Card */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
                  <h2 className="text-sm font-semibold text-slate-900 mb-3">Notes</h2>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {activeMeeting.notes || "No notes recorded for this meeting yet."}
                  </p>
                </div>

                {/* AI Meeting Analysis Section */}
                {(activeMeeting.notes || activeMeeting.transcriptText) && (
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        AI Meeting Analysis
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Synthesize action items, requirements, and architectural decisions from notes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGenerateAnalysis(activeMeeting)}
                      disabled={generatingProposalId === activeMeeting.id}
                      className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg shadow-2xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>
                        {generatingProposalId === activeMeeting.id
                          ? "Analyzing..."
                          : "Generate AI Proposals"}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column (col-span-1): Details and Attendees */}
              <div className="space-y-4">
                {/* Details Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                  <h2 className="text-sm font-semibold text-slate-900 mb-4">Details</h2>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Project</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getProjectBadgeStyle(
                          activeMeeting.projectName || activeMeeting.project?.name
                        )}`}
                      >
                        {activeMeeting.projectName || activeMeeting.project?.name || "Workspace"}
                      </span>
                    </div>
                    <div className="border-t border-slate-100" />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Date</span>
                      <span className="text-slate-800 font-medium">
                        {formatDetailDate(activeMeeting.startsAt)}
                      </span>
                    </div>
                    <div className="border-t border-slate-100" />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Time</span>
                      <span className="text-slate-800 font-medium">
                        {formatMeetingTime(activeMeeting.startsAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attendees Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-900">Attendees</h2>
                    <span className="text-xs text-slate-400 font-normal">
                      {activeMeetingAttendees.length}
                    </span>
                  </div>
                  {activeMeetingAttendees.length === 0 ? (
                    <p className="text-xs text-slate-400">No attendees recorded.</p>
                  ) : (
                    <div className="space-y-3">
                      {activeMeetingAttendees.map((att: any, idx: number) => {
                        const avatar = getAttendeeAvatar(att);
                        return (
                          <div key={att.userId || att.id || idx} className="flex items-center gap-3">
                            <div
                              className={`w-7 h-7 rounded-full text-xs font-semibold text-white flex items-center justify-center shrink-0 ${avatar.color}`}
                            >
                              {avatar.initials}
                            </div>
                            <span className="text-xs font-medium text-slate-800">
                              {att.displayName || att.email || "Member"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: NEW MEETING FORM VIEW (IMAGE 3)                                   */}
        {/* ========================================================================= */}
        {view === "new" && (
          <div className="space-y-5">
            {/* Top Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-xs text-slate-500">
              <Link href="/projects" className="text-[#2563eb] hover:underline font-medium">
                Projects
              </Link>
              <span>/</span>
              <button
                type="button"
                onClick={handleBackToList}
                className="text-slate-800 hover:text-slate-900 font-medium cursor-pointer"
              >
                Meetings
              </button>
            </nav>

            {/* Filter and Search Bar Row */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-normal text-slate-700 shadow-2xs"
                >
                  <span>Project: {selectedProjectObj ? selectedProjectObj.name : "All"}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter meetings..."
                  disabled
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-400 shadow-2xs cursor-not-allowed"
                />
              </div>
            </div>

            {/* Back to Meetings link */}
            <div>
              <button
                type="button"
                onClick={handleBackToList}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1.5 font-medium cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Meetings</span>
              </button>
            </div>

            <h1 className="text-sm font-semibold text-slate-900 pt-1">
              New meeting
            </h1>

            {/* Form Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 max-w-2xl shadow-2xs">
              <form onSubmit={handleCreateMeeting} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Sprint Planning"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                  />
                </div>

                {/* 3-Col Row: Project, Date, Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Project */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1.5">
                      Project
                    </label>
                    <div className="relative">
                      <select
                        value={formProjectId}
                        onChange={(e) => setFormProjectId(e.target.value)}
                        className="w-full appearance-none border border-slate-300 rounded-lg px-3 py-2 pr-8 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs cursor-pointer"
                      >
                        {allProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1.5">
                      Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        required
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1.5">
                      Time
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        placeholder="10:00 AM"
                        required
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-8 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                      />
                      <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Real Attendees Circular Checkbox Selector */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-2">
                    Attendees
                  </label>
                  {availableMembers.length === 0 ? (
                    <p className="text-xs text-slate-400">No project members found for this project.</p>
                  ) : (
                    <div className="space-y-2">
                      {availableMembers.map((m) => {
                        const isChecked = selectedAttendeeUserIds.includes(m.id);
                        return (
                          <div
                            key={m.id}
                            onClick={() => toggleAttendee(m.id)}
                            className="flex items-center gap-2.5 cursor-pointer select-none py-0.5 group"
                          >
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                                isChecked
                                  ? "bg-blue-600 text-white"
                                  : "border-2 border-blue-500 bg-white group-hover:border-blue-600"
                              }`}
                            >
                              {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className="text-xs text-slate-800 group-hover:text-slate-900">
                              {m.displayName || m.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Notes / Agendas */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">
                    Notes / Agendas
                  </label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="What was discussed or will be discussed?"
                    rows={4}
                    className="w-full border border-slate-300 rounded-lg p-3 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Creating..." : "Create Meeting"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: EDIT MEETING FORM VIEW (IMAGE 4)                                  */}
        {/* ========================================================================= */}
        {view === "edit" && activeMeeting && (
          <div className="space-y-5">
            {/* Top Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-xs text-slate-500">
              <Link href="/projects" className="text-[#2563eb] hover:underline font-medium">
                Projects
              </Link>
              <span>/</span>
              <button
                type="button"
                onClick={handleBackToList}
                className="text-slate-800 hover:text-slate-900 font-medium cursor-pointer"
              >
                Meetings
              </button>
            </nav>

            {/* Filter and Search Bar Row */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-normal text-slate-700 shadow-2xs"
                >
                  <span>Project: {selectedProjectObj ? selectedProjectObj.name : "All"}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter meetings..."
                  disabled
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-400 shadow-2xs cursor-not-allowed"
                />
              </div>
            </div>

            {/* Back to Meeting title link */}
            <div>
              <button
                type="button"
                onClick={() => setView("detail")}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1.5 font-medium cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{activeMeeting.title}</span>
              </button>
            </div>

            <h1 className="text-sm font-semibold text-slate-900 pt-1">
              Edit meeting
            </h1>

            {/* Form Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 max-w-2xl shadow-2xs">
              <form onSubmit={handleSaveEditMeeting} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                  />
                </div>

                {/* 3-Col Row: Project, Date, Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Project */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1.5">
                      Project
                    </label>
                    <div className="relative">
                      <select
                        value={formProjectId}
                        onChange={(e) => setFormProjectId(e.target.value)}
                        className="w-full appearance-none border border-slate-300 rounded-lg px-3 py-2 pr-8 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs cursor-pointer"
                      >
                        {allProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1.5">
                      Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        required
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1.5">
                      Time
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        placeholder="10:00 AM"
                        required
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-8 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                      />
                      <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Real Attendees Circular Checkbox Selector */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-2">
                    Attendees
                  </label>
                  {availableMembers.length === 0 ? (
                    <p className="text-xs text-slate-400">No project members found for this project.</p>
                  ) : (
                    <div className="space-y-2">
                      {availableMembers.map((m) => {
                        const isChecked = selectedAttendeeUserIds.includes(m.id);
                        return (
                          <div
                            key={m.id}
                            onClick={() => toggleAttendee(m.id)}
                            className="flex items-center gap-2.5 cursor-pointer select-none py-0.5 group"
                          >
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                                isChecked
                                  ? "bg-blue-600 text-white"
                                  : "border-2 border-blue-500 bg-white group-hover:border-blue-600"
                              }`}
                            >
                              {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className="text-xs text-slate-800 group-hover:text-slate-900">
                              {m.displayName || m.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Notes / Agendas */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">
                    Notes / Agendas
                  </label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={4}
                    className="w-full border border-slate-300 rounded-lg p-3 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setView("detail")}
                    className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* AI Proposal Review Dialog */}
        {activeProposal && (
          <ProposalReviewDialog
            isOpen={!!activeProposal}
            proposal={activeProposal}
            projectId={activeMeeting?.projectId || currentProject?.id || ""}
            onClose={() => setActiveProposal(null)}
            onConfirmed={() => {
              setActiveProposal(null);
              showToast("Applied AI proposal to project!", "success");
              loadData();
            }}
          />
        )}

        {/* DELETE MEETING CONFIRMATION MODAL */}
        <DeleteConfirmModal
          isOpen={!!deleteConfirmMeeting}
          onClose={() => !deletingMeeting && setDeleteConfirmMeeting(null)}
          onConfirm={handleConfirmDeleteMeeting}
          title="Delete meeting"
          itemName={deleteConfirmMeeting?.title}
          itemType="meeting"
          warningText="This action cannot be undone. All meeting transcripts, agendas, notes, and attendance records will be permanently removed."
          confirmText="Delete meeting"
          loading={deletingMeeting}
        />
      </div>
    </AppLayout>
  );
}
