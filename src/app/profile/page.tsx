"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { CustomDropdown, type CustomDropdownOption } from "@/components/ui/custom-dropdown";
import {
  User,
  Folder,
  LogOut,
  Eye,
  EyeOff,
  RefreshCw,
  Check,
  Shield,
  ShieldCheck,
  KeyRound,
  ArrowRight,
} from "lucide-react";

const PROFESSIONAL_ROLE_OPTIONS: CustomDropdownOption[] = [
  { value: "DEVELOPER", label: "Developer", color: "#3B82F6" },
  { value: "PM", label: "Product Manager", color: "#F59E0B" },
  { value: "QA", label: "QA Engineer", color: "#10B981" },
  { value: "INFRASTRUCTURE", label: "DevOps / Infra", color: "#8B5CF6" },
  { value: "DX", label: "UX / DX", color: "#06B6D4" },
  { value: "PRESENTATION", label: "Technical Writer", color: "#14B8A6" },
];

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

export default function ProfilePage() {
  const { user, projects, updateUser, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"general" | "security" | "workspaces">("general");

  // Profile edit state
  const [displayName, setDisplayName] = useState("");
  const [professionalRole, setProfessionalRole] = useState("DEVELOPER");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Sync user state on load
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.fullName || "");
      setProfessionalRole(user.professionalRole || "DEVELOPER");
    }
  }, [user]);

  const initials =
    (displayName || user?.displayName || user?.email || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  const isSuperAdmin = user?.systemRole === "ADMIN";

  // Handle Save Profile
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

      showToast("Profile information updated successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      showToast("Please enter your current password", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("New password must be at least 8 characters long", "error");
      return;
    }
    if (newPassword === currentPassword) {
      showToast("New password must be different from current password", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New password and confirmation do not match", "error");
      return;
    }

    setSavingPassword(true);
    try {
      await api.auth.changePassword({
        currentPassword,
        newPassword,
      });

      showToast("Password updated successfully", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showToast(err.message || "Failed to update password", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const hasProfileChanges =
    displayName.trim() !== (user?.displayName || "") ||
    professionalRole !== (user?.professionalRole || "DEVELOPER");

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Breadcrumb matching Team and Projects pages */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/dashboard" className="text-[#2563eb] hover:underline font-medium">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Profile & Settings</span>
        </div>

        {/* Page Header matching Team and Projects pages */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                <User className="w-4 h-4 stroke-[2.2]" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
                Account & Profile
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage your personal profile, credentials, and workspace access.
            </p>
          </div>
        </div>

        {/* Tab Navigation matching ProjectDetailPage and Team tabs */}
        <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-medium pt-1">
          <button
            onClick={() => setActiveTab("general")}
            className={`pb-2.5 transition-all relative cursor-pointer ${
              activeTab === "general"
                ? "text-blue-600 font-semibold border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            General Profile
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`pb-2.5 transition-all relative cursor-pointer ${
              activeTab === "security"
                ? "text-blue-600 font-semibold border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Security & Password
          </button>
          <button
            onClick={() => setActiveTab("workspaces")}
            className={`pb-2.5 transition-all relative cursor-pointer ${
              activeTab === "workspaces"
                ? "text-blue-600 font-semibold border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Workspaces ({projects.length})
          </button>
        </div>

        {/* TAB 1: GENERAL PROFILE */}
        {activeTab === "general" && (
          <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
            {/* Identity Summary Header inside card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-xl ${getMemberAvatarBg(
                    professionalRole
                  )} text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0`}
                >
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold font-serif text-slate-900">
                      {displayName || user?.email || "Unknown user"}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getProfRoleBadgeStyle(
                        professionalRole
                      )}`}
                    >
                      {getProfRoleLabel(professionalRole)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-slate-200 bg-slate-50 text-slate-700">
                      {isSuperAdmin ? (
                        <>
                          <ShieldCheck className="w-3 h-3 text-rose-600" />
                          Admin
                        </>
                      ) : (
                        <>
                          <Shield className="w-3 h-3 text-blue-600" />
                          Member
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {user?.email || "Email unavailable"}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60] self-start sm:self-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A60]" />
                Active
              </span>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Display Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  maxLength={100}
                  className="h-10 text-xs rounded-xl border border-slate-200 focus-visible:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400">
                  Visible to team members across project boards, activities, and task assignments.
                </p>
              </div>

              {/* Email Address (Read-Only) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Email Address
                  </label>
                  <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <Input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="h-10 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400">
                  Email addresses are managed through workspace invitations.
                </p>
              </div>

              {/* Professional Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Professional Role
                </label>
                <CustomDropdown
                  labelPrefix="Role"
                  value={professionalRole}
                  onChange={(val) => setProfessionalRole(val)}
                  options={PROFESSIONAL_ROLE_OPTIONS}
                  size="md"
                  className="w-full"
                />
                <p className="text-[11px] text-slate-400">
                  Used by AI Copilot for relevant contextual recommendations and task alignment.
                </p>
              </div>

              {/* Submit Button matching TeamPage buttons */}
              <div className="pt-2 flex items-center justify-start">
                <button
                  type="submit"
                  disabled={savingProfile || !hasProfileChanges}
                  className="h-10 px-5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {savingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* TAB 2: SECURITY & PASSWORD */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-base font-bold font-serif text-slate-900">
                    Change Password
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your password. Other active sessions will be terminated automatically.
                  </p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Current Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="h-10 text-xs rounded-xl border border-slate-200 pr-10 focus-visible:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 rounded transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="h-10 text-xs rounded-xl border border-slate-200 pr-10 focus-visible:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 rounded transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Must be at least 8 characters long and different from current password.
                  </p>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="h-10 text-xs rounded-xl border border-slate-200 focus-visible:ring-blue-500"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex items-center justify-start">
                  <button
                    type="submit"
                    disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="h-10 px-5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {savingPassword ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Update Password</span>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* Active Session Card */}
            <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold font-serif text-slate-900">Current Session</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Signed in on this device as <span className="font-medium text-slate-800">{user?.email}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => logout()}
                className="h-9 px-4 rounded-xl border border-slate-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </section>
          </div>
        )}

        {/* TAB 3: WORKSPACES */}
        {activeTab === "workspaces" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold font-serif text-slate-900">
                  Workspace Memberships ({projects.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Projects you are a member of with access to requirements, tasks, and files.
                </p>
              </div>

              <Link href="/projects">
                <button
                  type="button"
                  className="h-9 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Folder className="w-3.5 h-3.5 text-blue-600" />
                  <span>View All Projects</span>
                </button>
              </Link>
            </div>

            {projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 font-mono">
                          {proj.key}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {proj.currentUserRole || "MEMBER"}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold font-serif text-slate-900 group-hover:text-blue-600 transition-colors">
                        {proj.name}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {proj.description || "No description provided for this workspace."}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60]">
                        {proj.status === "ACTIVE" ? "Active" : proj.status.toLowerCase()}
                      </span>

                      <Link href={`/projects/${proj.id}`}>
                        <button
                          type="button"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/90 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                  <Folder className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold font-serif text-slate-900">No workspaces assigned</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You are not currently assigned to any workspace projects.
                </p>
                <Link href="/projects">
                  <button
                    type="button"
                    className="h-9 px-4 rounded-xl bg-[#2563eb] text-white text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Go to Projects
                  </button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
