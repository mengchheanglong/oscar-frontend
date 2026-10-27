"use client";
import { useEffect, useState } from "react";
import { FileText, Download, Trash2, BookOpen, Brain } from "lucide-react";
import {
  chatAttachments,
  attachmentsChanged,
  type ChatAttachment,
} from "@/lib/chat-attachments";
import { apiRequest } from "@/lib/api";
import { Modal } from "@/components/ui/modal";

export function ChatAttachments({
  projectId,
  conversationId,
  onChanged,
  onCount,
}: {
  projectId: string;
  conversationId: string;
  onChanged?: () => void;
  onCount?: (count: number) => void;
}) {
  const [files, setFiles] = useState<ChatAttachment[]>([]),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [review, setReview] = useState<{
    file: ChatAttachment;
    text: string;
    partial: boolean;
    key: string;
  } | null>(null);
  const [removing, setRemoving] = useState<ChatAttachment | null>(null);
  const [linked, setLinked] = useState<
    { id: string; content: string; version: number }[]
  >([]);
  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const rows = await chatAttachments.list(projectId, conversationId);
        if (!disposed) {
          setFiles(rows);
          onCount?.(rows.length);
          setError(null);
        }
      } catch (e) {
        if (!disposed)
          setError(
            e instanceof Error ? e.message : "Could not load attachments.",
          );
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    void load();
    const refresh = () => void load();
    window.addEventListener("oscar:attachments-changed", refresh);
    const timer = setInterval(refresh, 10000);
    return () => {
      disposed = true;
      clearInterval(timer);
      window.removeEventListener("oscar:attachments-changed", refresh);
    };
  }, [projectId, conversationId, onCount]);
  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      attachmentsChanged();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not complete this action.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <p className="chat-context-caption">Attachments · private to this chat</p>
      {loading ? (
        <p className="chat-context-empty">Loading attachments…</p>
      ) : !files.length ? (
        <p className="chat-context-empty">
          Upload a file with + in the composer.
        </p>
      ) : null}
      {error && (
        <p role="alert" className="chat-context-notice">
          {error}
        </p>
      )}
      {files.map((file) => (
        <div key={file.id} className="chat-context-row">
          <FileText size={15} />
          <div className="min-w-0 flex-1">
            <span title={file.filename}>{file.filename}</span>
            <small>
              {Math.max(1, Math.round(file.sizeBytes / 1024))} KB · Ready
              {file.promotedDocumentId ? " · Added to project knowledge" : ""}
            </small>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className="workspace-icon-button"
                title="Download original"
                aria-label={`Download ${file.filename}`}
                disabled={busy}
                onClick={() =>
                  void act(() =>
                    chatAttachments.download(projectId, conversationId, file),
                  )
                }
              >
                <Download size={14} />
              </button>
              <button
                className="workspace-icon-button"
                title="Add to project knowledge"
                aria-label={`Share ${file.filename} with project`}
                disabled={busy || !!file.promotedDocumentId}
                onClick={() =>
                  void act(async () => {
                    if (
                      !window.confirm(
                        "Add a copy to project knowledge? Other project members and chats will be able to use it.",
                      )
                    )
                      return;
                    await chatAttachments.promote(
                      projectId,
                      conversationId,
                      file.id,
                    );
                  })
                }
              >
                <BookOpen size={14} />
              </button>
              <button
                className="workspace-icon-button"
                title="Draft a memory for review"
                aria-label={`Remember from ${file.filename}`}
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const draft = await chatAttachments.draft(
                      projectId,
                      conversationId,
                      file.id,
                    );
                    setReview({
                      file,
                      text: draft.content,
                      partial: draft.partial,
                      key: crypto.randomUUID(),
                    });
                  })
                }
              >
                <Brain size={14} />
              </button>
              <button
                className="workspace-icon-button"
                title="Remove attachment"
                aria-label={`Remove ${file.filename}`}
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const memories = await apiRequest<
                      { id: string; content: string; version: number }[]
                    >(
                      `/projects/${projectId}/ai/conversations/${conversationId}/attachments/${file.id}/memories`,
                    );
                    setLinked(memories);
                    setRemoving(file);
                  })
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
      {review && (
        <Modal label="Review memory" onClose={() => !busy && setReview(null)}>
          <div className="p-6 space-y-4 max-w-xl bg-background border border-border rounded-2xl">
            <h2 className="text-lg font-semibold">
              Remember from {review.file.filename}
            </h2>
            <p className="text-sm text-muted-foreground">
              Edit the facts worth keeping. Saving makes this private memory
              available in other chats in this project. The original file stays
              here.
            </p>
            {review.partial && (
              <p className="text-sm text-muted-foreground">
                Draft based on the first eight passages. Review against the
                original file.
              </p>
            )}
            <textarea
              aria-label="Memory to save"
              maxLength={2000}
              className="w-full min-h-40 rounded-xl border border-border bg-background p-3"
              value={review.text}
              onChange={(e) => setReview({ ...review, text: e.target.value })}
            />
            {error && <p role="alert">{error}</p>}
            <div className="flex gap-3">
              <button
                className="files-primary-button"
                disabled={busy || !review.text.trim()}
                onClick={() =>
                  void act(async () => {
                    await apiRequest(`/projects/${projectId}/ai/memories`, {
                      method: "POST",
                      body: JSON.stringify({
                        kind: "CONTEXT",
                        content: review.text,
                        userConfirmed: true,
                        idempotencyKey: review.key,
                        sourceAttachmentId: review.file.id,
                      }),
                    });
                    setReview(null);
                  })
                }
              >
                Save reviewed memory
              </button>
              <button disabled={busy} onClick={() => setReview(null)}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
      {removing && (
        <Modal
          label="Remove attachment"
          onClose={() => !busy && setRemoving(null)}
        >
          <div className="p-6 space-y-4 max-w-xl bg-background border border-border rounded-2xl">
            <h2 className="text-lg font-semibold">
              Remove {removing.filename}?
            </h2>
            <p className="text-sm text-muted-foreground">
              This stops future file access. Earlier assistant replies will be
              excluded from context and the chat summary cleared. Saved memories
              and any project knowledge copy are separate.
            </p>
            {linked.length > 0 && (
              <>
                <p className="text-sm">Memories saved from this file:</p>
                {linked.map((m) => (
                  <div
                    key={m.id}
                    className="border border-border rounded-xl p-3 text-sm"
                  >
                    <p>{m.content}</p>
                    <button
                      disabled={busy}
                      className="mt-2 text-muted-foreground"
                      onClick={() =>
                        void act(async () => {
                          await apiRequest(
                            `/projects/${projectId}/ai/memories/${m.id}?version=${m.version}`,
                            { method: "DELETE" },
                          );
                          setLinked((old) => old.filter((x) => x.id !== m.id));
                        })
                      }
                    >
                      Delete this memory
                    </button>
                  </div>
                ))}
              </>
            )}
            {error && <p role="alert">{error}</p>}
            <div className="flex gap-3">
              <button
                className="files-primary-button"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await chatAttachments.remove(
                      projectId,
                      conversationId,
                      removing.id,
                    );
                    setRemoving(null);
                    onChanged?.();
                  })
                }
              >
                Remove file{linked.length ? " and keep listed memories" : ""}
              </button>
              <button disabled={busy} onClick={() => setRemoving(null)}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
