"use client";
import { useRef, useState } from "react";
import {
  Pencil,
  Pin,
  PinOff,
  Trash2,
  Ellipsis,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { FloatingMenu } from "@/components/workspace-overlays";
import { SidebarRename } from "@/components/sidebar-rename";
export interface NavigationChat {
  id: string;
  projectId: string;
  title: string;
  isPinned?: boolean;
}
export function ChatNavigationItem({
  chat,
  active,
  onSelect,
  onChanged,
  onDelete,
  disabled = false,
}: {
  chat: NavigationChat;
  active: boolean;
  onSelect: () => void;
  onChanged: (chat: NavigationChat) => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false),
    [rename, setRename] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function update(data: { title?: string; isPinned?: boolean }) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      onChanged(
        await api.assistant.updateConversation(chat.projectId, chat.id, data),
      );
      setRename(false);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not update chat.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="chat-nav-item">
      {rename ? (
        <SidebarRename
          value={chat.title}
          label="Chat name"
          maxLength={200}
          icon={chat.isPinned ? <Pin size={13} /> : undefined}
          onCancel={() => {
            setRename(false);
            button.current?.focus();
          }}
          onSave={async (title) => {
            const saved = await api.assistant.updateConversation(
              chat.projectId,
              chat.id,
              { title },
            );
            onChanged(saved);
            setRename(false);
          }}
        />
      ) : (
        <div className="chat-nav-row">
          <button
            type="button"
            aria-pressed={active}
            disabled={disabled || busy}
            onClick={onSelect}
            className="chat-nav-select"
          >
            {chat.isPinned && <Pin size={13} className="shrink-0" />}
            <span className="truncate">{chat.title || "Untitled chat"}</span>
          </button>
          <button
            ref={button}
            type="button"
            aria-label={`Chat menu for ${chat.title || "Untitled chat"}`}
            aria-expanded={menu}
            disabled={disabled || busy}
            onClick={() => setMenu((value) => !value)}
            className="project-mini-action"
          >
            <Ellipsis />
          </button>
        </div>
      )}
      {error && !rename && (
        <p role="alert" className="px-2 text-xs text-rose-400">
          {error}
        </p>
      )}
      {menu && (
        <FloatingMenu
          anchor={button}
          onClose={() => setMenu(false)}
          label="Chat actions"
        >
          <a
            role="menuitem"
            href={`/assistant?conversation=${encodeURIComponent(chat.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenu(false)}
          >
            <ExternalLink />
            Open new tab
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(false);
              setRename(true);
            }}
          >
            <Pencil />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(false);
              void update({ isPinned: !chat.isPinned });
            }}
          >
            {chat.isPinned ? <PinOff /> : <Pin />}
            {chat.isPinned ? "Unpin" : "Pin"}
          </button>
          <div className="workspace-menu-divider" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(false);
              onDelete();
            }}
          >
            <Trash2 />
            Delete chat
          </button>
        </FloatingMenu>
      )}
    </div>
  );
}
