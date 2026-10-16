"use client";
import { useRef, useState } from "react";
import { Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { WorkspaceDialog, FloatingMenu } from "@/components/workspace-overlays";
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
    [title, setTitle] = useState(chat.title),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function update(data: { title?: string; isPinned?: boolean }) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      onChanged(await api.ai.updateConversation(chat.projectId, chat.id, data));
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
          •••
        </button>
      </div>
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
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(false);
              setTitle(chat.title);
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
      <WorkspaceDialog
        open={rename}
        title="Rename chat"
        onClose={() => setRename(false)}
        busy={busy}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void update({ title: title.trim() });
          }}
        >
          <div className="workspace-dialog-body">
            <input
              autoFocus
              required
              maxLength={200}
              aria-label="Chat name"
              className="workspace-name-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            {error && (
              <p role="alert" className="workspace-form-error">
                {error}
              </p>
            )}
          </div>
          <div className="workspace-dialog-footer justify-end">
            <button
              type="submit"
              disabled={busy || !title.trim()}
              className="workspace-pill workspace-pill-primary"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </WorkspaceDialog>
    </div>
  );
}
