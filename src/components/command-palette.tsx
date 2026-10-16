"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth, Project } from "@/context/auth-context";
import { api } from "@/lib/api";
import {
  Search,
  LayoutDashboard,
  FileCheck2,
  GitPullRequest,
  CheckSquare,
  Calendar,
  FileText,
  Sparkles,
  Layers,
  FolderOpen,
  Plus,
  ArrowRight,
  X,
  Loader2,
  Users,
  CornerDownLeft,
  Code2,
} from "lucide-react";

interface PaletteItem {
  id: string;
  label: string;
  keyBadge?: string;
  href?: string;
  icon: React.ElementType;
  category: string;
  desc: string;
  tag?: string;
  tagColor?: string;
  iconColorClass?: string;
  action?: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { currentProject, projects, setCurrentProject } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [entityResults, setEntityResults] = useState<any[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Reset query and focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setEntityResults([]);
      setIsSearching(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced API search for workspace records
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !currentProject) {
      setEntityResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const envelope = await api.search.query(
          currentProject.id,
          trimmed,
          undefined,
          1,
          8,
          "hybrid"
        );
        setEntityResults(envelope.data || []);
      } catch (err) {
        console.error("Command palette entity search failed:", err);
        setEntityResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [query, currentProject]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view smoothly
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  // Static Action Catalog
  const quickActions: PaletteItem[] = useMemo(
    () => [
      {
        id: "act-create-task",
        label: "Create Task",
        href: "/tasks?create=true",
        icon: Plus,
        category: "Quick Actions",
        desc: "Add your next project action",
        tag: "Action",
        iconColorClass: "text-emerald-600 bg-emerald-50",
      },
      {
        id: "act-create-adr",
        label: "Record a decision",
        href: "/decisions?create=true",
        icon: Plus,
        category: "Quick Actions",
        desc: "Record a choice and its reasons",
        tag: "Action",
        iconColorClass: "text-purple-600 bg-purple-50",
      },
      {
        id: "act-upload-doc",
        label: "Upload file",
        href: "/documents?upload=true",
        icon: Plus,
        category: "Quick Actions",
        desc: "Add PDF, Word, Excel, or Markdown file",
        tag: "Action",
        iconColorClass: "text-amber-600 bg-amber-50",
      },
      {
        id: "act-ask-copilot",
        label: "Ask AI Copilot",
        href: "/assistant",
        icon: Sparkles,
        category: "Quick Actions",
        desc: "Chat with grounding citations across workspace",
        tag: "AI",
        iconColorClass: "text-indigo-600 bg-indigo-50",
      },
    ],
    []
  );

  const navigationItems: PaletteItem[] = useMemo(
    () => [
      { id: "nav-home", label: "Home", href: "/dashboard", icon: LayoutDashboard, category: "Navigation", desc: "Recent projects and work" },
      { id: "nav-projects", label: "Projects", href: "/projects", icon: FolderOpen, category: "Navigation", desc: "Open or create a project" },
      { id: "nav-files", label: "Files", href: "/documents", icon: FileText, category: "Navigation", desc: "Documents and uploaded folders" },
      { id: "nav-search", label: "Search", href: "/search", icon: Search, category: "Navigation", desc: "Find your work" },
      { id: "nav-assistant", label: "AI Copilot", href: "/assistant", icon: Sparkles, category: "Navigation", desc: "Open your conversations" },
      { id: "nav-settings", label: "Settings", href: "/settings", icon: Layers, category: "Navigation", desc: "Account and connections" },
    ], []
  );

  const projectItems: PaletteItem[] = useMemo(
    () =>
      projects.map((p: Project) => ({
        id: `switch-proj-${p.id}`,
        label: `Switch to [${p.key}] ${p.name}`,
        action: () => setCurrentProject(p),
        href: "/dashboard",
        icon: FolderOpen,
        category: "Switch Workspace",
        desc:
          p.id === currentProject?.id
            ? "Currently active workspace"
            : `Set active workspace to ${p.key}`,
        tag: p.id === currentProject?.id ? "Active" : undefined,
        tagColor:
          p.id === currentProject?.id
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : undefined,
      })),
    [projects, currentProject, setCurrentProject]
  );

  // Convert live search results into PaletteItems with same-tab deep links
  const liveEntityItems: PaletteItem[] = useMemo(() => {
    return entityResults.map((item: any) => {
      let icon = FileText;
      let href = "/dashboard";
      let iconColorClass = "text-slate-600 bg-slate-100";
      let tagLabel = item.type || "RECORD";
      let tagColor = "bg-slate-100 text-slate-700 border-slate-200";

      const searchParam = item.key || item.title;

      switch (item.type) {
        case "TASK":
          icon = CheckSquare;
          href = `/tasks?id=${item.id}&search=${encodeURIComponent(searchParam)}`;
          iconColorClass = "text-emerald-600 bg-emerald-50";
          tagLabel = "Task";
          tagColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
          break;
        case "REQUIREMENT":
          icon = FileCheck2;
          href = `/requirements?id=${item.id}&search=${encodeURIComponent(searchParam)}`;
          iconColorClass = "text-blue-600 bg-blue-50";
          tagLabel = "Requirement";
          tagColor = "bg-blue-50 text-blue-700 border-blue-200";
          break;
        case "DECISION":
          icon = GitPullRequest;
          href = `/decisions?id=${item.id}&search=${encodeURIComponent(searchParam)}`;
          iconColorClass = "text-purple-600 bg-purple-50";
          tagLabel = "ADR";
          tagColor = "bg-purple-50 text-purple-700 border-purple-200";
          break;
        case "MEETING":
          icon = Calendar;
          href = `/meetings?id=${item.id}&search=${encodeURIComponent(item.title)}`;
          iconColorClass = "text-cyan-600 bg-cyan-50";
          tagLabel = "Meeting";
          tagColor = "bg-cyan-50 text-cyan-700 border-cyan-200";
          break;
        case "DOCUMENT":
          icon = FileText;
          href = `/documents?id=${item.id}&search=${encodeURIComponent(item.title)}`;
          iconColorClass = "text-amber-600 bg-amber-50";
          tagLabel = "Document";
          tagColor = "bg-amber-50 text-amber-700 border-amber-200";
          break;
        case "GITHUB_ISSUE":
          icon = Layers;
          href = `/integrations?app=github&search=${encodeURIComponent(item.title)}`;
          iconColorClass = "text-slate-700 bg-slate-100";
          tagLabel = "GitHub Issue";
          tagColor = "bg-slate-900 text-white border-slate-700";
          break;
        case "GITHUB_PR":
          icon = GitPullRequest;
          href = `/integrations?app=github&tab=pulls&search=${encodeURIComponent(item.title)}`;
          iconColorClass = "text-emerald-700 bg-emerald-50";
          tagLabel = "GitHub PR";
          tagColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
          break;
        case "GITHUB_CODE":
          icon = Code2;
          href = `/integrations?app=github&tab=code&search=${encodeURIComponent(item.title)}`;
          iconColorClass = "text-indigo-700 bg-indigo-50";
          tagLabel = "Source Code";
          tagColor = "bg-indigo-50 text-indigo-700 border-indigo-200";
          break;
      }

      return {
        id: `entity-${item.id}`,
        label: item.title,
        keyBadge: item.key || undefined,
        href,
        icon,
        category: "Workspace Records",
        desc: item.snippet || (item.status ? `Status: ${item.status}` : "Direct workspace record"),
        tag: tagLabel,
        tagColor,
        iconColorClass,
      };
    });
  }, [entityResults]);

  // Filter static actions and navigation based on query
  const filteredQuickActions = useMemo(() => {
    if (!query.trim()) return quickActions;
    const q = query.toLowerCase();
    return quickActions.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q)
    );
  }, [quickActions, query]);

  const filteredNavigation = useMemo(() => {
    if (!query.trim()) return navigationItems;
    const q = query.toLowerCase();
    return navigationItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q)
    );
  }, [navigationItems, query]);

  const filteredProjects = useMemo(() => {
    if (!query.trim()) return projectItems;
    const q = query.toLowerCase();
    return projectItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q)
    );
  }, [projectItems, query]);

  // Ordered sections for rendering
  const sections = useMemo(() => {
    const list: { title: string; items: PaletteItem[] }[] = [];

    // If query has live entity results, show them at the very top
    if (liveEntityItems.length > 0) {
      list.push({ title: "Workspace Records", items: liveEntityItems });
    }

    if (query.trim()) {
      // Provide explicit Deep Search in Universal Search action
      const deepSearchItem: PaletteItem = {
        id: "deep-search-universal-action",
        label: `Deep Search for "${query.trim()}" in Universal Search`,
        href: `/search?q=${encodeURIComponent(query.trim())}`,
        icon: Search,
        category: "Deep Search",
        desc: "Open dedicated full page with Hybrid RRF, Semantic vectors, and faceted category filters",
        tag: "Shift+↵",
        tagColor: "bg-blue-50 text-blue-700 border-blue-200",
        iconColorClass: "text-codex-accent bg-blue-50 border-blue-200",
      };

      list.push({ title: "Deep Search", items: [deepSearchItem] });

      // When searching, group actions and navigation together
      const combinedActions = [...filteredQuickActions, ...filteredNavigation];
      if (combinedActions.length > 0) {
        list.push({ title: "Actions & Pages", items: combinedActions });
      }
      if (filteredProjects.length > 0) {
        list.push({ title: "Workspaces", items: filteredProjects });
      }
    } else {
      // Default empty query view: Quick Actions, then Navigation, then Switch Workspace
      if (filteredQuickActions.length > 0) {
        list.push({ title: "Quick Actions", items: filteredQuickActions });
      }
      if (filteredNavigation.length > 0) {
        list.push({ title: "Navigation", items: filteredNavigation });
      }
      if (filteredProjects.length > 0) {
        list.push({ title: "Switch Workspace", items: filteredProjects });
      }
    }

    return list;
  }, [
    liveEntityItems,
    filteredQuickActions,
    filteredNavigation,
    filteredProjects,
    query,
  ]);

  // Flattened list for unified keyboard arrow navigation
  const flatItems: PaletteItem[] = useMemo(() => {
    return sections.flatMap((sec) => sec.items);
  }, [sections]);

  const handleSelect = (item: PaletteItem) => {
    if (item.action) {
      item.action();
    }
    if (item.href) {
      router.push(item.href);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.shiftKey && e.key === "Enter" && query.trim()) {
      e.preventDefault();
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flatItems.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % flatItems.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flatItems.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      }
    } else if (e.key === "Enter" && flatItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(flatItems[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150">
      {/* Backdrop click dismiss */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette Container */}
      <div
        className="relative w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[82vh] animate-in zoom-in-95 duration-150 text-slate-800"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center gap-3 bg-white">
          {isSearching ? (
            <Loader2 className="w-4 h-4 text-codex-accent animate-spin shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your work or jump to a page..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            aria-label="Search command palette"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded text-slate-500 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={selectedItemRef as any}
          className="flex-1 overflow-y-auto p-2 space-y-4 max-h-[60vh] [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.12)_transparent]"
        >
          {flatItems.length === 0 ? (
            <div className="py-14 text-center px-4 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-800">
                  No matches found for &quot;{query}&quot;
                </p>
                <p className="text-xs text-slate-400">
                  Try searching with keywords or open full universal search.
                </p>
              </div>

              {query.trim() && (
                <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      router.push(`/search?search=${encodeURIComponent(query.trim())}`);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs"
                  >
                    <span>Search in Universal Search</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => {
                      router.push(
                        `/assistant?prompt=${encodeURIComponent(
                          `Find information or summarize context for: ${query.trim()}`
                        )}`
                      );
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-codex-accent border border-blue-200 hover:bg-blue-100/60 transition-all shadow-xs"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Ask AI Copilot</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            sections.map((section) => {
              return (
                <div key={section.title} className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    {section.title}
                  </div>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const itemIdx = flatItems.findIndex((fi) => fi.id === item.id);
                      const isSelected = itemIdx === selectedIndex;
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          ref={isSelected ? selectedItemRef : undefined}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                            isSelected
                              ? "bg-blue-50/80 text-slate-900 border border-blue-200/80 shadow-2xs"
                              : "text-slate-700 hover:bg-slate-50 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                                item.iconColorClass ||
                                (isSelected
                                  ? "bg-blue-100/80 text-blue-700 border-blue-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200/60")
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {item.keyBadge && (
                                  <span className="text-[10px] font-mono font-bold text-codex-accent bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100 shrink-0">
                                    {item.keyBadge}
                                  </span>
                                )}
                                <span className="text-xs font-semibold text-slate-800 truncate">
                                  {item.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {item.desc}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {item.tag && (
                              <span
                                className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                  item.tagColor ||
                                  "bg-slate-100 text-slate-500 border-slate-200"
                                }`}
                              >
                                {item.tag}
                              </span>
                            )}
                            {isSelected ? (
                              <div className="flex items-center gap-1 text-[10px] text-codex-accent font-mono font-semibold">
                                <CornerDownLeft className="w-3 h-3" />
                              </div>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between px-4 select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white border border-slate-200/80 px-1 py-0.5 rounded text-[10px] text-slate-500 shadow-2xs">
                ↑
              </kbd>
              <kbd className="font-mono bg-white border border-slate-200/80 px-1 py-0.5 rounded text-[10px] text-slate-500 shadow-2xs">
                ↓
              </kbd>
              <span className="text-[10px] ml-0.5">navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white border border-slate-200/80 px-1.5 py-0.5 rounded text-[10px] text-slate-500 shadow-2xs">
                ↵
              </kbd>
              <span className="text-[10px] ml-0.5">open</span>
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <kbd className="font-mono bg-white border border-slate-200/80 px-1.5 py-0.5 rounded text-[10px] text-slate-500 shadow-2xs">
                shift+↵
              </kbd>
              <span className="text-[10px] ml-0.5">deep search</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white border border-slate-200/80 px-1 py-0.5 rounded text-[10px] text-slate-500 shadow-2xs">
                esc
              </kbd>
              <span className="text-[10px] ml-0.5">close</span>
            </span>
          </div>

          <div className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
            {currentProject ? (
              <span className="text-codex-accent font-semibold">
                [{currentProject.key}] {currentProject.name}
              </span>
            ) : (
              <span>No workspace selected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
