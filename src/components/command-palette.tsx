"use client";

import { useEffect, useMemo, useRef, useState, useId } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MessageCircle,
  Folder,
  FileText,
  ArrowUpRight,
  Loader2,
  X,
  Plus,
  CheckSquare,
  Bookmark,
} from "lucide-react";
import { useAuth, type Project } from "@/context/auth-context";
import { api } from "@/lib/api";

type Tab = "all" | "chats" | "files";
interface Chat {
  id: string;
  title: string;
  projectId: string;
  updatedAt: string;
}
interface Result {
  id: string;
  title: string;
  type: string;
  snippet?: string;
  project: Project;
}
interface Row {
  id: string;
  title: string;
  subtitle?: string;
  group: string;
  icon: typeof Search;
  run: () => void;
  date?: string;
}
const recordPaths: Record<string, string> = {
  TASK: "/tasks",
  DECISION: "/decisions",
  DOCUMENT: "/documents",
  REQUIREMENT: "/requirements",
  MEETING: "/meetings",
  GITHUB_ISSUE: "/settings/integrations?app=github",
  GITHUB_PR: "/settings/integrations?app=github&tab=pulls",
  GITHUB_CODE: "/settings/integrations?app=github&tab=code",
};
function dateGroup(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - date.getTime()) / 86400000);
  return days <= 0
    ? "Today"
    : days === 1
      ? "Yesterday"
      : days < 7
        ? "Last 7 days"
        : "Earlier";
}

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter(),
    { projects, setCurrentProject } = useAuth();
  const [query, setQuery] = useState(""),
    [tab, setTab] = useState<Tab>("all"),
    [chats, setChats] = useState<Chat[]>([]),
    [records, setRecords] = useState<Result[]>([]),
    [loadingChats, setLoadingChats] = useState(false),
    [searching, setSearching] = useState(false),
    [chatError, setChatError] = useState(""),
    [searchError, setSearchError] = useState(""),
    [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null),
    selectedRow = useRef<HTMLButtonElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  const listId = useId();
  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setTab("all");
    setSelected(0);
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    if (!node) return;
    if (!node.open) node.showModal();
    input.current?.focus();
    return () => {
      node.close();
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoadingChats(true);
    setChats([]);
    setChatError("");
    Promise.allSettled(
      projects.map(async (project) => {
        const rows = await api.ai.listConversations(project.id);
        return rows as Chat[];
      }),
    ).then((results) => {
      if (!active) return;
      setChats(
        results
          .flatMap((result) =>
            result.status === "fulfilled" ? result.value : [],
          )
          .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
      );
      if (results.some((result) => result.status === "rejected"))
        setChatError(
          "Some chats could not be loaded. Close search and try again.",
        );
      setLoadingChats(false);
    });
    return () => {
      active = false;
    };
  }, [isOpen, projects]);
  useEffect(() => {
    let active = true;
    setRecords([]);
    setSearchError("");
    if (!isOpen || !query.trim() || tab === "chats") {
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const results = await Promise.allSettled(
        projects.map(async (project) => {
          const response = await api.search.query(
            project.id,
            query.trim(),
            tab === "files" ? "DOCUMENT" : undefined,
            1,
            8,
            "hybrid",
          );
          return (response.data || []).map(
            (record: Omit<Result, "project">) => ({ ...record, project }),
          );
        }),
      );
      if (!active) return;
      setRecords(
        results.flatMap((result) =>
          result.status === "fulfilled" ? result.value : [],
        ),
      );
      if (results.some((result) => result.status === "rejected"))
        setSearchError(
          "Some project results are unavailable. Try another search.",
        );
      setSearching(false);
    }, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, tab, isOpen, projects]);
  const rows = useMemo(() => {
    const output: Row[] = [],
      q = query.trim().toLowerCase();
    const open = (path: string, project?: Project) => {
      if (project) setCurrentProject(project);
      router.push(path);
      closeRef.current();
    };
    if (tab !== "files") {
      const filtered = chats.filter(
        (chat) => !q || chat.title.toLowerCase().includes(q),
      );
      for (const chat of filtered) {
        const project = projects.find(
          (project) => project.id === chat.projectId,
        );
        if (!project) continue;
        output.push({
          id: `chat:${chat.id}`,
          title: chat.title || "Untitled chat",
          subtitle: q ? project.name : undefined,
          group: q ? "Chats" : dateGroup(chat.updatedAt),
          icon: MessageCircle,
          date: new Date(chat.updatedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          run: () => open(`/assistant?conversation=${chat.id}`, project),
        });
      }
    }
    if (tab !== "chats") {
      for (const record of records) {
        const path = recordPaths[record.type];
        if (!path) continue;
        output.push({
          id: `${record.project.id}:${record.type}:${record.id}`,
          title: record.title,
          subtitle: `${record.project.name} · ${record.type.toLowerCase().replaceAll("_", " ")}`,
          group: "Your work",
          icon:
            record.type === "TASK"
              ? CheckSquare
              : record.type === "DECISION"
                ? Bookmark
                : FileText,
          run: () =>
            open(
              `${path}${path.includes("?") ? "&" : "?"}id=${encodeURIComponent(record.id)}&search=${encodeURIComponent(record.title)}`,
              record.project,
            ),
        });
      }
      if (tab === "all")
        for (const project of projects
          .filter((project) => !q || project.name.toLowerCase().includes(q))
          .slice(0, 5))
          output.push({
            id: `project:${project.id}`,
            title: project.name,
            group: "Projects",
            icon: Folder,
            run: () => open("/assistant", project),
          });
    }
    if (tab === "all" && !q)
      output.push(
        {
          id: "new",
          title: "New chat",
          group: "Actions",
          icon: Plus,
          run: () => {
            setCurrentProject(null);
            open("/assistant?new=1");
          },
        },
        {
          id: "files",
          title: "Browse files",
          group: "Actions",
          icon: FileText,
          run: () => open("/documents"),
        },
      );
    return output;
  }, [chats, records, query, tab, projects, router, setCurrentProject]);
  useEffect(() => setSelected(0), [query, tab]);
  useEffect(() => {
    if (selected >= rows.length) setSelected(0);
    selectedRow.current?.scrollIntoView({ block: "nearest" });
  }, [selected, rows.length]);
  if (!isOpen) return null;
  return (
    <dialog
      ref={dialog}
      aria-label="Global search"
      className="global-search-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setSelected((value) =>
            rows.length
              ? (value + (event.key === "ArrowDown" ? 1 : rows.length - 1)) %
                rows.length
              : 0,
          );
        } else if (
          event.key === "Enter" &&
          event.target === input.current &&
          rows[selected]
        ) {
          event.preventDefault();
          rows[selected].run();
        }
      }}
    >
      <div className="global-search-top">
        {searching ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <Search size={18} />
        )}
        <input
          ref={input}
          aria-label="Search chats and workspace"
          placeholder="Search…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={true}
          aria-controls={listId}
          aria-activedescendant={
            rows[selected] ? `${listId}-${selected}` : undefined
          }
        />
        <div className="global-search-tabs" aria-label="Search category">
          {(["all", "chats", "files"] as Tab[]).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Close search"
          className="workspace-icon-button"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      <div
        id={listId}
        role="listbox"
        aria-label="Search results"
        className="global-search-results"
      >
        {(chatError || searchError) && (
          <p role="status" className="global-search-notice">
            {chatError || searchError}
          </p>
        )}
        {loadingChats && (
          <p role="status" className="global-search-notice">
            Loading chats…
          </p>
        )}
        {!loadingChats && !searching && !rows.length && (
          <p className="global-search-empty">
            {query
              ? "No results found."
              : "Your chats and projects will appear here."}
          </p>
        )}
        {rows.map((row, index) => {
          const Icon = row.icon;
          return (
            <div key={row.id}>
              {(index === 0 || rows[index - 1].group !== row.group) && (
                <p className="global-search-group">{row.group}</p>
              )}
              <button
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={selected === index}
                ref={selected === index ? selectedRow : undefined}
                className="global-search-result"
                onMouseMove={() => setSelected(index)}
                onClick={row.run}
              >
                <Icon size={17} />
                <span>
                  <strong>{row.title}</strong>
                  {row.subtitle && <small>{row.subtitle}</small>}
                </span>
                {row.date && <time>{row.date}</time>}
              </button>
            </div>
          );
        })}
      </div>
      <div className="global-search-bottom">
        <span>↑ ↓ to navigate · Enter to open</span>
        {query.trim() && (
          <button
            type="button"
            onClick={() => {
              router.push(`/search?q=${encodeURIComponent(query.trim())}`);
              onClose();
            }}
          >
            More results
            <ArrowUpRight size={13} />
          </button>
        )}
      </div>
    </dialog>
  );
}
