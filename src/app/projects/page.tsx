"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, Project } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Check,
  AlertCircle,
  Briefcase,
  FileText,
  ChevronRight,
  Folder,
  ArrowRight,
  ShieldCheck,
  Users,
  Loader2,
  UserCheck,
} from "lucide-react";

interface ProjectDisplayItem {
  id: string;
  name: string;
  key: string;
  description: string;
  status: string;
  dueDate: string;
  role: string;
  isArchived: boolean;
  rawProject: Project;
}

interface WorkspaceMemberItem {
  id: string;
  email: string;
  displayName?: string;
  professionalRole?: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, currentProject, user, setCurrentProject, refreshProjects } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ACTIVE");
  const [filterQuery, setFilterQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initial member invitation state
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<
    Record<string, "CONTRIBUTOR" | "MANAGER" | "VIEWER">
  >({});
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    if (!showCreate) {
      setSelectedMembers({});
      setMemberSearch("");
      return;
    }
    let isCancelled = false;
    setLoadingMembers(true);
    api.workspace
      .getMembers()
      .then((res: any) => {
        if (isCancelled) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        setWorkspaceMembers(list.filter((m: any) => m.id !== user?.id));
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (!isCancelled) setLoadingMembers(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [showCreate, user?.id]);

  const filteredWorkspaceMembers = useMemo(() => {
    if (!memberSearch.trim()) return workspaceMembers;
    const q = memberSearch.toLowerCase().trim();
    return workspaceMembers.filter(
      (m) =>
        m.email.toLowerCase().includes(q) ||
        (m.displayName && m.displayName.toLowerCase().includes(q)) ||
        (m.professionalRole && m.professionalRole.toLowerCase().includes(q))
    );
  }, [workspaceMembers, memberSearch]);

  // Map 100% real backend projects
  const allProjectsList = useMemo<ProjectDisplayItem[]>(() => {
    return projects.map((bp) => {
      const isArch = bp.status === "ARCHIVED";
      return {
        id: bp.id,
        name: bp.name,
        key: bp.key,
        description: bp.description || "No description provided.",
        status: bp.status,
        dueDate: bp.createdAt ? `Created ${new Date(bp.createdAt).toLocaleDateString()}` : "Active",
        role: bp.currentUserRole || "Member",
        isArchived: isArch,
        rawProject: bp,
      };
    });
  }, [projects]);

  // Tab counts
  const totalCount = allProjectsList.length;
  const activeCount = allProjectsList.filter((p) => !p.isArchived).length;
  const archivedCount = allProjectsList.filter((p) => p.isArchived).length;

  // Filtered list
  const displayedProjects = useMemo(() => {
    return allProjectsList.filter((p) => {
      if (activeTab === "ACTIVE" && p.isArchived) return false;
      if (activeTab === "ARCHIVED" && !p.isArchived) return false;

      if (filterQuery.trim() !== "") {
        const q = filterQuery.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.key.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allProjectsList, activeTab, filterQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const membersPayload = Object.entries(selectedMembers).map(([userId, role]) => ({
        userId,
        role,
      }));

      const created = await api.projects.create({
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim() || undefined,
        members: membersPayload.length > 0 ? membersPayload : undefined,
      });
      setName("");
      setKey("");
      setDescription("");
      setSelectedMembers({});
      setMemberSearch("");
      setShowCreate(false);
      showToast(`Project [${created.key}] created successfully!`, "success");
      await refreshProjects();
      setCurrentProject(created);
      router.push(`/projects/${created.id}`);
    } catch (err: any) {
      const msg = err.message || "Failed to create project";
      setErrorMsg(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (p: ProjectDisplayItem) => {
    setCurrentProject(p.rawProject);
    router.push(`/projects/${p.id}`);
  };

  const renderBadge = (status: ProjectDisplayItem["status"]) => {
    if (status === "ACTIVE") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60]">
          Active
        </span>
      );
    }
    if (status !== "ARCHIVED") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#FEF3C7] text-[#D97706]">
          {status || "Unknown status"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F3F4F6] text-[#6B7280]">
        Archived
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/dashboard" className="hover:text-slate-800 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">Projects</span>
        </div>

        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-codex-accent flex items-center justify-center border border-blue-100">
                <Folder className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
                Projects
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Workspaces you have access to across your organization.
            </p>
          </div>

          <Button
            onClick={() => setShowCreate(!showCreate)}
            className="gap-1.5 text-xs bg-codex-accent hover:bg-codex-hover text-white rounded-xl px-4 py-2 shadow-xs font-medium self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </Button>
        </div>

        {/* Create Form Drawer */}
        {showCreate && (
          <Card className="border-slate-200 shadow-md max-w-xl animate-in fade-in slide-in-from-top-2 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 font-serif">
                Create New Project Workspace
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleCreate}>
              <div className="p-5 space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Project Name *</label>
                  <Input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Alpha Workspace"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Project Key * (2-10 uppercase letters)
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Prefix for REQ-1, TSK-1
                    </span>
                  </div>
                  <Input
                    required
                    value={key}
                    onChange={(e) => setKey(e.target.value.toUpperCase())}
                    placeholder="e.g., AIW"
                    maxLength={10}
                    className="font-mono tracking-wider h-9 text-xs uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Description</label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief summary of the workspace purpose and scope..."
                    className="h-9 text-xs"
                  />
                </div>

                {/* Team Members Invitation */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        Invite Team Members (Optional)
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Select colleagues to include in this workspace. You are the project Owner.
                      </p>
                    </div>
                    {Object.keys(selectedMembers).length > 0 && (
                      <span className="text-[11px] font-medium text-codex-accent bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        {Object.keys(selectedMembers).length} selected
                      </span>
                    )}
                  </div>

                  {loadingMembers ? (
                    <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      Loading workspace members...
                    </div>
                  ) : workspaceMembers.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                      No other workspace members available to invite yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {workspaceMembers.length > 3 && (
                        <div className="relative">
                          <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            placeholder="Filter members by name or email..."
                            className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-codex-accent"
                          />
                        </div>
                      )}

                      <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50">
                        {filteredWorkspaceMembers.map((member) => {
                          const isSelected = !!selectedMembers[member.id];
                          const currentRole = selectedMembers[member.id] || "CONTRIBUTOR";
                          return (
                            <div
                              key={member.id}
                              className={`p-2 flex items-center justify-between gap-3 text-xs transition-colors ${
                                isSelected ? "bg-white" : "hover:bg-slate-100/60"
                              }`}
                            >
                              <label className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    setSelectedMembers((prev) => {
                                      const next = { ...prev };
                                      if (e.target.checked) {
                                        next[member.id] = "CONTRIBUTOR";
                                      } else {
                                        delete next[member.id];
                                      }
                                      return next;
                                    });
                                  }}
                                  className="rounded border-slate-300 text-codex-accent focus:ring-codex-accent/20 h-3.5 w-3.5"
                                />
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700 shrink-0">
                                  {(member.displayName || member.email)[0].toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-slate-800 truncate leading-tight">
                                    {member.displayName || member.email}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {member.email}
                                    {member.professionalRole ? ` • ${member.professionalRole}` : ""}
                                  </p>
                                </div>
                              </label>

                              {isSelected && (
                                <select
                                  value={currentRole}
                                  onChange={(e) => {
                                    const newRole = e.target.value as
                                      | "CONTRIBUTOR"
                                      | "MANAGER"
                                      | "VIEWER";
                                    setSelectedMembers((prev) => ({
                                      ...prev,
                                      [member.id]: newRole,
                                    }));
                                  }}
                                  className="h-7 text-[11px] font-medium bg-white border border-slate-200 rounded-lg px-2 text-slate-700 outline-none focus:ring-1 focus:ring-codex-accent cursor-pointer"
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
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreate(false)}
                  className="text-xs rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="bg-codex-accent hover:bg-codex-hover text-white px-4 text-xs rounded-lg"
                >
                  {loading ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Filter Pills & Search Input Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-xs gap-1">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === "ALL"
                  ? "bg-[#161927] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === "ACTIVE"
                  ? "bg-[#161927] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setActiveTab("ARCHIVED")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === "ARCHIVED"
                  ? "bg-[#161927] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Archived ({archivedCount})
            </button>
          </div>

          {/* Search Input on Right */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter by name or key..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-codex-accent focus:border-codex-accent shadow-xs"
            />
          </div>
        </div>

        {/* Projects Display */}
        {allProjectsList.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-codex-accent flex items-center justify-center mx-auto">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 font-serif">
                No project workspaces yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Create your first project workspace to start collaborating on requirements, architecture decisions, tasks, and documents.
              </p>
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              size="sm"
              className="gap-1.5 text-xs bg-codex-accent hover:bg-codex-hover text-white rounded-xl px-4 py-2 shadow-xs font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Project</span>
            </Button>
          </div>
        ) : displayedProjects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 font-serif">
              No matching projects
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search keywords or switching between the Active and Archived tabs.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterQuery("");
                setActiveTab("ALL");
              }}
              className="text-xs rounded-lg"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {displayedProjects.map((proj) => {
              const isCurrent = currentProject?.id === proj.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => handleCardClick(proj)}
                  className={`bg-white rounded-2xl border transition-all duration-150 p-5 shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between group ${
                    isCurrent
                      ? "border-codex-accent ring-1 ring-codex-accent/40"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Title and Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {proj.key}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 font-serif group-hover:text-codex-accent transition-colors">
                            {proj.name}
                          </h3>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] text-codex-accent font-semibold inline-block mt-0.5">
                            ● Active Selected Workspace
                          </span>
                        )}
                      </div>
                      <div className="shrink-0">{renderBadge(proj.status)}</div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>
                  </div>

                  {/* Footer metadata */}
                  <div className="pt-3.5 mt-4 border-t border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="text-[11px] font-medium text-slate-600">
                        Role: {proj.role}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {proj.dueDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-semibold text-codex-accent group-hover:translate-x-0.5 transition-transform">
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
