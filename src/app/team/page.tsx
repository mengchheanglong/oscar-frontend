"use client";

import React, { useState, useEffect, useMemo, useCallback, type KeyboardEvent, type ClipboardEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import {
  Users,
  UserPlus,
  Shield,
  Clock,
  Copy,
  Trash2,
  Search,
  CheckCircle2,
  X,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { CustomDropdown, type CustomDropdownOption } from "@/components/ui/custom-dropdown";
import { FilterDropdown, type FilterOption } from "@/components/ui/filter-dropdown";

const INVITE_PROF_ROLE_OPTIONS: CustomDropdownOption[] = [
  { value: "DEVELOPER", label: "Developer" },
  { value: "PM", label: "Product Manager" },
  { value: "QA", label: "QA Engineer" },
  { value: "INFRASTRUCTURE", label: "DevOps / Infra" },
  { value: "DX", label: "UX / DX" },
  { value: "PRESENTATION", label: "Technical Writer" },
];

const INVITE_SYSTEM_ROLE_OPTIONS: CustomDropdownOption[] = [
  { value: "USER", label: "Member" },
  { value: "ADMIN", label: "Admin" },
];

const FILTER_ROLE_OPTIONS: FilterOption[] = [
  { value: "DEVELOPER", label: "Developer", color: "#3B82F6" },
  { value: "PM", label: "Product Manager", color: "#F59E0B" },
  { value: "QA", label: "QA Engineer", color: "#10B981" },
  { value: "INFRASTRUCTURE", label: "DevOps / Infra", color: "#8B5CF6" },
  { value: "DX", label: "UX / DX", color: "#06B6D4" },
  { value: "PRESENTATION", label: "Technical Writer", color: "#14B8A6" },
];

const FILTER_ACCESS_OPTIONS: FilterOption[] = [
  { value: "ADMIN", label: "Admin", color: "#EF4444" },
  { value: "USER", label: "Member", color: "#64748B" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface WorkspaceMember {
  id: string;
  email: string;
  displayName: string;
  systemRole: "ADMIN" | "USER";
  professionalRole: "PM" | "DEVELOPER" | "QA" | "DX" | "INFRASTRUCTURE" | "PRESENTATION";
  isActive: boolean;
  createdAt: string;
}

interface WorkspaceInvite {
  id: string;
  email: string;
  systemRole: "ADMIN" | "USER";
  professionalRole: "PM" | "DEVELOPER" | "QA" | "DX" | "INFRASTRUCTURE" | "PRESENTATION";
  token: string;
  inviteUrl: string;
  status: "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED";
  invitedBy?: { id: string; displayName: string } | null;
  expiresAt: string;
  createdAt: string;
}

function getMemberAvatarBg(role: string): string {
  switch (role) {
    case "PM":
      return "bg-amber-600";
    case "DEVELOPER":
      return "bg-blue-600";
    case "QA":
      return "bg-emerald-600";
    case "INFRASTRUCTURE":
      return "bg-purple-600";
    case "DX":
      return "bg-cyan-600";
    case "PRESENTATION":
      return "bg-teal-600";
    default:
      return "bg-slate-700";
  }
}

function getProfRoleLabel(role: string): string {
  switch (role) {
    case "PM":
      return "Product Manager";
    case "DEVELOPER":
      return "Developer";
    case "QA":
      return "QA Engineer";
    case "INFRASTRUCTURE":
      return "DevOps / Infra";
    case "DX":
      return "UX / DX";
    case "PRESENTATION":
      return "Technical Writer";
    default:
      return role || "Member";
  }
}

function getProfRoleBadgeStyle(role: string): string {
  switch (role) {
    case "PM":
      return "bg-amber-50 text-amber-700 border-amber-200/80";
    case "DEVELOPER":
      return "bg-blue-50 text-blue-700 border-blue-200/80";
    case "QA":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    case "INFRASTRUCTURE":
      return "bg-purple-50 text-purple-700 border-purple-200/80";
    case "DX":
      return "bg-cyan-50 text-cyan-700 border-cyan-200/80";
    case "PRESENTATION":
      return "bg-teal-50 text-teal-700 border-teal-200/80";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200/80";
  }
}

export default function TeamPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite input state (chip-based like evalora-frontend)
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [inviteSystemRole, setInviteSystemRole] = useState<"ADMIN" | "USER">("USER");
  const [inviteProfRole, setInviteProfRole] = useState<
    "PM" | "DEVELOPER" | "QA" | "DX" | "INFRASTRUCTURE" | "PRESENTATION"
  >("DEVELOPER");
  const [inviting, setInviting] = useState(false);
  const [recentInviteLinks, setRecentInviteLinks] = useState<Array<{ email: string; link: string }>>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  useEffect(() => {
    if (!showInviteForm) return;
    const frame = requestAnimationFrame(() => {
      const form = document.getElementById("team-invite-form");
      form?.scrollIntoView({ behavior: "smooth", block: "center" });
      form?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [showInviteForm]);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [selectedAccessFilter, setSelectedAccessFilter] = useState<string>("ALL");
  const [busyId, setBusyId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        api.workspace.getMembers().catch(() => []),
        api.workspace.getInvites().catch(() => []),
      ]);

      const membersList = Array.isArray(membersRes)
        ? membersRes
        : (membersRes as any)?.data || [];
      const invitesList = Array.isArray(invitesRes)
        ? invitesRes
        : (invitesRes as any)?.data || [];

      setMembers(membersList);
      setInvites(invitesList);
    } catch (err: any) {
      console.error("Failed to load team data", err);
      showToast(err.message || "Failed to load team members", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived KPI metrics
  const pendingInvites = useMemo(
    () => invites.filter((inv) => inv.status === "PENDING"),
    [invites]
  );

  // Chip management logic
  const mergeEmails = (raw: string): string[] | null => {
    const tokens = raw.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
    const invalid = tokens.filter((t) => !EMAIL_PATTERN.test(t));
    if (invalid.length > 0) {
      setEmailError(`Invalid email format: ${invalid.join(", ")}`);
      return null;
    }
    setEmailError("");
    const seen = new Set(inviteEmails.map((e) => e.toLowerCase()));
    const merged = [...inviteEmails];
    for (const t of tokens) {
      const lower = t.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        merged.push(t);
      }
    }
    return merged;
  };

  const commitEmails = (raw: string) => {
    const merged = mergeEmails(raw);
    if (!merged) return;
    setInviteEmails(merged);
    setEmailInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      commitEmails(emailInput);
    } else if (e.key === "Backspace" && !emailInput && inviteEmails.length > 0) {
      setInviteEmails((prev) => prev.slice(0, -1));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (/[\s,;]/.test(text.trim())) {
      e.preventDefault();
      commitEmails(`${emailInput} ${text}`);
    }
  };

  const removeEmailChip = (email: string) => {
    setInviteEmails((prev) => prev.filter((e) => e !== email));
  };

  // Submit invitations
  const handleSendInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalEmails = mergeEmails(emailInput);
    if (!finalEmails || finalEmails.length === 0) {
      if (inviteEmails.length === 0) {
        setEmailError("Please enter at least one valid work email address.");
        return;
      }
    }
    const emailsToSend = finalEmails && finalEmails.length > 0 ? finalEmails : inviteEmails;
    setInviting(true);
    setEmailError("");

    const newLinks: Array<{ email: string; link: string }> = [];
    let successCount = 0;
    const failedEmails: string[] = [];

    for (const email of emailsToSend) {
      try {
        const res = await api.workspace.createInvite({
          email,
          systemRole: currentUser?.systemRole === "ADMIN" ? inviteSystemRole : "USER",
          professionalRole: inviteProfRole,
        });
        const createdInvite = (res as any)?.data || res;
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const fullLink = `${origin}/invite/${createdInvite.token}`;
        newLinks.push({ email, link: fullLink });
        successCount++;
      } catch (err: any) {
        failedEmails.push(email);
        console.error(`Failed to invite ${email}`, err);
      }
    }

    setInviting(false);
    if (successCount > 0) {
      showToast(
        successCount === 1
          ? `Created invitation for ${newLinks[0].email}`
          : `Created ${successCount} invitations successfully!`,
        "success"
      );
      setRecentInviteLinks((prev) => [...newLinks, ...prev]);
      setInviteEmails(failedEmails);
      setEmailInput("");
      await loadData();
    } else if (failedEmails.length > 0) {
      showToast("Failed to create invitations. User might already exist.", "error");
    }
  };

  // Cancel invitation state
  const [cancelConfirmInvite, setCancelConfirmInvite] = useState<any | null>(null);
  const [cancellingInvite, setCancellingInvite] = useState(false);

  // Cancel invitation
  const handleCancelInvite = (invite: any) => {
    setCancelConfirmInvite(invite);
  };

  const handleConfirmCancelInvite = async () => {
    if (!cancelConfirmInvite) return;
    setCancellingInvite(true);
    try {
      await api.workspace.cancelInvite(cancelConfirmInvite.id);
      showToast("Invitation cancelled successfully", "info");
      setCancelConfirmInvite(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to cancel invitation", "error");
    } finally {
      setCancellingInvite(false);
    }
  };

  const copyToClipboard = async (text: string, label = "Invite link") => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied ${label} to clipboard!`, "success");
    } catch {
      showToast("Failed to copy link", "error");
    }
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (selectedRoleFilter !== "ALL" && m.professionalRole !== selectedRoleFilter) {
        return false;
      }
      if (selectedAccessFilter !== "ALL" && m.systemRole !== selectedAccessFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (m.displayName || "").toLowerCase().includes(q);
        const matchesEmail = (m.email || "").toLowerCase().includes(q);
        if (!matchesName && !matchesEmail) return false;
      }
      return true;
    });
  }, [members, selectedRoleFilter, selectedAccessFilter, searchQuery]);

  // User avatar helper
  const getInitials = (name?: string, email?: string) => {
    const raw = (name || email || "User").trim();
    const parts = raw.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return raw.slice(0, 2).toUpperCase();
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
              <Link href="/dashboard" className="text-[#2563eb] hover:underline font-medium">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Team</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
              Team
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              You, people who share a project with you, and invitations you sent.
            </p>
          </div>
          <button type="button" aria-expanded={showInviteForm} aria-controls="team-invite-form"
            onClick={() => setShowInviteForm((open) => !open)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-codex-accent px-4 text-xs font-semibold text-white hover:bg-codex-hover transition-colors">
            <UserPlus className="h-4 w-4" /> Invite people
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Members", value: members.length, icon: Users, color: "text-blue-600 bg-blue-50" },
            { label: "Active", value: members.filter((member) => member.isActive).length, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
            { label: "Pending invites", value: pendingInvites.length, icon: Clock, color: "text-amber-600 bg-amber-50" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <span className={`hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stat.color}`}><stat.icon className="h-4 w-4" /></span>
              <div><p className="text-xs text-slate-500">{stat.label}</p><p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{loading ? "—" : stat.value}</p></div>
            </div>
          ))}
        </div>
        {/* Filter and Members Table */}
        <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
          {/* Header & Filter Toolbar */}
          <div className="p-5 border-b border-slate-200 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold font-serif text-slate-900">
                Members <span className="ml-1.5 rounded-md bg-slate-100 px-2 py-0.5 font-sans text-xs font-medium text-slate-600">{members.length}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Search by name or email, or filter by role and access.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
              {/* Role Filter */}
              <FilterDropdown
                label="Role"
                allLabel="All roles"
                value={selectedRoleFilter}
                onChange={setSelectedRoleFilter}
                options={FILTER_ROLE_OPTIONS}
              />

              {/* Access Filter */}
              <FilterDropdown
                label="Access"
                allLabel="All access"
                value={selectedAccessFilter}
                onChange={setSelectedAccessFilter}
                options={FILTER_ACCESS_OPTIONS}
              />

              {/* Search input */}
              <div className="relative w-full min-w-0 sm:w-56 sm:flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  aria-label="Search members"
                  placeholder="Filter members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
                />
                {searchQuery && (
                  <button
                    aria-label="Clear member search"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Members Table */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading workspace team members...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-16 p-8 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
                <Users className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">No members match your criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {members.length === 0
                  ? "No team members found in this workspace."
                  : "Try adjusting your role or access filters, or clear your search query."}
              </p>
              {(selectedRoleFilter !== "ALL" || selectedAccessFilter !== "ALL" || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedRoleFilter("ALL");
                    setSelectedAccessFilter("ALL");
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-2xs cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear filters</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3">Member</th>
                    <th className="px-4 py-3">Professional Role</th>
                    <th className="px-4 py-3">System Access</th>
                    <th className="px-4 py-3">Joined Date</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((member) => {
                    const isSelf = member.id === currentUser?.id;
                    const initials = getInitials(member.displayName, member.email);
                    const avatarBg = getMemberAvatarBg(member.professionalRole);
                    const profBadgeStyle = getProfRoleBadgeStyle(member.professionalRole);
                    const profRoleLabel = getProfRoleLabel(member.professionalRole);

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Member Name + Avatar */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full ${avatarBg} text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs`}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 truncate">
                                {member.displayName || "Workspace Member"}
                              </span>
                              {isSelf && (
                                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200/60">
                                  You
                                </span>
                              )}
                              </div>
                              <p className="mt-0.5 text-[11px] text-slate-500">{member.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Professional Role Badge */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${profBadgeStyle}`}
                          >
                            {profRoleLabel}
                          </span>
                        </td>

                        {/* System Access Badge */}
                        <td className="px-4 py-3.5">
                          {member.systemRole === "ADMIN" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                              <Shield className="w-3.5 h-3.5 text-slate-400" />
                              <span>Member</span>
                            </span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="px-4 py-3.5 text-slate-500 font-normal">
                          {member.createdAt
                            ? new Date(member.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "-"}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${member.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200/80" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${member.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                            <span>{member.isActive ? "Active" : "Inactive"}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!loading && <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Showing {filteredMembers.length} of {members.length} members</div>}
        </section>

        {/* Inline Invite Box */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className={`flex items-center justify-between gap-3 ${showInviteForm ? "border-b border-slate-100 pb-4" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2">
                  <span>Invite people</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create a link to share with a new colleague.
                </p>
              </div>
            </div>
            <button type="button" aria-expanded={showInviteForm} aria-controls="team-invite-form" aria-label={showInviteForm ? "Collapse invitations" : "Expand invitations"}
              onClick={() => setShowInviteForm((open) => !open)} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <ChevronDown className={`h-4 w-4 transition-transform ${showInviteForm ? "rotate-180" : ""}`} />
            </button>
          </div>

          <form id="team-invite-form" onSubmit={handleSendInvites} hidden={!showInviteForm} className="space-y-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-3">
              {/* Chip Input Container */}
              <div className="flex-1">
                <div className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50/90 px-3 py-1.5 transition-all focus-within:border-[#2563eb] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20">
                  {inviteEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-xs font-medium text-blue-800 animate-in fade-in zoom-in-95"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeEmailChip(email)}
                        className="text-blue-500 hover:text-blue-800 transition-colors cursor-pointer"
                        title={`Remove ${email}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    aria-label="Email addresses to invite"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onBlur={() => {
                      if (emailInput.trim()) commitEmails(emailInput);
                    }}
                    placeholder={
                      inviteEmails.length > 0
                        ? "Add another email..."
                        : "colleague@company.com (press Enter or comma)"
                    }
                    className="h-7 min-w-[200px] flex-1 bg-transparent px-1 text-xs text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
                <p className={`mt-1.5 text-[11px] ${emailError ? "text-rose-600 font-medium" : "text-slate-400"}`}>
                  {emailError ||
                    (inviteEmails.length > 0
                      ? `${inviteEmails.length} colleague${inviteEmails.length === 1 ? "" : "s"} ready to invite.`
                      : "Type email and press Enter, or paste comma-separated emails to invite multiple colleagues.")}
                </p>
              </div>

              {/* Role Selectors */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Professional Role */}
                <CustomDropdown
                  labelPrefix="Role"
                  value={inviteProfRole}
                  onChange={(val) => setInviteProfRole(val as any)}
                  options={INVITE_PROF_ROLE_OPTIONS}
                  menuWidth="min-w-[195px]"
                />

                {/* System Role */}
                <CustomDropdown
                  labelPrefix="Access"
                  value={currentUser?.systemRole === "ADMIN" ? inviteSystemRole : "USER"}
                  onChange={(val) => setInviteSystemRole(val as any)}
                  options={INVITE_SYSTEM_ROLE_OPTIONS.filter(
                    (option) => currentUser?.systemRole === "ADMIN" || option.value === "USER"
                  )}
                  menuWidth="min-w-[170px]"
                />

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={inviting}
                  className="h-11 px-5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4 stroke-[2.2]" />
                  <span>
                    {inviting
                      ? "Generating..."
                      : inviteEmails.length > 1
                      ? `Invite ${inviteEmails.length} Colleagues`
                      : "Send Invitation"}
                  </span>
                </button>
              </div>
            </div>

            {/* Recently generated invite links */}
            {recentInviteLinks.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Invitations generated successfully:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setRecentInviteLinks([])}
                    className="text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer"
                  >
                    Clear list
                  </button>
                </div>
                <div className="space-y-1.5">
                  {recentInviteLinks.map((item) => (
                    <div
                      key={item.email}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-white border border-slate-200/80 text-xs shadow-2xs"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900">{item.email}</span>
                        <span className="text-slate-400 block truncate text-[11px] font-mono mt-0.5">{item.link}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.link, `Invite link for ${item.email}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 font-medium text-xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </section>

        {/* Pending Invitations Table */}
        <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Pending Invitations ({pendingInvites.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Active invitation links awaiting account creation. Links expire automatically after 7 days.
              </p>
            </div>
          </div>

          {pendingInvites.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No pending invitations. Use the invite box above to invite new colleagues.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3">Invited Email</th>
                    <th className="px-4 py-3">Assigned Role</th>
                    <th className="px-4 py-3">Invited By</th>
                    <th className="px-4 py-3">Expires At</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingInvites.map((inv) => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "";
                    const fullLink = `${origin}/invite/${inv.token}`;
                    const profBadgeStyle = getProfRoleBadgeStyle(inv.professionalRole);
                    const profRoleLabel = getProfRoleLabel(inv.professionalRole);

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-900 font-mono">
                          {inv.email}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${profBadgeStyle}`}>
                              {profRoleLabel}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              {inv.systemRole === "ADMIN" ? "Admin" : "Member"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {inv.invitedBy?.displayName || "Admin"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-normal">
                          {new Date(inv.expiresAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(fullLink, `Invite link for ${inv.email}`)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Link</span>
                            </button>
                            <button
                              type="button"
                              disabled={busyId === inv.id}
                              onClick={() => handleCancelInvite(inv)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                              title="Cancel invitation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* CANCEL INVITATION CONFIRMATION MODAL */}
        <DeleteConfirmModal
          isOpen={!!cancelConfirmInvite}
          onClose={() => !cancellingInvite && setCancelConfirmInvite(null)}
          onConfirm={handleConfirmCancelInvite}
          title="Cancel invitation"
          itemName={cancelConfirmInvite?.email}
          itemType="invitation"
          warningText="This action cannot be undone. The invite link will become invalid immediately."
          confirmText="Cancel invitation"
          loading={cancellingInvite}
        />
      </div>
    </AppLayout>
  );
}
