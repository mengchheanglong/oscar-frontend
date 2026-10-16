"use client";

import React, { useCallback, useLayoutEffect, useRef } from "react";
import { AlertCircle, ArrowUp, Filter, Loader2, X } from "lucide-react";
import { DropdownSelect } from "@/components/ui/dropdown-select";

interface ComposerProps {
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
  error: string | null;
  failedRequest: string | null;
  onDismissError: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function CopilotComposer({
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
  error,
  failedRequest,
  onDismissError,
  textareaRef,
}: ComposerProps) {
  const previousSending = useRef(sending);
  const resizeInput = useCallback(() => {
    const input = textareaRef.current;
    if (input) {
      input.style.height = "auto";
      input.style.height = `${Math.min(144, Math.max(48, input.scrollHeight))}px`;
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
    <footer className="shrink-0 bg-white px-3 pb-4 pt-3 sm:px-6 sm:pb-5">
      <div className="mx-auto max-w-3xl space-y-3">
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
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow focus-within:border-codex-accent/60 focus-within:ring-2 focus-within:ring-codex-accent/10 sm:p-4">
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
                if (!sending && !loading && value.trim()) onSend();
              }
            }}
            placeholder={
              sending
                ? "Draft your next question while Copilot works…"
                : "Ask about your project, or describe what you want to work on…"
            }
            rows={2}
            className="block max-h-36 min-h-[48px] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
          />
          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <label
                title={toolsHint}
                className="flex items-center gap-2 text-xs text-slate-600"
              >
                <input
                  type="checkbox"
                  aria-label="Use Hermes tools"
                  checked={useTools}
                  disabled={sending || (!toolsAvailable && !useTools)}
                  onChange={(e) => onUseToolsChange(e.target.checked)}
                />
                Use tools
              </label>
              <span className="text-[10px] text-slate-400">
                {useTools
                  ? "Hermes · changes require review"
                  : "General assistant"}
              </span>

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
            </div>
            <button
              type="button"
              onClick={onSend}
              disabled={!value.trim() || sending || loading}
              aria-label={sending ? "Generating answer" : "Send message"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-codex-accent text-white transition-colors hover:bg-codex-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-codex-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <div
          id="copilot-composer-help"
          className="flex flex-wrap justify-between gap-1 px-1 text-[10px] leading-relaxed text-slate-400"
        >
          <span>Check answers against their sources.</span>
          <span className="hidden sm:inline">
            Enter to send · Shift + Enter for a new line
          </span>
        </div>
      </div>
    </footer>
  );
}
