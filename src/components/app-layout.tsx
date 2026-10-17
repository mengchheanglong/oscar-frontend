"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { WorkspaceIcon } from "@/components/workspace-icons";
import { ProjectSidePanel } from "@/components/project-workspace";
import { Sidebar } from "@/components/sidebar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FolderKanban, ChevronRight, Plus } from "lucide-react";
import { CommandPalette } from "@/components/command-palette";

export function AppLayout({
  children,
  chatHistory,
  onNewChat,
  projectChats,
  onNewProjectChat,
  navigationOpen,
  onCloseNavigation,
}: {
  children: React.ReactNode;
  chatHistory?: React.ReactNode;
  onNewChat?: () => void;
  projectChats?: Record<string, React.ReactNode>;
  onNewProjectChat?: (
    project: import("@/context/auth-context").Project,
  ) => void;
  navigationOpen?: boolean;
  onCloseNavigation?: () => void;
}) {
  const { user, currentProject, projects, setCurrentProject, isLoading } =
    useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const closeNavigation = useCallback(() => {
    setMobileMenuOpen(false);
    onCloseNavigation?.();
  }, [onCloseNavigation]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(pathname === "/assistant" ? "/" : "/login");
    }
  }, [isLoading, user, router, pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isLoading)
    return (
      <div className="workspace-loading" role="status">
        Loading workspace…
      </div>
    );

  if (!user) {
    return null;
  }

  const isFullBleed = pathname === "/assistant";

  return (
    <div className="h-screen max-h-screen overflow-hidden flex bg-[#F4F5F7] text-codex-text app-layout-shell">
      {/* Persistent Left Sidebar with its own independent scrollbar and bottom profile */}
      <Sidebar
        mobileOpen={navigationOpen ?? mobileMenuOpen}
        onCloseMobile={closeNavigation}
        chatHistory={chatHistory}
        onNewChat={onNewChat}
        projectChats={projectChats}
        onNewProjectChat={onNewProjectChat}
        onOpenSearch={() => setCommandPaletteOpen(true)}
      />

      {/* Main column with independent page scrolling */}
      <div className="flex-1 flex flex-col h-screen max-h-screen min-w-0 overflow-hidden">
        {!isFullBleed && (
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileMenuOpen(true)}
            className="workspace-page-navigation workspace-icon-button md:hidden"
          >
            <WorkspaceIcon name="panel" />
          </button>
        )}

        {/* Global Command Palette */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />

        {/* Main Scrollable Canvas - has its own independent scrollbar */}
        <div className="workspace-content-row">
          <main
            className={
              isFullBleed
                ? "flex-1 min-w-0 h-full w-full overflow-hidden flex flex-col min-h-0"
                : "flex-1 px-4 sm:px-8 py-6 overflow-y-auto max-w-7xl w-full mx-auto min-h-0 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-slate-400"
            }
          >
            {!currentProject &&
            pathname !== "/projects" &&
            pathname !== "/dashboard" &&
            pathname !== "/tasks" &&
            pathname !== "/decisions" &&
            pathname !== "/profile" &&
            !pathname.startsWith("/settings") &&
            pathname !== "/team" &&
            pathname !== "/assistant" &&
            pathname !== "/search" ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-5 max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-codex-accent flex items-center justify-center shadow-sm">
                  <FolderKanban className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-codex-text">
                    Select a Workspace
                  </h2>
                  <p className="text-xs text-codex-muted leading-relaxed">
                    Select a project to open its files, checklist, and
                    decisions.
                  </p>
                </div>

                {projects.length > 0 ? (
                  <div className="w-full space-y-2 pt-2 text-left">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Available Workspaces:
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setCurrentProject(p)}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-codex-border hover:border-codex-accent/50 hover:shadow-sm transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-codex-accent bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              {p.key}
                            </span>
                            <span className="text-xs font-semibold text-codex-text group-hover:text-codex-accent">
                              {p.name}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-codex-accent" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link href="/projects">
                    <Button className="bg-codex-accent hover:bg-codex-hover text-white text-xs gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Workspace</span>
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              children
            )}
          </main>
          <ProjectSidePanel />
        </div>
      </div>
    </div>
  );
}
