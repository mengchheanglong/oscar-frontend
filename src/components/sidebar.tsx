"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { AiWorkspaceLogo } from "@/components/ai-workspace-logo";
import {
  SquarePen,
  Plus,
  Folder,
  CheckSquare,
  Files,
  Search,
  Settings,
  X,
  LogOut,
  User,
  ChevronsUpDown,
} from "lucide-react";

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  chatHistory?: React.ReactNode;
  onNewChat?: () => void;
}

const NAV_ITEMS = [
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Files", href: "/documents", icon: Files },
  { label: "Search", href: "/search", icon: Search },
];

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  onCloseMobile,
  chatHistory,
  onNewChat,
}) => {
  const pathname = usePathname();
  const { user, logout, projects, currentProject, setCurrentProject } =
    useAuth();
  const router = useRouter();

  // Get user display name and initials
  const displayName =
    user?.displayName || user?.fullName || user?.email || "Unknown user";
  const userRole =
    user?.professionalRole || user?.systemRole || user?.role || "Unknown role";
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = mobileRef.current;
    panel?.querySelector<HTMLElement>("button,a[href]")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseMobile?.();
      }
      if (event.key !== "Tab" || !panel) return;
      const controls = Array.from(
        panel.querySelectorAll<HTMLElement>(
          "button:not([disabled]),a[href],input:not([disabled])",
        ),
      ).filter((node) => node.offsetParent !== null);
      const first = controls[0],
        last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [mobileOpen, onCloseMobile]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  const roleLabel =
    user?.systemRole === "ADMIN"
      ? "Super Admin"
      : userRole.toUpperCase() === "DEVELOPER"
        ? "Developer"
        : userRole.toUpperCase() === "PM"
          ? "Product Manager"
          : userRole.toUpperCase() === "QA"
            ? "QA Engineer"
            : userRole.toUpperCase() === "INFRASTRUCTURE"
              ? "Infrastructure"
              : userRole.toUpperCase() === "DX"
                ? "UX / DX"
                : userRole.toUpperCase() === "PRESENTATION"
                  ? "Technical Writer"
                  : userRole;

  const navContent = (
    <div className="flex flex-col h-full bg-[#191a1c] text-white select-none overflow-hidden">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between shrink-0 border-b border-white/[0.06]">
        <Link
          href="/assistant"
          className="flex items-center gap-2.5 group transition-transform hover:scale-[1.02]"
          onClick={onCloseMobile}
        >
          <AiWorkspaceLogo size="md" />
        </Link>

        {mobileOpen && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Navigation Links - Dedicated Scroll Container */}
      <nav className="flex-1 min-h-0 px-3 py-3 space-y-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-white/25">
        {onNewChat ? (
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onCloseMobile?.();
            }}
            className="mb-2 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-white hover:bg-white/10"
          >
            <SquarePen className="h-4 w-4" />
            New chat
          </button>
        ) : (
          <Link
            href="/assistant"
            onClick={onCloseMobile}
            className="mb-2 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-white hover:bg-white/10"
          >
            <SquarePen className="h-4 w-4" />
            Open chat
          </Link>
        )}
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group",
                isActive
                  ? "bg-white/[0.10] text-white font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-white/[0.06]",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isActive
                    ? "text-white"
                    : "text-slate-400 group-hover:text-white",
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <div className="pt-7">
          <div className="mb-2 flex items-center justify-between px-3.5 text-xs text-slate-400">
            <span>Projects</span>
            <Link
              href="/projects"
              aria-label="Manage projects"
              onClick={onCloseMobile}
              className="rounded p-1 hover:bg-white/10 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
            </Link>
          </div>
          {projects
            .filter((project) => project.status !== "ARCHIVED")
            .map((project) => (
              <div key={project.id} className="group">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentProject(project);
                    router.push("/assistant");
                    onCloseMobile?.();
                  }}
                  aria-pressed={currentProject?.id === project.id}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3.5 py-2 text-left text-xs",
                    currentProject?.id === project.id
                      ? "bg-white/[0.06] text-white"
                      : "text-slate-300 hover:bg-white/[0.06]",
                  )}
                >
                  <Folder className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{project.name}</span>
                </button>
                {currentProject?.id === project.id && (
                  <div className="ml-10 flex flex-wrap gap-x-3 gap-y-2 pb-2 pt-1 text-[11px] text-slate-400">
                    <Link
                      href={`/projects/${project.id}`}
                      onClick={onCloseMobile}
                      className="hover:text-white"
                    >
                      Overview
                    </Link>
                    <Link
                      href="/decisions"
                      onClick={onCloseMobile}
                      className="hover:text-white"
                    >
                      Decisions
                    </Link>
                  </div>
                )}
              </div>
            ))}
          {projects.length === 0 && (
            <Link
              href="/projects"
              onClick={onCloseMobile}
              className="block px-3.5 py-2 text-xs text-slate-400 hover:text-white"
            >
              Create a project
            </Link>
          )}
        </div>
        {chatHistory && (
          <div className="pt-7">
            <h2 className="mb-2 px-3.5 text-xs text-slate-400">Chats</h2>
            {chatHistory}
          </div>
        )}
      </nav>
      <Link
        href="/settings"
        onClick={onCloseMobile}
        className="mx-3 mb-2 flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs text-slate-300 hover:bg-white/[0.06] hover:text-white"
      >
        <Settings className="h-4 w-4 text-slate-400" />
        Settings
      </Link>

      {/* User Profile Footer - Anchored at the bottom end with Popover Menu */}
      <div
        ref={userMenuRef}
        className="p-3 shrink-0 border-t border-white/[0.08] bg-[#191a1c] relative"
      >
        {/* User Menu Popover */}
        {userMenuOpen && (
          <div className="absolute bottom-full mb-2 inset-x-3 bg-[#181b2a] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
            {/* User Details Header matching Reference Image 2 */}
            <div className="px-3 py-2.5">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {user?.email || "Email unavailable"}
              </p>
              <p className="text-[11px] text-slate-300 font-medium mt-1 truncate">
                Signed in as{" "}
                <span className="text-blue-400 font-semibold">{roleLabel}</span>
              </p>
            </div>

            <div className="h-px bg-white/[0.08] my-1" />

            {/* Option 1: View Profile */}
            <Link
              href="/profile"
              onClick={() => {
                setUserMenuOpen(false);
                onCloseMobile?.();
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors group"
            >
              <User className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              <span>View Profile</span>
            </Link>

            <div className="h-px bg-white/[0.08] my-1" />

            {/* Option 2: Sign Out / Exit */}
            <button
              onClick={() => {
                setUserMenuOpen(false);
                onCloseMobile?.();
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors group text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400 group-hover:text-rose-300 transition-colors" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* User Card Trigger (clickable, no separate exit icon) */}
        <button
          type="button"
          onClick={() => setUserMenuOpen((prev) => !prev)}
          className={cn(
            "w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all text-left group cursor-pointer",
            userMenuOpen
              ? "bg-white/[0.08] border-white/20 shadow-sm"
              : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/15",
          )}
          aria-expanded={userMenuOpen}
          aria-label="User account menu"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#3b82f6] flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-xs font-semibold text-white truncate leading-tight group-hover:text-white">
                {displayName}
              </span>
              <span className="text-[11px] text-slate-400 truncate leading-tight capitalize mt-0.5">
                {userRole.toLowerCase()}
              </span>
            </div>
          </div>

          <ChevronsUpDown
            className={cn(
              "w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-transform duration-150 shrink-0",
              userMenuOpen && "text-white rotate-180",
            )}
          />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-[#191a1c] border-r border-white/[0.08] flex-col shrink-0 h-screen max-h-screen overflow-hidden sticky top-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <aside
            ref={mobileRef}
            role="dialog"
            aria-modal="true"
            aria-label="Workspace navigation"
            className="relative w-64 max-w-[85vw] bg-[#191a1c] border-r border-white/[0.1] flex flex-col h-full z-10 shadow-2xl overflow-hidden"
          >
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
