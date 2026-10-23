"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Box,
  Blocks,
  FileText,
  ChevronDown,
  X,
  Bot,
  Code2,
  Paperclip,
  GitBranch,
} from "lucide-react";
import { skillsApi, type Skill } from "@/lib/skills-api";
import {
  platformHandoffs,
  type PlatformHandoff,
} from "@/lib/platform-handoffs";
import type { AgentRun } from "@/lib/agent-runs";
import {
  recordedChatContext,
  type ContextMessage,
  type ContextCitation,
} from "@/lib/chat-context";
import { Modal } from "@/components/ui/modal";

function ContextSection({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="chat-context-section" open>
      <summary>
        {icon}
        <span>{title}</span>
        <small>{count}</small>
        <ChevronDown size={14} />
      </summary>
      <div className="chat-context-items">{children}</div>
    </details>
  );
}
const pluginIcons = {
  hermes: Bot,
  t3: Code2,
  paperclip: Paperclip,
  github: GitBranch,
};
export function ChatContextRail({
  projectId,
  conversationId,
  messages,
  runs,
  runError,
  busy,
  onInspect,
  onClose,
  wide,
}: {
  projectId?: string;
  conversationId?: string;
  messages: ContextMessage[];
  runs: AgentRun[];
  runError: string | null;
  busy: boolean;
  onInspect: (citation: ContextCitation) => void;
  onClose: () => void;
  wide: boolean;
}) {
  const scope = `${projectId}:${conversationId}`;
  const [data, setData] = useState<{
    scope: string;
    skills: Skill[];
    handoffs: PlatformHandoff[];
    loading: boolean;
    skillError: boolean;
    pluginError: boolean;
  }>({
    scope: "",
    skills: [],
    handoffs: [],
    loading: true,
    skillError: false,
    pluginError: false,
  });
  useEffect(() => {
    if (!projectId || !conversationId) return;
    let disposed = false,
      timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const [skills, handoffs] = await Promise.allSettled([
        skillsApi.attached(projectId, conversationId),
        platformHandoffs.list(projectId, conversationId),
      ]);
      if (disposed) return;
      setData((old) => ({
        scope,
        loading: false,
        skills:
          skills.status === "fulfilled"
            ? skills.value
            : old.scope === scope
              ? old.skills
              : [],
        handoffs:
          handoffs.status === "fulfilled"
            ? handoffs.value
            : old.scope === scope
              ? old.handoffs
              : [],
        skillError: skills.status === "rejected",
        pluginError: handoffs.status === "rejected",
      }));
      timer = setTimeout(() => void poll(), busy ? 2000 : 10000);
    };
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [scope, projectId, conversationId, busy]);
  const loaded = data.scope === scope && !!conversationId;
  const context = useMemo(
    () =>
      projectId && conversationId
        ? recordedChatContext(
            projectId,
            conversationId,
            messages,
            runs,
            loaded ? data.handoffs : [],
          )
        : { files: [], plugins: [] },
    [projectId, conversationId, messages, runs, loaded, data.handoffs],
  );
  const skills = loaded ? data.skills : [];
  const pluginError =
    !!conversationId && (!!runError || (loaded && data.pluginError));
  const content = (
    <aside
      id="chat-context-rail"
      className="chat-context-rail"
      aria-label="Chat context"
    >
      <header>
        <span>Chat context</span>
        <button
          className="workspace-icon-button"
          type="button"
          onClick={onClose}
          aria-label="Close chat context"
        >
          <X size={16} />
        </button>
      </header>
      <div className="chat-context-scroll">
        {!conversationId && (
          <p className="chat-context-intro">
            Resources used in this conversation will appear here.
          </p>
        )}
        <ContextSection
          title="Skills"
          count={skills.length}
          icon={<Box size={16} />}
        >
          <p className="chat-context-caption">Available to this chat</p>
          {loaded && data.skillError && (
            <p role="status" className="chat-context-notice">
              Couldn’t refresh skills. Retrying…
            </p>
          )}
          {!loaded && conversationId ? (
            <p className="chat-context-empty">Loading skills…</p>
          ) : skills.length ? (
            skills.map((s) => (
              <div className="chat-context-row" key={s.id}>
                <Box size={15} />
                <div>
                  <span>{s.name}</span>
                  <small>
                    /{s.slug} · v{s.version}
                  </small>
                </div>
              </div>
            ))
          ) : !data.skillError || !loaded ? (
            <p className="chat-context-empty">No skills attached</p>
          ) : null}
        </ContextSection>
        <ContextSection
          title="Plugins"
          count={context.plugins.length}
          icon={<Blocks size={16} />}
        >
          <p className="chat-context-caption">Recorded in this conversation</p>
          {pluginError && (
            <p role="status" className="chat-context-notice">
              Some plugin activity couldn’t refresh.
            </p>
          )}
          {context.plugins.map((p) => {
            const Icon =
              pluginIcons[p.id as keyof typeof pluginIcons] || Blocks;
            return (
              <div key={p.id} className="chat-context-row">
                <Icon size={15} />
                <div>
                  <span>{p.name}</span>
                  <small>
                    {p.status}
                    {p.count > 1 ? ` · ${p.count} runs` : ""}
                  </small>
                </div>
              </div>
            );
          })}
          {!context.plugins.length && (
            <p className="chat-context-empty">
              {conversationId && !loaded
                ? "Loading activity…"
                : pluginError
                  ? "Activity unavailable"
                  : "No recorded plugin use"}
            </p>
          )}
        </ContextSection>
        <ContextSection
          title="Files"
          count={context.files.length}
          icon={<FileText size={16} />}
        >
          <p className="chat-context-caption">Cited or read in this chat</p>
          {context.files.map((f) => (
            <div className="chat-context-row" key={f.key}>
              <FileText size={15} />
              <div>
                {f.citation ? (
                  <button
                    type="button"
                    onClick={() => {
                      onInspect(f.citation!);
                      if (!wide) onClose();
                    }}
                    title={f.title}
                  >
                    {f.title}
                  </button>
                ) : (
                  <span title={f.title}>{f.title}</span>
                )}
                <small>
                  {f.kind}
                  {f.project ? ` · ${f.project}` : ""}
                </small>
                {f.location && f.location !== f.title && (
                  <small className="chat-context-path" title={f.location}>
                    {f.location}
                  </small>
                )}
              </div>
            </div>
          ))}
          {!context.files.length && (
            <p className="chat-context-empty">No files referenced yet</p>
          )}
        </ContextSection>
      </div>
    </aside>
  );
  return wide ? (
    content
  ) : (
    <Modal label="Chat context" placement="right" onClose={onClose}>
      {content}
    </Modal>
  );
}
