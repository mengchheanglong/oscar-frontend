"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { apiRequest, ApiError } from "@/lib/api";

type MemoryKind = "CONTEXT" | "PREFERENCE" | "LESSON";
interface Memory {
  id: string;
  kind: MemoryKind;
  content: string;
  version: number;
  sourceMessageId: string | null;
}
export interface MemoryDraft {
  content: string;
  sourceMessageId?: string;
}

export function SavedMemorySettings({
  projectId,
  projectLabel,
  draft,
  onSavingChange,
}: {
  projectId: string;
  projectLabel?: string;
  draft: MemoryDraft | null;
  onSavingChange?: (saving: boolean) => void;
}) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [kind, setKind] = useState<MemoryKind>("CONTEXT");
  const [content, setContent] = useState(draft?.content.slice(0, 2000) ?? "");
  const [sourceMessageId, setSourceMessageId] = useState(
    draft?.sourceMessageId,
  );
  const [editorOpen, setEditorOpen] = useState(!!draft);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const retryKey = useRef<string | null>(null);
  const base = `/projects/${projectId}/ai/memories`;

  useEffect(() => {
    let active = true;
    void apiRequest<Memory[]>(base)
      .then((items) => {
        if (active) setMemories(items);
      })
      .catch(() => {
        if (active)
          setError("Couldn’t load memory. Reload Settings to try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [base]);

  useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);

  function startEditor(memory?: Memory) {
    setEditing(memory ?? null);
    setContent(memory?.content ?? "");
    setKind(memory?.kind ?? "CONTEXT");
    setSourceMessageId(undefined);
    setEditorOpen(true);
    setDeleteId(null);
    setError(null);
    retryKey.current = null;
  }

  async function save() {
    if (!content.trim() || saving) return;
    setSaving(true);
    setError(null);
    if (!retryKey.current) retryKey.current = crypto.randomUUID();
    try {
      const saved = await apiRequest<Memory>(
        editing ? `${base}/${editing.id}` : base,
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({
            kind,
            content: content.trim(),
            userConfirmed: true,
            ...(editing
              ? { version: editing.version }
              : {
                  idempotencyKey: retryKey.current,
                  ...(sourceMessageId ? { sourceMessageId } : {}),
                }),
          }),
        },
      );
      setMemories((items) =>
        [saved, ...items.filter((item) => item.id !== saved.id)].slice(0, 100),
      );
      setEditorOpen(false);
      setEditing(null);
      retryKey.current = null;
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? "This memory changed. Reload Settings to load its current version."
          : "Couldn’t save memory. Your draft is still here; try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(memory: Memory) {
    setSaving(true);
    setError(null);
    try {
      await apiRequest(`${base}/${memory.id}?version=${memory.version}`, {
        method: "DELETE",
      });
      setMemories((items) => items.filter((item) => item.id !== memory.id));
      setDeleteId(null);
      if (editing?.id === memory.id) {
        setEditorOpen(false);
        setEditing(null);
      }
    } catch {
      setError(
        "Couldn’t remove memory. Reload Settings if this entry has changed.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Saved memory" className="personalization-memory">
      <div className="space-y-4 p-5">
        <p className="text-sm text-slate-500">
          Private to you in {projectLabel || "this project"}. Keep goals,
          preferences, and useful lessons for future conversations.
        </p>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {loading ? (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-slate-500"
          >
            <Loader2 className="h-4 w-4 animate-spin" /> Loading memory
          </p>
        ) : (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => startEditor()}
              className="flex items-center gap-2 text-sm font-medium text-codex-accent"
            >
              <Plus className="h-4 w-4" /> Add memory
            </button>
            {editorOpen && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void save();
                }}
                className="space-y-3 rounded-xl border border-slate-200 p-4"
              >
                <label className="block text-xs font-medium text-slate-600">
                  Memory type
                  <select
                    disabled={saving}
                    value={kind}
                    onChange={(event) => {
                      setKind(event.target.value as MemoryKind);
                      retryKey.current = null;
                    }}
                    className="mt-1 block w-full rounded-lg border border-slate-200 p-2 text-sm"
                  >
                    <option value="CONTEXT">Project context</option>
                    <option value="PREFERENCE">Working preference</option>
                    <option value="LESSON">Lesson from work</option>
                  </select>
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Review what the copilot should remember
                  <textarea
                    disabled={saving}
                    value={content}
                    maxLength={2000}
                    rows={5}
                    onChange={(event) => {
                      setContent(event.target.value);
                      retryKey.current = null;
                    }}
                    className="mt-1 block w-full resize-y rounded-lg border border-slate-200 p-3 text-sm font-normal"
                  />
                </label>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    {content.length}/2000
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setEditorOpen(false)}
                      className="rounded-lg px-3 py-2 text-sm text-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !content.trim()}
                      className="flex items-center gap-2 rounded-lg bg-codex-accent px-3 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />}{" "}
                      Confirm and save
                    </button>
                  </div>
                </div>
              </form>
            )}
            {memories.length === 0 && (
              <p className="py-3 text-sm text-slate-400">
                No saved memory yet. You can also select Remember on a copilot
                reply and review it here.
              </p>
            )}
            <ul className="space-y-3">
              {memories.map((memory) => (
                <li
                  key={memory.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      {memory.kind === "CONTEXT"
                        ? "Project context"
                        : memory.kind === "PREFERENCE"
                          ? "Working preference"
                          : "Lesson from work"}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => startEditor(memory)}
                        aria-label="Edit memory"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setDeleteId(memory.id)}
                        aria-label="Remove memory"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                    {memory.content}
                  </p>
                  {deleteId === memory.id && (
                    <div className="mt-3 flex items-center justify-end gap-3 text-xs">
                      <span className="mr-auto text-slate-500">
                        Remove from saved context?
                      </span>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setDeleteId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void remove(memory)}
                        className="font-medium text-red-600"
                      >
                        Confirm removal
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
