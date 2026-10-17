"use client";

import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { WorkspaceIcon } from "@/components/workspace-icons";
import { AlertCircle, Filter, Loader2, X } from "lucide-react";
import { DropdownSelect } from "@/components/ui/dropdown-select";

interface ComposerProps {
  projectId?: string;
  projectName?: string;
  onProjectFiles?: () => void;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  useTools: boolean;
  onUseToolsChange: (value: boolean) => void;
  toolsAvailable: boolean;
  toolsHint: string;
  source?: string;
  onSourceChange?: (value: string) => void;
  sources?: { value: string; label: string; icon?: React.ElementType }[];
  sending: boolean;
  loading: boolean;
  workNotice?: string | null;
  error: string | null;
  failedRequest: string | null;
  onDismissError: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function CopilotComposer({
  projectId,
  projectName,
  onProjectFiles,
  value,
  onChange,
  onSend,
  useTools,
  onUseToolsChange,
  toolsAvailable,
  toolsHint,
  source,
  onSourceChange,
  sources,
  sending,
  loading,
  workNotice,
  error,
  failedRequest,
  onDismissError,
  textareaRef,
}: ComposerProps) {
  const [attachOpen, setAttachOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadRequest = useRef(0);
  useEffect(() => {
    uploadRequest.current++;
    setUploadNotice(null);
    setUploading(false);
    setAttachOpen(false);
  }, [projectId]);
  useEffect(() => {
    if (!attachOpen) return;
    const close = (event: PointerEvent) => {
      if (!attachRef.current?.contains(event.target as Node))
        setAttachOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAttachOpen(false);
        attachRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [attachOpen]);
  const uploadFiles = async (files: File[]) => {
    if (!files.length || uploading) return;
    if (!projectId) {
      setUploadNotice("Choose a project before adding files.");
      return;
    }
    const request = ++uploadRequest.current,
      targetProject = projectId;
    setAttachOpen(false);
    setUploading(true);
    setUploadNotice(null);
    let completed = 0;
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("title", file.name);
        await api.documents.upload(targetProject, form);
        completed++;
      }
      if (request === uploadRequest.current)
        setUploadNotice(
          `${completed} ${completed === 1 ? "file" : "files"} saved to project Files. Processing may take a moment.`,
        );
    } catch (error) {
      if (request === uploadRequest.current)
        setUploadNotice(
          `${completed ? `${completed} saved. ` : ""}${error instanceof Error ? error.message : "Could not upload files."}`,
        );
    } finally {
      if (request === uploadRequest.current) setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };
  const previousSending = useRef(sending);
  const resizeInput = useCallback(() => {
    const input = textareaRef.current;
    if (input) {
      input.style.height = "auto";
      input.style.height = `${Math.min(160, Math.max(32, input.scrollHeight))}px`;
    }
  }, [textareaRef]);

  useLayoutEffect(resizeInput, [value, resizeInput]);
  useLayoutEffect(() => {
    const input = textareaRef.current;
    if (!input) return;
    let width = input.clientWidth;
    const observer = new ResizeObserver(() => {
      if (input.clientWidth !== width) {
        width = input.clientWidth;
        resizeInput();
      }
    });
    observer.observe(input);
    return () => observer.disconnect();
  }, [textareaRef, resizeInput]);

  useLayoutEffect(() => {
    if (previousSending.current && !sending)
      textareaRef.current?.focus({ preventScroll: true });
    previousSending.current = sending;
  }, [sending, textareaRef]);

  return (
    <footer className="chat-composer">
      <div className="chat-composer-inner space-y-3">
        {workNotice && (
          <div role="status" className="chat-work-notice">
            <AlertCircle aria-hidden="true" />
            <span>{workNotice}</span>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-xs text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Couldn’t send your message</p>
              <p className="mt-1 break-words leading-relaxed">{error}</p>
              <p className="mt-1 text-rose-600">
                {value.trim() === failedRequest
                  ? "Your request is kept below. Edit it or send again."
                  : "Your next draft is kept below. You can review the failed request here."}
              </p>
              {failedRequest && value.trim() !== failedRequest && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium">
                    View failed request
                  </summary>
                  <p className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white/70 p-2">
                    {failedRequest}
                  </p>
                </details>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss send error"
              onClick={onDismissError}
              className="rounded p-1 hover:bg-rose-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div
          className="chat-composer-box"
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("Files"))
              event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            void uploadFiles(Array.from(event.dataTransfer.files));
          }}
        >
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            aria-label="Upload project files"
            onChange={(event) =>
              void uploadFiles(Array.from(event.target.files || []))
            }
          />
          <textarea
            ref={textareaRef}
            aria-label="Message AI Copilot"
            aria-describedby="copilot-composer-help"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                event.keyCode !== 229
              ) {
                event.preventDefault();
                if (!sending && !loading && !uploading && value.trim())
                  onSend();
              }
            }}
            placeholder={
              sending
                ? "Draft your next question while Copilot works…"
                : "Ask anything"
            }
            rows={1}
            className="block max-h-36 min-h-[48px] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
          />
          {uploadNotice && (
            <p role="status" className="py-2 text-xs text-slate-400">
              {uploadNotice}
            </p>
          )}
          <div className="chat-composer-actions">
            <div ref={attachRef} className="relative">
              <button
                type="button"
                aria-label="Attach files"
                aria-expanded={attachOpen}
                disabled={uploading || sending}
                onClick={() => setAttachOpen((value) => !value)}
                className="workspace-icon-button"
              >
                {uploading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <WorkspaceIcon name="plus" />
                )}
              </button>
              {attachOpen && (
                <div
                  className="workspace-attachment-menu"
                  aria-label="Add context"
                >
                  <button
                    type="button"
                    disabled={!projectId}
                    onClick={() => fileInput.current?.click()}
                  >
                    <WorkspaceIcon name="plus" className="h-5 w-5" />
                    Upload project files
                  </button>
                  <Link href="/documents">
                    <WorkspaceIcon name="files" className="h-5 w-5" />
                    Browse project files
                  </Link>
                  {!projectId && (
                    <p className="px-3 pb-2 text-xs text-slate-400">
                      Choose a project to upload files.
                    </p>
                  )}
                </div>
              )}
            </div>
            {!projectId && (
              <span
                className="composer-project-pill"
                title="Context from all projects you can access"
              >
                <WorkspaceIcon name="overview" />
                <span>All projects</span>
              </span>
            )}
            {projectName && onProjectFiles && (
              <button
                type="button"
                onClick={onProjectFiles}
                className="composer-project-pill"
                aria-label="Open project files"
              >
                <WorkspaceIcon name="folder" />
                <span>{projectName}</span>
              </button>
            )}
            <div className="chat-composer-controls">
              <DropdownSelect
                value={useTools ? "HERMES" : "ASSISTANT"}
                onChange={(value) => onUseToolsChange(value === "HERMES")}
                direction="up"
                align="right"
                disabled={sending}
                triggerClassName="chat-mode-trigger"
                menuWidth="w-72 max-w-[calc(100vw-2rem)]"
                options={[
                  {
                    value: "ASSISTANT",
                    label: "Assistant",
                    desc: "Answers grounded in your project sources",
                  },
                  {
                    value: "HERMES",
                    label: "Hermes",
                    desc: toolsAvailable
                      ? "Tools and multi-step work. Changes require review."
                      : toolsHint,
                    disabled: !toolsAvailable && !useTools,
                  },
                ]}
              />
              {sources && onSourceChange && (
                <DropdownSelect
                  value={source || ""}
                  onChange={onSourceChange}
                  direction="up"
                  disabled={sending}
                  menuWidth="w-60 max-w-[calc(100vw-2rem)]"
                  triggerClassName="h-9 rounded-xl border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 text-xs px-2.5 shadow-2xs hover:border-slate-300"
                  triggerTextClassName="font-medium text-slate-700 text-xs"
                  options={sources.map((item) => {
                    const Icon = item.icon || Filter;
                    return {
                      value: item.value,
                      label: item.label,
                      icon: Icon ? (
                        <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : undefined,
                    };
                  })}
                />
              )}
              <button
                type="button"
                onClick={onSend}
                disabled={!value.trim() || sending || loading || uploading}
                aria-label={sending ? "Generating answer" : "Send message"}
                className="chat-send"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <WorkspaceIcon name="send" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
