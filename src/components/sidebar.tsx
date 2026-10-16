"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { WorkspaceIcon } from "@/components/workspace-icons";
import {
  LogOut,
  Archive,
  FolderPlus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  useProjectWorkspace,
  ProjectActions,
  ProjectGlyph,
} from "@/components/project-workspace";
import type { Project } from "@/context/auth-context";

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  chatHistory?: ReactNode;
  onNewChat?: () => void;
  projectChats?: Record<string, ReactNode>;
  onNewProjectChat?: (project: Project) => void;
  onOpenSearch?: () => void;
}
export function Sidebar({
  mobileOpen,
  onCloseMobile,
  chatHistory,
  onNewChat,
  projectChats,
  onNewProjectChat,
  onOpenSearch,
}: SidebarProps) {
  const { user, logout, projects, currentProject, setCurrentProject } =
    useAuth();
  const workspace = useProjectWorkspace();
  const [projectsOpen, setProjectsOpen] = useState(true),
    [chatsOpen, setChatsOpen] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(),
  );
  const currentProjectId = currentProject?.id;
  useEffect(() => {
    setExpandedProjects(new Set(currentProjectId ? [currentProjectId] : []));
  }, [currentProjectId]);
  const pathname = usePathname(),
    router = useRouter();
  const [collapsed, setCollapsed] = useState(false),
    [accountOpen, setAccountOpen] = useState(false);
  const mobileRef = useRef<HTMLElement>(null);
  const accountOpenRef = useRef(accountOpen);
  accountOpenRef.current = accountOpen;
  const accountTrigger = useRef<HTMLButtonElement>(null);

  const navLinks = [
    { label: "Decisions", href: "/decisions", icon: "decisions" as const },
    { label: "Tasks", href: "/tasks", icon: "tasks" as const },
    { label: "Files", href: "/documents", icon: "files" as const },
  ];
  const displayName =
    user?.displayName || user?.fullName || user?.email || "Your account";
  const initials = displayName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("aiw_sidebar_collapsed") === "true");
    } catch {}
  }, []);
  const toggleCollapsed = () =>
    setCollapsed((value) => {
      try {
        localStorage.setItem("aiw_sidebar_collapsed", String(!value));
      } catch {}
      return !value;
    });
  const closeAccount = useCallback(() => setAccountOpen(false), []);
  useEffect(() => {
    if (!accountOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!(event.target as Element).closest("[data-account-menu]"))
        closeAccount();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAccount();
        accountTrigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen, closeAccount]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null,
      panel = mobileRef.current;
    panel?.querySelector<HTMLElement>("button,a[href]")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !accountOpenRef.current) {
        event.preventDefault();
        onCloseMobile?.();
      }
      if (event.key !== "Tab" || !panel) return;
      const controls = Array.from(
        panel.querySelectorAll<HTMLElement>(
          "button:not([disabled]),a[href],input:not([disabled]),select",
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
  const navigation = (compact = false) => (
    <div className="workspace-sidebar-inner">
      <div className="workspace-sidebar-header">
        {!compact && (
          <Link
            href="/assistant"
            aria-label="AI Workspace"
            title="AI Workspace"
            onClick={onCloseMobile}
            className="workspace-icon-button"
          >
            <WorkspaceIcon name="mark" className="workspace-brand-icon" />
          </Link>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Search chats"
            title="Search (Ctrl+K)"
            className="workspace-icon-button"
            onClick={() => {
              onOpenSearch?.();
              onCloseMobile?.();
            }}
          >
            <WorkspaceIcon name="search" />
          </button>
          <button
            type="button"
            onClick={mobileOpen ? onCloseMobile : toggleCollapsed}
            aria-label={
              mobileOpen
                ? "Close navigation"
                : compact
                  ? "Expand sidebar"
                  : "Collapse sidebar"
            }
            aria-expanded={!compact}
            className="workspace-icon-button"
          >
            <WorkspaceIcon name={mobileOpen ? "close" : "panel"} />
          </button>
        </div>
      </div>
      <nav className="workspace-nav" aria-label="Workspace">
        {onNewChat ? (
          <button
            type="button"
            aria-label="New chat"
            className="workspace-nav-link"
            aria-current={pathname === "/assistant" ? "page" : undefined}
            title="New chat"
            onClick={() => {
              onNewChat();
              onCloseMobile?.();
            }}
          >
            <WorkspaceIcon name="chat" />
            {!compact && <span>Chat</span>}
          </button>
        ) : (
          <Link
            href="/assistant"
            title="Chat"
            onClick={onCloseMobile}
            className="workspace-nav-link"
            aria-current={pathname === "/assistant" ? "page" : undefined}
          >
            <WorkspaceIcon name="chat" />
            {!compact && <span>Chat</span>}
          </Link>
        )}
        <Link
          href="/search"
          title="Global search"
          aria-label="Global search"
          aria-current={pathname === "/search" ? "page" : undefined}
          onClick={onCloseMobile}
          className="workspace-nav-link"
        >
          <WorkspaceIcon name="search" />
          {!compact && <span>Global search</span>}
        </Link>
        {navLinks.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.label}
              href={link.href}
              title={link.label}
              aria-current={isActive ? "page" : undefined}
              onClick={onCloseMobile}
              className="workspace-nav-link"
            >
              <WorkspaceIcon name={link.icon} />
              {!compact && <span>{link.label}</span>}
            </Link>
          );
        })}
        {compact ? (
          <Link
            href="/projects"
            title="Projects"
            className="workspace-nav-link"
            aria-label="Projects"
          >
            <WorkspaceIcon name="folder" />
          </Link>
        ) : (
          <>
            <div className="workspace-section-label project-section-heading">
              <button
                type="button"
                aria-label="Toggle projects"
                aria-expanded={projectsOpen}
                onClick={() => setProjectsOpen((value) => !value)}
                className="workspace-section-toggle"
              >
                Projects
                {projectsOpen ? (
                  <ChevronDown size={13} />
                ) : (
                  <ChevronRight size={13} />
                )}
              </button>
              <div className="flex">
                <button
                  type="button"
                  aria-label="Archived projects"
                  title="Archived projects"
                  className="workspace-icon-button"
                  onClick={workspace.openArchives}
                >
                  <Archive size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Create project"
                  title="Create project"
                  className="workspace-icon-button"
                  onClick={workspace.openCreate}
                >
                  <FolderPlus size={16} />
                </button>
              </div>
            </div>
            {projectsOpen &&
              projects
                .filter((project) => project.status !== "ARCHIVED")
                .map((project) => (
                  <div key={project.id} className="project-sidebar-group">
                    <div className="project-sidebar-row">
                      <button
                        type="button"
                        className="workspace-nav-link workspace-project"
                        aria-pressed={currentProject?.id === project.id}
                        aria-expanded={expandedProjects.has(project.id)}
                        onClick={() => {
                          setExpandedProjects((previous) => {
                            const next = new Set(previous);
                            if (
                              currentProject?.id === project.id &&
                              next.has(project.id)
                            )
                              next.delete(project.id);
                            else next.add(project.id);
                            return next;
                          });
                          setCurrentProject(project);
                          router.push("/assistant");
                          onCloseMobile?.();
                        }}
                      >
                        <ProjectGlyph project={project} />
                        <span className="truncate">{project.name}</span>
                      </button>
                      <ProjectActions
                        project={project}
                        onNewChat={() => {
                          setExpandedProjects(
                            (previous) =>
                              new Set([...Array.from(previous), project.id]),
                          );
                          if (onNewProjectChat) onNewProjectChat(project);
                          else {
                            setCurrentProject(project);
                            router.push("/assistant");
                          }
                          onCloseMobile?.();
                        }}
                      />
                    </div>
                    {expandedProjects.has(project.id) &&
                      projectChats?.[project.id] && (
                        <div className="project-nested-chats">
                          {projectChats[project.id]}
                        </div>
                      )}
                  </div>
                ))}
            {projectsOpen &&
              projects.filter((project) => project.status !== "ARCHIVED")
                .length === 0 && (
                <button
                  type="button"
                  onClick={workspace.openCreate}
                  className="workspace-nav-link"
                >
                  <FolderPlus size={16} />
                  New project
                </button>
              )}
            {chatHistory && (
              <>
                <div className="workspace-section-label">
                  <button
                    type="button"
                    aria-label="Toggle chats"
                    aria-expanded={chatsOpen}
                    onClick={() => setChatsOpen((value) => !value)}
                    className="workspace-section-toggle"
                  >
                    Chats
                    {chatsOpen ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </button>
                </div>
                {chatsOpen && (
                  <div className="workspace-chat-history">{chatHistory}</div>
                )}
              </>
            )}
          </>
        )}
      </nav>
      <div className="workspace-account" data-account-menu>
        {accountOpen && (
          <div
            className="workspace-account-menu"
            style={
              compact ? { width: 280, right: "auto", left: 60 } : undefined
            }
          >
            <p className="truncate px-3 py-2 text-xs text-slate-400 font-medium border-b border-white/5">
              {user?.email}
            </p>
            <Link
              href="/settings"
              onClick={() => {
                closeAccount();
                onCloseMobile?.();
              }}
              className="workspace-nav-link"
            >
              <WorkspaceIcon name="settings" />
              <span>Settings</span>
            </Link>
            <button
              type="button"
              className="workspace-nav-link text-rose-400 hover:text-rose-300"
              onClick={() => {
                closeAccount();
                onCloseMobile?.();
                void logout();
              }}
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
        <button
          ref={accountTrigger}
          type="button"
          aria-label="User account menu"
          aria-expanded={accountOpen}
          onClick={() => setAccountOpen((value) => !value)}
          className="workspace-account-trigger"
          title={displayName}
        >
          <span className="workspace-avatar">{initials}</span>
          {!compact && <span className="truncate">{displayName}</span>}
        </button>
      </div>
    </div>
  );
  return (
    <>
      <aside
        className={`workspace-sidebar hidden md:flex flex-col shrink-0 h-screen sticky top-0 z-30 ${collapsed ? "is-collapsed" : ""}`}
      >
        {navigation(collapsed)}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            type="button"
            aria-label="Close navigation backdrop"
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/60"
          />
          <aside
            ref={mobileRef}
            role="dialog"
            aria-modal="true"
            aria-label="Workspace navigation"
            className="workspace-sidebar relative z-10 h-full"
          >
            {navigation()}
          </aside>
        </div>
      )}
    </>
  );
}
