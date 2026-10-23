import type { AgentRun } from "./agent-runs";
import type { PlatformHandoff } from "./platform-handoffs";

export interface ContextCitation {
  revision: number;
  sourceId: string;
  sourceType: string;
  title: string;
  chunkId: string;
  locator?: string | null;
  projectKey?: string;
  projectName?: string;
}
export interface ContextMessage {
  id: string;
  conversationId: string;
  role: string;
  status: string;
  contextExcluded?: boolean;
  citations: ContextCitation[];
}
export interface ContextFile {
  key: string;
  title: string;
  location?: string;
  project?: string;
  kind: "Cited" | "Read by Hermes";
  citation?: ContextCitation;
}
export interface ContextPlugin {
  id: string;
  name: string;
  status: string;
  count: number;
}
const statuses: Record<string, string> = {
  QUEUED: "Queued",
  DISPATCHING: "Starting",
  RUNNING: "Running",
  WAITING: "Waiting",
  UNCERTAIN: "Needs checking",
  SUCCEEDED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};
/** Derive only from this conversation's canonical records; never from installed tools or prose. */
export function recordedChatContext(
  projectId: string,
  conversationId: string,
  messages: ContextMessage[],
  runs: AgentRun[],
  handoffs: PlatformHandoff[],
) {
  const visible = messages.filter(
    (m) => m.conversationId === conversationId && !m.contextExcluded,
  );
  const files = new Map<string, ContextFile>(),
    plugins = new Map<string, ContextPlugin>();
  const addPlugin = (id: string, name: string, status: string) => {
    const old = plugins.get(id);
    if (old) {
      old.count++;
      return;
    }
    plugins.set(id, { id, name, status, count: 1 });
  };
  const citations = visible
    .filter((m) => m.role === "assistant" && m.status === "COMPLETED")
    .flatMap((m) => m.citations || []);
  for (const c of citations) {
    if (["DOCUMENT", "LOCAL_FILE", "GITHUB_CODE"].includes(c.sourceType)) {
      const key = `${c.projectKey || ""}:${c.sourceType}:${c.sourceId}`;
      if (!files.has(key))
        files.set(key, {
          key,
          title: c.title,
          location: c.locator || undefined,
          project: c.projectName || c.projectKey,
          kind: "Cited",
          citation: c,
        });
    }
  }
  const scopedRuns = runs
    .filter(
      (r) => r.projectId === projectId && r.conversationId === conversationId,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  for (const r of scopedRuns) {
    addPlugin("hermes", "Hermes Agent", statuses[r.status] || "Recorded");
    const answer = visible.find((m) => m.id === r.assistantMessageId);
    if (!answer || answer.status !== "COMPLETED") continue;
    for (const e of r.evidence || []) {
      // Only these citations are produced by successful local-folder file reads.
      // Ordinary retrieval evidence may be a task or decision, so never guess its type.
      if (!/^(local|stored):/.test(e.chunkId)) continue;
      const key = `${projectId}:read:${e.sourceId}:${e.locator || e.title}`;
      if (!files.has(key))
        files.set(key, {
          key,
          title: e.title,
          location: e.locator,
          kind: "Read by Hermes",
        });
    }
  }
  for (const r of handoffs
    .filter(
      (r) => r.projectId === projectId && r.conversationId === conversationId,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
    if (r.platformType === "t3")
      addPlugin("t3", "T3 Code", statuses[r.status] || "Recorded");
    if (r.platformType === "paperclip")
      addPlugin("paperclip", "Paperclip", statuses[r.status] || "Recorded");
  }
  if (citations.some((c) => c.sourceType.startsWith("GITHUB_")))
    addPlugin("github", "GitHub", "Sources cited");
  return {
    files: Array.from(files.values()),
    plugins: Array.from(plugins.values()),
  };
}
