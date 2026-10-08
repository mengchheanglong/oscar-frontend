"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, Project } from "@/context/auth-context";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import {
  Search,
  FolderKanban,
  Layers,
  Menu,
} from "lucide-react";
import { NotificationCenter } from "@/components/notification-center";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileMenu,
  onOpenCommandPalette,
}) => {
  const pathname = usePathname();
  const { currentProject, projects, setCurrentProject } = useAuth();

  return (
    <header className="sticky top-0 z-20 w-full bg-[#F4F5F7] border-b border-codex-border/80 px-4 sm:px-8 py-3">
      <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto">
        {/* Left: Mobile Menu Toggle & Quick Command Search Bar */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3 flex-1 max-w-md">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="md:hidden shrink-0 p-2 rounded-lg text-slate-600 hover:text-codex-text hover:bg-slate-200/60"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="group relative flex min-w-0 items-center justify-between w-full h-10 pl-10 pr-3 rounded-xl border border-codex-border bg-white text-xs text-slate-400 shadow-xs hover:border-slate-300 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-codex-accent/20 transition-all text-left cursor-pointer"
            aria-label="Open command palette and quick search"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-codex-accent transition-colors shrink-0" />
            <span className="truncate pr-2">
              <span className="sm:hidden">Search</span>
              <span className="hidden sm:inline">Search tasks, decisions, requirements...</span>
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded shadow-2xs group-hover:text-slate-600 group-hover:border-slate-300 transition-all shrink-0">
              <span className="text-xs leading-none">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right Actions: Global Search, Project Switcher & Notification Bell */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Dedicated Global Search Action */}
          <Link
            href="/search"
            className={cn(
              "flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold transition-all border shadow-2xs",
              pathname === "/search"
                ? "bg-blue-50/90 border-blue-200 text-codex-accent ring-1 ring-codex-accent/20"
                : "bg-white hover:bg-slate-50 border-codex-border/90 text-slate-700 hover:text-codex-accent"
            )}
            title="Global Search across requirements, decisions, tasks, documents & code"
          >
            <Search className="w-3.5 h-3.5 text-codex-accent stroke-[2.2] shrink-0" />
            <span className="hidden sm:inline">Global Search</span>
          </Link>

          {/* Active Project Switcher */}
          {projects.length > 0 && (
            <DropdownSelect
              value={currentProject ? currentProject.id : "ALL"}
              onChange={(val) => {
                if (val === "ALL") {
                  setCurrentProject(null);
                } else {
                  const p = projects.find((proj: Project) => proj.id === val);
                  if (p) setCurrentProject(p);
                }
              }}
              triggerClassName="h-9 border-codex-border/90 text-xs rounded-xl shadow-2xs font-semibold max-w-[140px] sm:max-w-none"
              align="right"
              options={[
                {
                  value: "ALL",
                  label: "All Projects",
                  icon: <Layers className="w-3.5 h-3.5 text-codex-accent shrink-0" />,
                },
                ...projects.map((p: Project) => ({
                  value: p.id,
                  label: `[${p.key}] ${p.name}`,
                  icon: <FolderKanban className="w-3.5 h-3.5 text-codex-accent shrink-0" />,
                })),
              ]}
            />
          )}

          {/* Notification Center */}
          <NotificationCenter />
        </div>
      </div>
    </header>
  );
};
