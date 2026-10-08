"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FolderKanban, ChevronRight, Plus } from "lucide-react";
import { CommandPalette } from "@/components/command-palette";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, currentProject, projects, setCurrentProject, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

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

  if (isLoading) {
    return (
      <div className="h-screen max-h-screen overflow-hidden flex bg-[#F4F5F7]">
        <div className="hidden md:block w-60 bg-[#161927] shrink-0 h-screen" />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <div className="h-16 border-b border-codex-border bg-[#F4F5F7] px-8 flex items-center shrink-0">
            <Skeleton className="h-9 w-64 rounded-xl bg-slate-200" />
          </div>
          <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full space-y-6">
            <Skeleton className="h-8 w-48 rounded-lg bg-slate-200" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-28 rounded-xl bg-white" />
              <Skeleton className="h-28 rounded-xl bg-white" />
              <Skeleton className="h-28 rounded-xl bg-white" />
              <Skeleton className="h-28 rounded-xl bg-white" />
            </div>
            <Skeleton className="h-44 rounded-2xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isFullBleed = pathname === "/assistant";

  return (
    <div className="h-screen max-h-screen overflow-hidden flex bg-[#F4F5F7] text-codex-text app-layout-shell">
      {/* Persistent Left Sidebar with its own independent scrollbar and bottom profile */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Column - fixed height with navbar and scrollable canvas */}
      <div className="flex-1 flex flex-col h-screen max-h-screen min-w-0 overflow-hidden">
        {/* Top Navbar Header - hidden on full-bleed pages like /assistant */}
        {!isFullBleed && (
          <div className="shrink-0">
            <Navbar
              onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            />
          </div>
        )}

        {/* Global Command Palette */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />

        {/* Main Scrollable Canvas - has its own independent scrollbar */}
        <main
          className={
            isFullBleed
              ? "flex-1 h-full w-full overflow-hidden flex flex-col min-h-0"
              : "flex-1 px-4 sm:px-8 py-6 overflow-y-auto max-w-7xl w-full mx-auto min-h-0 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-slate-400"
          }
        >
          {!currentProject &&
          pathname !== "/projects" &&
          pathname !== "/dashboard" &&
          pathname !== "/tasks" &&
          pathname !== "/profile" &&
          pathname !== "/team" &&
          pathname !== "/assistant" ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-5 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-codex-accent flex items-center justify-center shadow-sm">
                <FolderKanban className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-codex-text">Select a Workspace</h2>
                <p className="text-xs text-codex-muted leading-relaxed">
                  To view and manage requirements, tasks, decisions, and files, please select an active workspace.
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
      </div>
    </div>
  );
}
