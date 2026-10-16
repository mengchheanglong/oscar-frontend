"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Search, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";

interface Chat {
  id: string;
  projectId: string;
  title: string;
  updatedAt: string;
}
function groupDate(value: string) {
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

// Ctrl/Cmd+K searches private chat history. Project records live in /search.
export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { projects, setCurrentProject } = useAuth(),
    router = useRouter();
  const [query, setQuery] = useState(""),
    [chats, setChats] = useState<Chat[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
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
    setSelected(0);
    const node = dialog.current,
      previous = document.activeElement as HTMLElement | null;
    if (!node) return;
    if (!node.open) node.showModal();
    input.current?.focus();
    return () => {
      node.close();
      if (previous?.isConnected && previous.getClientRects().length)
        previous.focus();
      else
        document
          .querySelector<HTMLButtonElement>('[aria-label="Open navigation"]')
          ?.focus();
    };
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setChats([]);
    setError("");
    Promise.allSettled(
      projects.map((project) => api.ai.listConversations(project.id)),
    ).then((results) => {
      if (!active) return;
      setChats(
        results
          .flatMap((result) =>
            result.status === "fulfilled" ? (result.value as Chat[]) : [],
          )
          .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
      );
      if (results.some((result) => result.status === "rejected"))
        setError("Some chats could not be loaded. Close search and try again.");
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [isOpen, projects]);
  const filtered = useMemo(
    () =>
      chats.filter((chat) =>
        chat.title.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [chats, query],
  );
  useEffect(() => setSelected(0), [query]);
  useEffect(() => {
    if (selected >= filtered.length) setSelected(0);
    selectedRow.current?.scrollIntoView({ block: "nearest" });
  }, [selected, filtered.length]);
  const open = (chat: Chat) => {
    const project = projects.find((project) => project.id === chat.projectId);
    if (!project) return;
    setCurrentProject(project);
    router.push(`/assistant?conversation=${chat.id}`);
    onClose();
  };
  if (!isOpen) return null;
  return (
    <dialog
      ref={dialog}
      aria-label="Search chats"
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
            filtered.length
              ? (value +
                  (event.key === "ArrowDown" ? 1 : filtered.length - 1)) %
                filtered.length
              : 0,
          );
        } else if (
          event.key === "Enter" &&
          event.target === input.current &&
          filtered[selected]
        ) {
          event.preventDefault();
          open(filtered[selected]);
        }
      }}
    >
      <div className="global-search-top">
        <Search size={18} />
        <input
          ref={input}
          aria-label="Search conversations"
          placeholder="Search chats…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={true}
          aria-controls={listId}
          aria-activedescendant={
            filtered[selected] ? `${listId}-${selected}` : undefined
          }
        />
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
        aria-label="Conversations"
        className="global-search-results"
      >
        {error && (
          <p role="status" className="global-search-notice">
            {error}
          </p>
        )}
        {loading && (
          <p role="status" className="global-search-notice">
            Loading chats…
          </p>
        )}
        {!loading && !filtered.length && (
          <p className="global-search-empty">
            {query
              ? "No matching chats."
              : "Your conversations will appear here."}
          </p>
        )}
        {filtered.map((chat, index) => {
          const group = query ? "Chats" : groupDate(chat.updatedAt),
            previousGroup = index
              ? query
                ? "Chats"
                : groupDate(filtered[index - 1].updatedAt)
              : null;
          return (
            <div key={chat.id}>
              {group !== previousGroup && (
                <p className="global-search-group">{group}</p>
              )}
              <button
                type="button"
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected === index}
                ref={selected === index ? selectedRow : undefined}
                onMouseMove={() => setSelected(index)}
                onClick={() => open(chat)}
                className="global-search-result"
              >
                <MessageCircle size={17} />
                <span>
                  <strong>{chat.title || "Untitled chat"}</strong>
                  {query && (
                    <small>
                      {
                        projects.find(
                          (project) => project.id === chat.projectId,
                        )?.name
                      }
                    </small>
                  )}
                </span>
                <time>
                  {new Date(chat.updatedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </button>
            </div>
          );
        })}
      </div>
      <div className="global-search-bottom">
        <span>↑ ↓ to navigate · Enter to open · Esc to close</span>
      </div>
    </dialog>
  );
}
