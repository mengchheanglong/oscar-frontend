"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  useWorkspaceTheme,
  type WorkspaceTheme,
} from "@/context/workspace-theme";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api";
import {
  User,
  Palette,
  FolderKanban,
  Layers,
  KeyRound,
  Database,
  Shield,
  X,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Trash2,
  Plus,
  ExternalLink,
  LogOut,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  GitBranch,
  Cpu,
  Boxes,
  Eye,
  EyeOff,
} from "lucide-react";
import { IntegrationsConsole } from "@/components/integrations/integrations-console";
import { TeamManagement } from "@/components/team/team-management";

type SettingsTab =
  | "account"
  | "appearance"
  | "projects"
  | "team"
  | "integrations"
  | "api-keys"
  | "data"
  | "admin";

const PROFESSIONAL_ROLES = [
  {
    value: "DEVELOPER",
    label: "Developer",
    desc: "Software engineering, code reviews, and implementation",
  },
  {
    value: "PM",
    label: "Product Manager",
    desc: "Specifications, roadmap, acceptance criteria, and user stories",
  },
  {
    value: "QA",
    label: "QA Engineer",
    desc: "Test planning, test cases, automated validation, and regressions",
  },
  {
    value: "INFRASTRUCTURE",
    label: "DevOps / Infra",
    desc: "Docker, CI/CD pipelines, database, and deployments",
  },
  {
    value: "DX",
    label: "UX / DX",
    desc: "Design systems, interfaces, user journeys, and usability",
  },
  {
    value: "PRESENTATION",
    label: "Technical Writer",
    desc: "Documentation, RFCs, architecture summaries, and guides",
  },
];

export default function SettingsWorkspace({
  initialTab = "account",
}: {
  initialTab?: SettingsTab;
}) {
  const router = useRouter();
  const {
    user,
    currentProject,
    projects,
    setCurrentProject,
    updateUser,
    logout,
  } = useAuth();
  const { theme, setTheme } = useWorkspaceTheme();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Profile Edit State
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [professionalRole, setProfessionalRole] = useState(
    user?.professionalRole || "DEVELOPER",
  );
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // API Keys State
  const [apiKeys, setApiKeys] = useState<
    Array<{
      id: string;
      name: string;
      keyPrefix: string;
      lastUsedAt: string | null;
      expiresAt: string | null;
      createdAt: string;
    }>
  >([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpires, setNewKeyExpires] = useState<number>(30);
  const [createdRawToken, setCreatedRawToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);

  // Sync user state when loaded
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.fullName || "");
      if (user.professionalRole) {
        setProfessionalRole(user.professionalRole);
      }
    }
  }, [user]);

  // Load API Keys when on api-keys tab
  const fetchApiKeys = useCallback(async () => {
    setLoadingKeys(true);
    try {
      const keys = await api.auth.listApiKeys();
      setApiKeys(Array.isArray(keys) ? keys : []);
    } catch {
      // ignore
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "api-keys") {
      void fetchApiKeys();
    }
  }, [activeTab, fetchApiKeys]);

  // Close Settings handler
  const handleClose = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/assistant");
    }
  }, [router]);

  // Handle ESC key to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast("Display name cannot be empty", "error");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.auth.updateProfile({
        displayName: displayName.trim(),
        professionalRole,
      });
      updateUser({
        displayName: res.displayName || displayName.trim(),
        professionalRole: res.professionalRole || professionalRole,
      });
      showToast("Profile updated successfully", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to update profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // Password Save
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast("Please enter your current password", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("New password must be at least 8 characters", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }
    setSavingPassword(true);
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      showToast("Password changed successfully", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showToast(err?.message || "Failed to change password", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  // Create API Key
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      showToast("Please specify a name for this API key", "error");
      return;
    }
    setCreatingKey(true);
    try {
      const res = await api.auth.createApiKey({
        name: newKeyName.trim(),
        expiresInDays: newKeyExpires,
      });
      if (res.rawToken) {
        setCreatedRawToken(res.rawToken);
      }
      setNewKeyName("");
      showToast("API key generated successfully", "success");
      void fetchApiKeys();
    } catch (err: any) {
      showToast(err?.message || "Failed to create API key", "error");
    } finally {
      setCreatingKey(false);
    }
  };

  // Revoke API Key
  const handleRevokeApiKey = async (id: string) => {
    try {
      await api.auth.revokeApiKey(id);
      showToast("API key revoked", "info");
      void fetchApiKeys();
    } catch (err: any) {
      showToast(err?.message || "Failed to revoke API key", "error");
    }
  };

  // Copy API Token to clipboard
  const handleCopyToken = () => {
    if (!createdRawToken) return;
    navigator.clipboard.writeText(createdRawToken);
    setCopiedToken(true);
    showToast("Token copied to clipboard", "success");
    setTimeout(() => setCopiedToken(false), 3000);
  };

  const userInitials = (displayName || user?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="settings-workspace min-h-screen w-full bg-[var(--ws-bg)] text-[var(--ws-text)] flex flex-col selection:bg-white/20 selection:text-white">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-[var(--ws-border)] bg-[var(--ws-bg)]/90 px-4 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Back to assistant"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ws-muted)] hover:bg-[var(--ws-hover)] hover:text-white transition-colors"
            title="Back to Assistant"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-[var(--ws-text)]">
              Settings
            </span>
            <span className="text-xs text-[var(--ws-muted)]">
              {currentProject ? `• ${currentProject.name}` : ""}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close settings"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--ws-muted)] hover:bg-[var(--ws-hover)] hover:text-white transition-colors"
          title="Close (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <label className="settings-mobile-section">
        Section
        <select
          aria-label="Settings section"
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value as SettingsTab)}
        >
          {[
            ["account", "Account"],
            ["appearance", "Appearance"],
            ["projects", "Projects"],
            ["team", "Team & Members"],
            ["integrations", "Integrations"],
            ["api-keys", "API Keys & MCP"],
            ["data", "Data Controls"],
            ...(user?.systemRole === "ADMIN"
              ? [["admin", "Workspace Admin"]]
              : []),
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {/* Main Two-Column Full Page Layout */}
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Left Settings Navigation Rail */}
        <aside className="w-full shrink-0 border-b border-[var(--ws-border)] p-4 sm:p-6 md:w-64 md:border-b-0 md:border-r md:min-h-[calc(100vh-3.5rem)]">
          <nav className="space-y-6" aria-label="Settings categories">
            {/* General Section */}
            <div>
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--ws-muted)]">
                General
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("account")}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === "account"
                      ? "bg-[var(--ws-hover)] text-white shadow-sm"
                      : "text-[var(--ws-muted)] hover:bg-[var(--ws-hover)] hover:text-[var(--ws-text)]"
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("appearance")}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === "appearance"
                      ? "bg-[var(--ws-hover)] text-white shadow-sm"
                      : "text-[var(--ws-muted)] hover:bg-[var(--ws-hover)] hover:text-[var(--ws-text)]"
                  }`}
                >
                  <Palette className="h-4 w-4" />
                  <span>Appearance</span>
                </button>
              </div>
            </div>

            {/* Workspace Section */}
            <div>
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--ws-muted)]">
                Workspace
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("projects")}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === "projects"
                      ? "bg-[var(--ws-hover)] text-white shadow-sm"
                      : "text-[var(--ws-muted)] hover:bg-[var(--ws-hover)] hover:text-[var(--ws-text)]"
                  }`}
                >
                  <FolderKanban className="h-4 w-4" />
                  <span>Projects</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("team")}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === "team"
                      ? "bg-[var(--ws-hover)] text-white shadow-sm"
                      : "text-[var(--ws-muted)] hover:bg-[var(--ws-hover)] hover:text-[var(--ws-text)]"
                  }`}
                >
                  <Boxes className="h-4 w-4" />
                  <span>Team & Members</span>
                </button>
              </div>
            </div>

            {/* Tools & Integrations */}
            <div>
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--ws-muted)]">
                Tools & Integrations
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("integrations")}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === "integrations"
                      ? "bg-[var(--ws-hover)] text-white shadow-sm"
                      : "text-[var(--ws-muted)] hover:bg-[var(--ws-hover)] hover:text-[var(--ws-text)]"
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  <span>Integrations</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("api-keys")}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === "api-keys"
                      ? "bg-[var(--ws-hover)] text-white shadow-sm"
                      : "text-[var(--ws-muted)] hover:bg-[var(--ws-hover)] hover:text-[var(--ws-text)]"
                  }`}
                >
                  <KeyRound className="h-4 w-4" />
                  <span>API Keys & MCP</span>
                </button>
              </div>
            </div>

            {/* Data & AI Controls */}
            <div>
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--ws-muted)]">
                Data & AI
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("data")}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === "data"
                      ? "bg-[var(--ws-hover)] text-white shadow-sm"
                      : "text-[var(--ws-muted)] hover:bg-[var(--ws-hover)] hover:text-[var(--ws-text)]"
                  }`}
                >
                  <Database className="h-4 w-4" />
                  <span>Data Controls</span>
                </button>
              </div>
            </div>

            {/* Administration (if Admin) */}
            {user?.systemRole === "ADMIN" && (
              <div>
                <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--ws-muted)]">
                  Administration
                </p>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("admin")}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                      activeTab === "admin"
                        ? "bg-[var(--ws-hover)] text-white shadow-sm"
                        : "text-[var(--ws-muted)] hover:bg-[var(--ws-hover)] hover:text-[var(--ws-text)]"
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    <span>Workspace Admin</span>
                  </button>
                </div>
              </div>
            )}
          </nav>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 md:px-12 md:py-10">
          <div className="mx-auto max-w-3xl space-y-8">
            {/* ========================================================= */}
            {/* TAB: ACCOUNT                                              */}
            {/* ========================================================= */}
            {activeTab === "account" && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-xl font-medium tracking-tight text-[var(--ws-text)]">
                    Account
                  </h1>
                  <p className="text-xs text-[var(--ws-muted)] mt-1">
                    Manage your personal credentials, workspace identity, and
                    security.
                  </p>
                </div>

                {/* Identity Header Card */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[var(--ws-border)] bg-[var(--ws-surface)] p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-base font-semibold text-white">
                      {userInitials}
                    </div>
                    <div>
                      <h2 className="font-medium text-sm text-[var(--ws-text)]">
                        {displayName || "Workspace Member"}
                      </h2>
                      <p className="text-xs text-[var(--ws-muted)]">
                        {user?.email}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-mono text-blue-400">
                          {user?.systemRole || "MEMBER"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] text-[var(--ws-muted)]">
                          {user?.professionalRole || "DEVELOPER"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>

                {/* Edit Profile Form */}
                <form
                  onSubmit={handleSaveProfile}
                  className="rounded-2xl border border-[var(--ws-border)] bg-[var(--ws-surface)] p-6 space-y-5"
                >
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ws-muted)]">
                    Profile Details
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--ws-text)]">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      placeholder="Your name"
                      className="w-full rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3.5 py-2 text-xs text-[var(--ws-text)] outline-none focus:border-white/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--ws-text)]">
                      Professional Role
                    </label>
                    <select
                      value={professionalRole}
                      onChange={(e) => setProfessionalRole(e.target.value)}
                      className="w-full rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3.5 py-2 text-xs text-[var(--ws-text)] outline-none focus:border-white/30"
                    >
                      {PROFESSIONAL_ROLES.map((role) => (
                        <option
                          key={role.value}
                          value={role.value}
                          className="bg-[var(--ws-surface)] text-[var(--ws-text)]"
                        >
                          {role.label} — {role.desc}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[var(--ws-muted)]">
                      Informs AI Copilot to tune suggestions and reviews
                      according to your discipline.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="rounded-xl bg-white px-4 py-2 text-xs font-medium text-black hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      {savingProfile ? "Saving..." : "Save Profile"}
                    </button>
                  </div>
                </form>

                {/* Change Password Form */}
                <form
                  onSubmit={handleSavePassword}
                  className="rounded-2xl border border-[var(--ws-border)] bg-[var(--ws-surface)] p-6 space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ws-muted)]">
                      Security & Password
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-xs text-[var(--ws-muted)] hover:text-white flex items-center gap-1"
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      <span>{showPassword ? "Hide" : "Show"}</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--ws-text)]">
                        Current Password
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3.5 py-2 text-xs text-[var(--ws-text)] outline-none focus:border-white/30"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--ws-text)]">
                          New Password
                        </label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3.5 py-2 text-xs text-[var(--ws-text)] outline-none focus:border-white/30"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--ws-text)]">
                          Confirm New Password
                        </label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat new password"
                          className="w-full rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3.5 py-2 text-xs text-[var(--ws-text)] outline-none focus:border-white/30"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={
                        savingPassword || !currentPassword || !newPassword
                      }
                      className="rounded-xl border border-[var(--ws-border)] bg-[var(--ws-hover)] px-4 py-2 text-xs font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {savingPassword ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: APPEARANCE                                           */}
            {/* ========================================================= */}
            {activeTab === "appearance" && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-xl font-medium tracking-tight text-[var(--ws-text)]">
                    Appearance
                  </h1>
                  <p className="text-xs text-[var(--ws-muted)] mt-1">
                    Customize your workspace interface theme and visual tones.
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--ws-border)] bg-[var(--ws-surface)] p-6 space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ws-muted)] mb-1">
                      Interface Theme
                    </h3>
                    <p className="text-xs text-[var(--ws-muted)]">
                      Dark mode uses Grok-inspired obsidian canvas tones (
                      <code className="font-mono text-xs">#131211</code>).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {/* Dark Option */}
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={`relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                        theme === "dark"
                          ? "border-white bg-[#131211] shadow-lg ring-1 ring-white/20"
                          : "border-[var(--ws-border)] bg-[#131211]/60 hover:border-white/30"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-white">
                          Dark
                        </span>
                        {theme === "dark" && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-black">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="h-12 w-full rounded-lg bg-[#1c1b18] border border-white/10 p-2 flex flex-col gap-1.5">
                        <div className="h-2 w-12 rounded bg-white/20" />
                        <div className="h-1.5 w-20 rounded bg-white/10" />
                      </div>
                      <p className="mt-3 text-[11px] text-zinc-400">
                        Default obsidian theme
                      </p>
                    </button>

                    {/* Light Option */}
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={`relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                        theme === "light"
                          ? "border-white bg-slate-100 text-slate-900 shadow-lg ring-1 ring-white/20"
                          : "border-[var(--ws-border)] bg-slate-100/10 hover:border-white/30"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-[var(--ws-text)]">
                          Light
                        </span>
                        {theme === "light" && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-black">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="h-12 w-full rounded-lg bg-slate-200 border border-slate-300 p-2 flex flex-col gap-1.5">
                        <div className="h-2 w-12 rounded bg-slate-400" />
                        <div className="h-1.5 w-20 rounded bg-slate-300" />
                      </div>
                      <p className="mt-3 text-[11px] text-[var(--ws-muted)]">
                        High-contrast daylight mode
                      </p>
                    </button>

                    {/* System Option */}
                    <button
                      type="button"
                      onClick={() => setTheme("system")}
                      className={`relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                        theme === "system"
                          ? "border-white bg-[var(--ws-hover)] shadow-lg ring-1 ring-white/20"
                          : "border-[var(--ws-border)] bg-[var(--ws-bg)] hover:border-white/30"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-[var(--ws-text)]">
                          System
                        </span>
                        {theme === "system" && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-black">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="h-12 w-full rounded-lg bg-gradient-to-r from-[#1c1b18] to-slate-200 border border-white/10 p-2 flex flex-col gap-1.5" />
                      <p className="mt-3 text-[11px] text-[var(--ws-muted)]">
                        Matches your device settings
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: PROJECTS & WORKSPACE                                 */}
            {/* ========================================================= */}
            {activeTab === "projects" && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-medium tracking-tight text-[var(--ws-text)]">
                      Projects & Workspaces
                    </h1>
                    <p className="text-xs text-[var(--ws-muted)] mt-1">
                      Manage project memberships, active workspace context, and
                      scopes.
                    </p>
                  </div>
                  <Link
                    href="/projects"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-medium text-black hover:bg-slate-200 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Project</span>
                  </Link>
                </div>

                {/* Active Project Highlight */}
                {currentProject && (
                  <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-blue-500/20 px-2 py-0.5 font-mono text-[11px] text-blue-400">
                          [{currentProject.key}]
                        </span>
                        <h2 className="text-sm font-semibold text-[var(--ws-text)]">
                          {currentProject.name}
                        </h2>
                      </div>
                      <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] text-blue-400 font-medium">
                        Active Workspace
                      </span>
                    </div>

                    <p className="text-xs text-[var(--ws-muted)] leading-relaxed">
                      {currentProject.description ||
                        "No project description provided."}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                      <Link
                        href={`/projects/${currentProject.id}`}
                        className="rounded-lg border border-[var(--ws-border)] bg-[var(--ws-surface)] px-3 py-1.5 text-xs text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors"
                      >
                        Overview
                      </Link>
                      <Link
                        href="/requirements"
                        className="rounded-lg border border-[var(--ws-border)] bg-[var(--ws-surface)] px-3 py-1.5 text-xs text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors"
                      >
                        Requirements
                      </Link>
                      <Link
                        href="/tasks"
                        className="rounded-lg border border-[var(--ws-border)] bg-[var(--ws-surface)] px-3 py-1.5 text-xs text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors"
                      >
                        Tasks
                      </Link>
                      <Link
                        href="/decisions"
                        className="rounded-lg border border-[var(--ws-border)] bg-[var(--ws-surface)] px-3 py-1.5 text-xs text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors"
                      >
                        Decisions
                      </Link>
                      <Link
                        href="/documents"
                        className="rounded-lg border border-[var(--ws-border)] bg-[var(--ws-surface)] px-3 py-1.5 text-xs text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors"
                      >
                        Documents
                      </Link>
                      <button
                        type="button"
                        onClick={() => setActiveTab("team")}
                        className="rounded-lg border border-[var(--ws-border)] bg-[var(--ws-surface)] px-3 py-1.5 text-xs text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors"
                      >
                        Team
                      </button>
                    </div>
                  </div>
                )}

                {/* All Authorized Projects List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ws-muted)] px-1">
                    Authorized Projects ({projects.length})
                  </h3>

                  <div className="divide-y divide-[var(--ws-border)] rounded-2xl border border-[var(--ws-border)] bg-[var(--ws-surface)]">
                    {projects.map((proj) => {
                      const isSelected = currentProject?.id === proj.id;
                      return (
                        <div
                          key={proj.id}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-blue-400">
                                [{proj.key}]
                              </span>
                              <span className="font-medium text-xs text-[var(--ws-text)]">
                                {proj.name}
                              </span>
                              {isSelected && (
                                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/20">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--ws-muted)] line-clamp-1">
                              {proj.description || "Active project workspace"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {!isSelected ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentProject(proj);
                                  showToast(
                                    `Switched workspace to [${proj.key}] ${proj.name}`,
                                    "info",
                                  );
                                }}
                                className="rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3 py-1.5 text-xs font-medium text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors"
                              >
                                Switch
                              </button>
                            ) : null}
                            <Link
                              href={`/projects/${proj.id}`}
                              className="rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3 py-1.5 text-xs text-[var(--ws-muted)] hover:text-white transition-colors"
                            >
                              Manage
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: TEAM & COLLABORATORS                                 */}
            {/* ========================================================= */}
            {activeTab === "team" && <TeamManagement inSettings={true} />}

            {/* ========================================================= */}
            {/* TAB: INTEGRATIONS                                         */}
            {/* ========================================================= */}
            {activeTab === "integrations" && <IntegrationsConsole />}

            {/* ========================================================= */}
            {/* TAB: API KEYS & MCP                                       */}
            {/* ========================================================= */}
            {activeTab === "api-keys" && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-xl font-medium tracking-tight text-[var(--ws-text)]">
                    API Keys & MCP Access
                  </h1>
                  <p className="text-xs text-[var(--ws-muted)] mt-1">
                    Personal access tokens for external MCP clients, CLI
                    scripts, and developer agents.
                  </p>
                </div>

                {/* Show newly created token banner */}
                {createdRawToken && (
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-semibold text-xs">
                        New API Key Generated — Copy it now
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--ws-muted)]">
                      This token is only shown once. Store it securely in your
                      external client configuration.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={createdRawToken}
                        className="flex-1 rounded-xl border border-emerald-500/30 bg-[var(--ws-bg)] px-3 py-2 font-mono text-xs text-white selection:bg-emerald-500/30"
                      />
                      <button
                        type="button"
                        onClick={handleCopyToken}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-medium text-black hover:bg-emerald-400 transition-colors"
                      >
                        {copiedToken ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span>{copiedToken ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Create New Key Form */}
                <form
                  onSubmit={handleCreateApiKey}
                  className="rounded-2xl border border-[var(--ws-border)] bg-[var(--ws-surface)] p-6 space-y-4"
                >
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ws-muted)]">
                    Generate New Key
                  </h3>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-medium text-[var(--ws-text)]">
                        Token Name
                      </label>
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g. Claude Code MCP, Local Antigravity CLI"
                        required
                        className="w-full rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3.5 py-2 text-xs text-[var(--ws-text)] outline-none focus:border-white/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--ws-text)]">
                        Expiration
                      </label>
                      <select
                        value={newKeyExpires}
                        onChange={(e) =>
                          setNewKeyExpires(Number(e.target.value))
                        }
                        className="w-full rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3.5 py-2 text-xs text-[var(--ws-text)] outline-none focus:border-white/30"
                      >
                        <option value={30}>30 Days</option>
                        <option value={90}>90 Days</option>
                        <option value={365}>1 Year</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={creatingKey || !newKeyName.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-medium text-black hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>
                        {creatingKey ? "Generating..." : "Generate Token"}
                      </span>
                    </button>
                  </div>
                </form>

                {/* Existing Keys Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ws-muted)]">
                      Active API Keys ({apiKeys.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => void fetchApiKeys()}
                      disabled={loadingKeys}
                      className="text-xs text-[var(--ws-muted)] hover:text-white flex items-center gap-1"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${loadingKeys ? "animate-spin" : ""}`}
                      />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <div className="divide-y divide-[var(--ws-border)] rounded-2xl border border-[var(--ws-border)] bg-[var(--ws-surface)]">
                    {apiKeys.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[var(--ws-muted)]">
                        No active API keys found. Generate one above to connect
                        external tools.
                      </div>
                    ) : (
                      apiKeys.map((key) => (
                        <div
                          key={key.id}
                          className="flex items-center justify-between p-4"
                        >
                          <div className="space-y-0.5">
                            <p className="font-medium text-xs text-[var(--ws-text)]">
                              {key.name}
                            </p>
                            <div className="flex items-center gap-3 text-[11px] text-[var(--ws-muted)]">
                              <span className="font-mono text-blue-400">
                                {key.keyPrefix}••••••••
                              </span>
                              <span>•</span>
                              <span>
                                Created{" "}
                                {new Date(key.createdAt).toLocaleDateString()}
                              </span>
                              {key.expiresAt && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Expires{" "}
                                    {new Date(
                                      key.expiresAt,
                                    ).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleRevokeApiKey(key.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ws-muted)] hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                            title="Revoke Key"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: DATA CONTROLS                                        */}
            {/* ========================================================= */}
            {activeTab === "data" && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-xl font-medium tracking-tight text-[var(--ws-text)]">
                    Data Controls & AI Isolation
                  </h1>
                  <p className="text-xs text-[var(--ws-muted)] mt-1">
                    Manage tenant data isolation, Copilot context memory, and
                    model privacy.
                  </p>
                </div>

                <div className="divide-y divide-[var(--ws-border)] rounded-2xl border border-[var(--ws-border)] bg-[var(--ws-surface)]">
                  {/* Scope Isolation */}
                  <div className="p-6 space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-400" />
                      <h3 className="font-medium text-xs text-[var(--ws-text)]">
                        Project Scope Isolation
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--ws-muted)] leading-relaxed">
                      All workspace queries, document vectors, task items, and
                      meetings are strictly isolated by your active project ID.
                      Cross-project data leaks are blocked at the database query
                      level.
                    </p>
                  </div>

                  {/* DeepSeek V4 Pro Engine */}
                  <div className="p-6 space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-400" />
                      <h3 className="font-medium text-xs text-[var(--ws-text)]">
                        DeepSeek V4 Pro Model Policy
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--ws-muted)] leading-relaxed">
                      AI generation uses the committed DeepSeek V4 Pro model
                      adapter. Workspace content is transmitted securely and is
                      never retained for unauthorized public training.
                    </p>
                  </div>

                  {/* Private Copilot Memories */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-purple-400" />
                      <h3 className="font-medium text-xs text-[var(--ws-text)]">
                        Copilot Private Memory
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--ws-muted)] leading-relaxed">
                      AI Copilot retains lightweight personal interaction
                      memories (e.g. style preferences, preferred review
                      workflows). Memories are isolated per user and do not
                      grant project permissions or authoritative evidence
                      status.
                    </p>
                    <div className="pt-1">
                      <Link
                        href="/assistant"
                        className="inline-flex items-center gap-1 rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3 py-1.5 text-xs text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors"
                      >
                        <span>Open Assistant</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Conversation Reset */}
                  <div className="p-6 space-y-3">
                    <h3 className="font-medium text-xs text-[var(--ws-text)]">
                      Reset Active Conversation
                    </h3>
                    <p className="text-xs text-[var(--ws-muted)] leading-relaxed">
                      Clear the current multi-turn session cache in this
                      browser. Indexed workspace project data remains completely
                      unaffected.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          localStorage.removeItem(
                            "aiw_current_conversation_id",
                          );
                        }
                        showToast("Session context reset", "info");
                        router.push("/assistant");
                      }}
                      className="rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3.5 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors"
                    >
                      Clear Browser Chat Session
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: WORKSPACE ADMIN (if ADMIN)                           */}
            {/* ========================================================= */}
            {activeTab === "admin" && user?.systemRole === "ADMIN" && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-xl font-medium tracking-tight text-[var(--ws-text)]">
                    Workspace Administration
                  </h1>
                  <p className="text-xs text-[var(--ws-muted)] mt-1">
                    System administrator controls, user directory, and workspace
                    invites.
                  </p>
                </div>

                <div className="divide-y divide-[var(--ws-border)] rounded-2xl border border-[var(--ws-border)] bg-[var(--ws-surface)]">
                  {/* User Directory */}
                  <div className="p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-medium text-xs text-[var(--ws-text)]">
                        Team & User Directory
                      </h3>
                      <p className="text-xs text-[var(--ws-muted)] mt-0.5">
                        View registered workspace members, assign professional
                        roles, and monitor active logins.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("team")}
                      className="rounded-xl bg-white px-3.5 py-2 text-xs font-medium text-black hover:bg-slate-200 transition-colors shrink-0 text-center"
                    >
                      Manage Team
                    </button>
                  </div>

                  {/* Invites */}
                  <div className="p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-medium text-xs text-[var(--ws-text)]">
                        Workspace Invitations
                      </h3>
                      <p className="text-xs text-[var(--ws-muted)] mt-0.5">
                        Issue invite tokens for new engineers, PMs, and QA
                        specialists with predefined roles.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("team")}
                      className="rounded-xl border border-[var(--ws-border)] bg-[var(--ws-bg)] px-3.5 py-2 text-xs font-medium text-[var(--ws-text)] hover:bg-[var(--ws-hover)] transition-colors shrink-0 text-center"
                    >
                      Invite Teammates
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
