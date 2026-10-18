"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import {
  UserPlus,
  Clock,
  Copy,
  Trash2,
  Search,
  CheckCircle2,
  X,
} from "lucide-react";

const INVITE_PROF_ROLE_OPTIONS = [
  { value: "DEVELOPER", label: "Developer" },
  { value: "PM", label: "Product Manager" },
  { value: "QA", label: "QA Engineer" },
  { value: "INFRASTRUCTURE", label: "DevOps / Infra" },
  { value: "DX", label: "UX / DX" },
  { value: "PRESENTATION", label: "Technical Writer" },
];

const FILTER_ROLE_OPTIONS = [
  { value: "DEVELOPER", label: "Developer" },
  { value: "PM", label: "Product Manager" },
  { value: "QA", label: "QA Engineer" },
  { value: "INFRASTRUCTURE", label: "DevOps / Infra" },
  { value: "DX", label: "UX / DX" },
  { value: "PRESENTATION", label: "Technical Writer" },
];

const FILTER_ACCESS_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "USER", label: "Member" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface WorkspaceMember {
  id: string;
  email: string;
  displayName: string;
  systemRole: "ADMIN" | "USER";
  professionalRole:
    "PM" | "DEVELOPER" | "QA" | "DX" | "INFRASTRUCTURE" | "PRESENTATION";
  isActive: boolean;
  createdAt: string;
}

interface WorkspaceInvite {
  id: string;
  email: string;
  systemRole: "ADMIN" | "USER";
  professionalRole:
    "PM" | "DEVELOPER" | "QA" | "DX" | "INFRASTRUCTURE" | "PRESENTATION";
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
      return "bg-blue-600";
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

export function TeamManagement({
  inSettings = false,
}: {
  inSettings?: boolean;
}) {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite input state
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [inviteSystemRole, setInviteSystemRole] = useState<"ADMIN" | "USER">(
    "USER",
  );
  const [inviteProfRole, setInviteProfRole] = useState<
    "PM" | "DEVELOPER" | "QA" | "DX" | "INFRASTRUCTURE" | "PRESENTATION"
  >("DEVELOPER");
  const [inviting, setInviting] = useState(false);
  const [recentInviteLinks, setRecentInviteLinks] = useState<
    Array<{ email: string; link: string }>
  >([]);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [selectedAccessFilter, setSelectedAccessFilter] =
    useState<string>("ALL");

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

  const pendingInvites = useMemo(
    () => invites.filter((inv) => inv.status === "PENDING"),
    [invites],
  );

  const mergeEmails = (raw: string): string[] | null => {
    const tokens = raw
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);
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
    } else if (
      e.key === "Backspace" &&
      !emailInput &&
      inviteEmails.length > 0
    ) {
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

  const handleSendInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalEmails = mergeEmails(emailInput);
    if (!finalEmails || finalEmails.length === 0) {
      if (inviteEmails.length === 0) {
        setEmailError("Please enter at least one valid work email address.");
        return;
      }
    }
    const emailsToSend =
      finalEmails && finalEmails.length > 0 ? finalEmails : inviteEmails;
    setInviting(true);
    setEmailError("");

    const newLinks: Array<{ email: string; link: string }> = [];
    let successCount = 0;
    const failedEmails: string[] = [];

    for (const email of emailsToSend) {
      try {
        const res = await api.workspace.createInvite({
          email,
          systemRole:
            currentUser?.systemRole === "ADMIN" ? inviteSystemRole : "USER",
          professionalRole: inviteProfRole,
        });
        const createdInvite = (res as any)?.data || res;
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
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
        "success",
      );
      setRecentInviteLinks((prev) => [...newLinks, ...prev]);
      setInviteEmails(failedEmails);
      setEmailInput("");
      await loadData();
    } else if (failedEmails.length > 0) {
      showToast(
        "Failed to create invitations. User might already exist.",
        "error",
      );
    }
  };

  // Cancel invitation state
  const [cancelConfirmInvite, setCancelConfirmInvite] = useState<any | null>(
    null,
  );
  const [cancellingInvite, setCancellingInvite] = useState(false);

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

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (
        selectedRoleFilter !== "ALL" &&
        m.professionalRole !== selectedRoleFilter
      ) {
        return false;
      }
      if (
        selectedAccessFilter !== "ALL" &&
        m.systemRole !== selectedAccessFilter
      ) {
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

  const getInitials = (name?: string, email?: string) => {
    const raw = (name || email || "User").trim();
    const parts = raw.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return raw.slice(0, 2).toUpperCase();
  };

  return (
    <div className="team-workspace space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {!inSettings && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--ws-muted)] mb-1">
              <Link href="/assistant" className="text-blue-400 hover:underline">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-[var(--ws-text)]">Team</span>
            </div>
          )}
          <h1 className="text-xl font-medium tracking-tight text-[var(--ws-text)]">
            {inSettings ? "Team & Members" : "Team"}
          </h1>
          <p className="text-xs text-[var(--ws-muted)] mt-1">
            You, people who share a project with you, and invitations you
            created.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowInviteForm((open) => !open)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-medium text-black hover:bg-slate-200 transition-colors shadow-sm self-start sm:self-auto"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Invite people</span>
        </button>
      </div>

      {/* Invite Form Drawer / Card */}
      {showInviteForm && (
        <form
          id="team-invite-form"
          onSubmit={handleSendInvites}
          className="rounded-2xl border border-[var(--ws-border)] bg-[var(--ws-surface)] p-5 sm:p-6 space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--ws-muted)]">
                Invite Teammates
              </h2>
              <p className="text-xs text-[var(--ws-muted)]">
                Enter email addresses and choose their initial professional and
                workspace access roles. Create invitation links to share with
                them.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInviteForm(false)}
              className="text-[var(--ws-muted)] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--ws-text)]">
              Email Addresses
            </label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] p-2 focus-within:border-white/30">
              {inviteEmails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-[var(--ws-text)]"
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => removeEmailChip(email)}
                    className="text-[var(--ws-muted)] hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={
                  inviteEmails.length === 0
                    ? "Type email and press Enter..."
                    : "Add more..."
                }
                className="flex-1 min-w-[160px] bg-transparent text-xs text-[var(--ws-text)] outline-none placeholder:text-[var(--ws-muted)]"
              />
            </div>
            {emailError && (
              <p className="text-[11px] text-rose-400">{emailError}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--ws-text)]">
                Professional Discipline
              </label>
              <select
                value={inviteProfRole}
                onChange={(e) => setInviteProfRole(e.target.value as any)}
                className="w-full rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3 py-2 text-xs text-[var(--ws-text)] outline-none focus:border-white/30"
              >
                {INVITE_PROF_ROLE_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="bg-[var(--ws-surface)] text-[var(--ws-text)]"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--ws-text)]">
                System Access
              </label>
              <select
                value={inviteSystemRole}
                onChange={(e) => setInviteSystemRole(e.target.value as any)}
                className="w-full rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3 py-2 text-xs text-[var(--ws-text)] outline-none focus:border-white/30"
              >
                <option
                  value="USER"
                  className="bg-[var(--ws-surface)] text-[var(--ws-text)]"
                >
                  Member (Standard Workspace Access)
                </option>
                {currentUser?.systemRole === "ADMIN" && (
                  <option
                    value="ADMIN"
                    className="bg-[var(--ws-surface)] text-[var(--ws-text)]"
                  >
                    Admin (Full System Privileges)
                  </option>
                )}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowInviteForm(false)}
              className="rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3.5 py-1.5 text-xs text-[var(--ws-muted)] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                inviting || (!emailInput.trim() && inviteEmails.length === 0)
              }
              className="rounded-xl bg-white px-4 py-1.5 text-xs font-medium text-black hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {inviting ? "Creating..." : "Create invitation links"}
            </button>
          </div>
        </form>
      )}

      {/* Recent Invite Links Box */}
      {recentInviteLinks.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <h2 className="text-xs font-semibold">
              Invite Links Ready to Share
            </h2>
          </div>
          <div className="space-y-2">
            {recentInviteLinks.map((item) => (
              <div
                key={item.email}
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-[var(--ws-bg)] p-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--ws-text)] truncate">
                    {item.email}
                  </p>
                  <p className="text-[10px] font-mono text-[var(--ws-muted)] truncate">
                    {item.link}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(item.link)}
                  className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-medium text-black hover:bg-emerald-400"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members Directory Card */}
      <section className="rounded-2xl border border-[var(--ws-border)] bg-[var(--ws-surface)] overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[var(--ws-border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-[var(--ws-text)]">
                Members
              </h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-[var(--ws-muted)]">
                {members.length}
              </span>
            </div>
            <p className="text-xs text-[var(--ws-muted)] mt-0.5">
              Search by name or email, or filter by role and access.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter */}
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3 py-1.5 text-xs text-[var(--ws-text)] outline-none focus:border-white/30"
            >
              <option value="ALL">Role: All</option>
              {FILTER_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Role: {opt.label}
                </option>
              ))}
            </select>

            {/* Access Filter */}
            <select
              value={selectedAccessFilter}
              onChange={(e) => setSelectedAccessFilter(e.target.value)}
              className="rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3 py-1.5 text-xs text-[var(--ws-text)] outline-none focus:border-white/30"
            >
              <option value="ALL">Access: All</option>
              {FILTER_ACCESS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Access: {opt.label}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative min-w-[180px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ws-muted)]" />
              <input
                type="text"
                placeholder="Filter members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] py-1.5 pl-8 pr-7 text-xs text-[var(--ws-text)] outline-none placeholder:text-[var(--ws-muted)] focus:border-white/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ws-muted)] hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Members Table */}
        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--ws-muted)]">
            Loading team directory...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs text-[var(--ws-muted)]">
              No members match the selected filters.
            </p>
            {(selectedRoleFilter !== "ALL" ||
              selectedAccessFilter !== "ALL" ||
              searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedRoleFilter("ALL");
                  setSelectedAccessFilter("ALL");
                  setSearchQuery("");
                }}
                className="rounded-lg border border-[var(--ws-border)] bg-[var(--ws-bg)] px-2.5 py-1 text-xs text-[var(--ws-text)] hover:bg-[var(--ws-hover)]"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="border-b border-[var(--ws-border)] bg-[var(--ws-bg)]/40 text-[10px] font-semibold uppercase tracking-wider text-[var(--ws-muted)]">
                <tr>
                  <th className="px-5 py-3">Member</th>
                  <th className="px-4 py-3">Professional Role</th>
                  <th className="px-4 py-3">System Access</th>
                  <th className="px-4 py-3">Joined Date</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ws-border)]">
                {filteredMembers.map((member) => {
                  const isCurrent = currentUser?.id === member.id;
                  const initials = getInitials(
                    member.displayName,
                    member.email,
                  );
                  const avatarBg = getMemberAvatarBg(member.professionalRole);

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-[var(--ws-hover)]/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${avatarBg} text-xs font-semibold text-white shadow-xs`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-[var(--ws-text)]">
                                {member.displayName || "Workspace Member"}
                              </span>
                              {isCurrent && (
                                <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-medium text-white">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--ws-muted)]">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-[var(--ws-text)]">
                          {getProfRoleLabel(member.professionalRole)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono ${
                            member.systemRole === "ADMIN"
                              ? "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                              : "border border-slate-500/30 bg-slate-500/10 text-slate-300"
                          }`}
                        >
                          {member.systemRole === "ADMIN" ? "Admin" : "Member"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-[11px] text-[var(--ws-muted)]">
                        {new Date(member.createdAt).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
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
      </section>

      {/* Pending Invitations Section */}
      <section className="rounded-2xl border border-[var(--ws-border)] bg-[var(--ws-surface)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="font-semibold text-xs uppercase tracking-wider text-[var(--ws-muted)] flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>Pending Invitations ({pendingInvites.length})</span>
            </h2>
            <p className="text-[11px] text-[var(--ws-muted)]">
              Active invitation links awaiting account creation. Links expire
              automatically after 7 days.
            </p>
          </div>
        </div>

        {pendingInvites.length === 0 ? (
          <p className="text-xs text-[var(--ws-muted)] py-2">
            No pending invitations at this time.
          </p>
        ) : (
          <div className="divide-y divide-[var(--ws-border)] rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)]">
            {pendingInvites.map((inv) => {
              const origin =
                typeof window !== "undefined" ? window.location.origin : "";
              const fullUrl = `${origin}/invite/${inv.token}`;
              return (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-[var(--ws-text)]">
                        {inv.email}
                      </span>
                      <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9px] text-[var(--ws-muted)] font-mono">
                        {inv.professionalRole}
                      </span>
                      <span className="rounded bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[9px] text-blue-400 font-mono">
                        {inv.systemRole}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--ws-muted)]">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(fullUrl)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--ws-border)] bg-[var(--ws-surface)] px-2.5 py-1 text-xs text-[var(--ws-text)] hover:bg-[var(--ws-hover)]"
                      title="Copy invitation link"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy Link</span>
                    </button>
                    {currentUser?.systemRole === "ADMIN" && (
                      <button
                        type="button"
                        onClick={() => setCancelConfirmInvite(inv)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ws-muted)] hover:bg-rose-500/10 hover:text-rose-400"
                        title="Cancel invite"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Cancel Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(cancelConfirmInvite)}
        title="Cancel Workspace Invitation"
        itemName={cancelConfirmInvite?.email}
        itemType="invitation"
        warningText="The invitation link will immediately become invalid."
        confirmText={cancellingInvite ? "Cancelling..." : "Cancel Invitation"}
        loading={cancellingInvite}
        onConfirm={handleConfirmCancelInvite}
        onClose={() => setCancelConfirmInvite(null)}
      />
    </div>
  );
}
