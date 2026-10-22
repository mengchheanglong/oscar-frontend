"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { WorkspaceIcon } from "@/components/workspace-icons";
import { ProjectSidePanel } from "@/components/project-workspace";
import { Sidebar } from "@/components/sidebar";

import { usePathname, useRouter } from "next/navigation";

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
  const { user, isLoading } = useAuth();
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
                : "flex-1 min-w-0 px-4 sm:px-8 py-6 overflow-y-auto w-full min-h-0 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-slate-400"
            }
          >
            {children}
          </main>
          <ProjectSidePanel />
        </div>
      </div>
    </div>
  );
}
