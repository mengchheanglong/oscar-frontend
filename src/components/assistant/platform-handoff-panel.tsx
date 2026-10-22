"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { platformsApi, type PlatformConnection } from "@/lib/platforms-api";
import {
  platformHandoffs,
  type PlatformHandoff,
} from "@/lib/platform-handoffs";
import { agentRuns } from "@/lib/agent-runs";

export type HandoffPlatform = "t3" | "paperclip" | "hermes";
const field =
  "mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50";
const names = { t3: "T3", paperclip: "Paperclip", hermes: "Hermes" };
const terminal = (run: PlatformHandoff) =>
  ["SUCCEEDED", "FAILED", "CANCELLED"].includes(run.status);
export function PlatformHandoffPanel({
  projectId,
  conversationId,
  platform,
  prompt,
  hermesAvailable,
  onClose,
  getConversation,
  onStarted,
  onResult,
}: {
  projectId?: string;
  conversationId?: string;
  platform: HandoffPlatform;
  prompt: string | null;
  hermesAvailable: boolean;
  onClose: () => void;
  getConversation: (prompt: string) => Promise<string>;
  onStarted: (id: string) => void;
  onResult: () => void;
}) {
  const label = names[platform];
  const [runs, setRuns] = useState<PlatformHandoff[]>([]);
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [connectionId, setConnectionId] = useState("");
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [target, setTarget] = useState("");
  const [models, setModels] = useState<
    Array<{ instanceId: string; model: string; label: string }>
  >([]);
  const [modelKey, setModelKey] = useState("");
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [agentId, setAgentId] = useState("");
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null),
    [workError, setWorkError] = useState<string | null>(null);
  const scope = `${projectId}:${conversationId}`,
    scopeRef = useRef(scope);
  scopeRef.current = scope;
  const resultCallback = useRef(onResult);
  resultCallback.current = onResult;
  const completed = useRef("");
  const request = useRef<{
    signature: string;
    key: string;
    conversationId?: string;
  }>();
  const load = useCallback(async () => {
    if (!projectId || !conversationId) return;
    const rows = await platformHandoffs.list(projectId, conversationId);
    if (scopeRef.current !== scope) return;
    setRuns(rows);
    setWorkError(null);
    const signature = rows.map((r) => r.assistantMessageId || "").join(",");
    if (signature !== completed.current) {
      completed.current = signature;
      resultCallback.current();
    }
  }, [projectId, conversationId, scope]);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    setRuns([]);
    setWorkError(null);
    completed.current = "";
    const poll = async () => {
      try {
        await load();
      } catch {
        if (alive)
          setWorkError(
            "Could not refresh delegated work. Try refreshing again.",
          );
      }
      if (alive) timer = setTimeout(poll, 5000);
    };
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [load]);
  useEffect(() => {
    if (prompt === null) return;
    setError(null);
    setConnectionId("");
    setConnections([]);
    if (platform === "hermes") {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    platformsApi
      .list()
      .then((result) => {
        if (!alive) return;
        const available = result.items.filter(
          (c) =>
            c.platformType === platform &&
            c.metadata?.[platform === "t3" ? "t3Access" : "paperclipAccess"] ===
              "supervised" &&
            (!c.projectId || c.projectId === projectId),
        );
        setConnections(available);
        setConnectionId(available[0]?.id || "");
      })
      .catch(() => {
        if (alive) setError(`Could not load ${label} connections.`);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [prompt, projectId, platform, label]);
  useEffect(() => {
    if (!connectionId || !projectId || platform === "hermes") return;
    let alive = true;
    setLoading(true);
    setProjects([]);
    setTarget("");
    setModels([]);
    setModelKey("");
    setAgents([]);
    setAgentId("");
    const fetchTargets = async () => {
      if (platform === "paperclip") {
        const result = await platformHandoffs.paperclipTargets(
          projectId,
          connectionId,
        );
        if (alive) {
          setProjects(result.projects);
          setAgents(result.agents);
          const preferred = connections.find((c) => c.id === connectionId)
            ?.metadata?.preferredAgentId;
          if (
            typeof preferred === "string" &&
            result.agents.some((a) => a.id === preferred)
          )
            setAgentId(preferred);
        }
      } else {
        const [rows, catalog] = await Promise.all([
          platformsApi.entities(connectionId),
          platformHandoffs.models(projectId, connectionId),
        ]);
        if (alive) {
          setProjects(
            rows
              .filter((r) => r.type === "workspace")
              .map((r) => ({ id: r.id, name: r.title })),
          );
          setModels(catalog);
        }
      }
    };
    void fetchTargets()
      .catch(() => {
        if (alive)
          setError(
            `Could not load ${label}. Check that it is running and authorized in Connections, then try again.`,
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [connectionId, projectId, platform, label, connections]);
  const ready =
    platform === "hermes"
      ? hermesAvailable
      : !!connectionId &&
        (platform === "t3" ? !!target && !!modelKey : !!agentId);
  async function start() {
    if (!projectId || !prompt || !ready) return;
    const model = models.find(
      (m) => JSON.stringify([m.instanceId, m.model]) === modelKey,
    );
    setBusy(true);
    setError(null);
    try {
      const signature = JSON.stringify([
        projectId,
        prompt,
        platform,
        connectionId,
        target,
        modelKey,
        agentId,
      ]);
      if (
        request.current?.signature !== signature ||
        (conversationId &&
          request.current?.conversationId &&
          request.current.conversationId !== conversationId)
      )
        request.current = { signature, key: crypto.randomUUID() };
      const pending = request.current;
      pending.conversationId ||=
        conversationId || (await getConversation(prompt));
      if (platform === "hermes")
        await agentRuns.create(
          projectId,
          prompt,
          pending.key,
          pending.conversationId,
        );
      else
        await platformHandoffs.create(projectId, {
          conversationId: pending.conversationId,
          connectionId,
          platformType: platform,
          remoteProjectId: target || undefined,
          remoteAgentId: platform === "paperclip" ? agentId : undefined,
          providerInstanceId: model?.instanceId,
          model: model?.model,
          prompt,
          idempotencyKey: pending.key,
        });
      onStarted(pending.conversationId);
      onClose();
      await load();
      request.current = undefined;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : `Could not send work to ${label}.`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function action(run: PlatformHandoff, name: "refresh" | "cancel") {
    setBusy(true);
    setWorkError(null);
    try {
      await platformHandoffs.action(run.projectId, run.id, name);
      await load();
    } catch (e) {
      setWorkError(
        e instanceof Error ? e.message : "Could not update delegated work.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {runs.length > 0 && (
        <div
          className="mx-auto mb-3 max-h-48 w-full max-w-3xl space-y-2 overflow-y-auto px-4"
          aria-label="Delegated work"
        >
          {runs.map((run) => (
            <section
              key={run.id}
              className="rounded-xl border border-border bg-card p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {names[run.platformType || "t3"]} · {run.status.toLowerCase()}
                </span>
                <div className="flex gap-3">
                  {run.threadId && (
                    <a
                      className="underline"
                      href={
                        run.platformType === "paperclip"
                          ? run.externalUrl || undefined
                          : `t3-thread://v1/${run.threadId}`
                      }
                    >
                      Open {names[run.platformType || "t3"]}
                    </a>
                  )}
                  {!terminal(run) && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => void action(run, "refresh")}
                      >
                        Refresh
                      </button>
                      <button
                        disabled={busy || run.status === "UNCERTAIN"}
                        onClick={() => void action(run, "cancel")}
                      >
                        Stop
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="mt-1 truncate text-muted-foreground">
                {run.prompt}
              </p>
              {run.notice && (
                <p className="mt-2 text-muted-foreground" role="status">
                  {run.notice}
                </p>
              )}
            </section>
          ))}
        </div>
      )}
      {workError && (
        <div
          className="mx-auto mb-2 max-w-3xl px-4 text-sm text-muted-foreground"
          role="alert"
        >
          {workError}{" "}
          <button
            className="underline"
            onClick={() => void load().catch(() => undefined)}
          >
            Refresh
          </button>
        </div>
      )}
      {prompt !== null && (
        <Modal label={`Send work to ${label}`} onClose={onClose} busy={busy}>
          <div className="space-y-4 rounded-2xl border border-border bg-background p-6">
            <h2 className="text-lg font-semibold">Send work to {label}</h2>
            <p className="text-sm text-muted-foreground">
              {platform === "hermes"
                ? "Hermes works with this project’s sources and chat context using its available tools. Proposed changes require review. OSCAR summarizes its result here."
                : platform === "paperclip"
                  ? "Paperclip creates a task for the selected agent using its configured execution policy. OSCAR follows the issue and returns the agent’s result here. Only this task text is shared."
                  : "T3 works in the selected checkout with approval required. OSCAR follows the result and reports back here. Only this task text is sent."}
            </p>
            <div className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl border border-border p-3 text-sm">
              {prompt}
            </div>
            {platform !== "hermes" && (
              <>
                <label className="block text-sm">
                  Connection
                  <select
                    className={field}
                    value={connectionId}
                    onChange={(e) => setConnectionId(e.target.value)}
                    disabled={busy}
                  >
                    <option value="">Choose a connection</option>
                    {connections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  {label} project {platform === "paperclip" ? "(optional)" : ""}
                  <select
                    className={field}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    disabled={busy || loading}
                  >
                    <option value="">
                      {loading
                        ? "Loading…"
                        : platform === "paperclip"
                          ? "Company workspace"
                          : "Choose a T3 project"}
                    </option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                {platform === "t3" ? (
                  <label className="block text-sm">
                    T3 model
                    <select
                      className={field}
                      value={modelKey}
                      onChange={(e) => setModelKey(e.target.value)}
                      disabled={busy || loading}
                    >
                      <option value="">Choose a model</option>
                      {models.map((m) => (
                        <option
                          key={JSON.stringify([m.instanceId, m.model])}
                          value={JSON.stringify([m.instanceId, m.model])}
                        >
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="block text-sm">
                    Paperclip agent
                    <select
                      className={field}
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                      disabled={busy || loading}
                    >
                      <option value="">Choose an agent</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {!connections.length && !loading && (
                  <p className="text-sm text-muted-foreground">
                    Enable {label} execution in{" "}
                    <Link className="underline" href="/platforms">
                      Connections
                    </Link>
                    .
                  </p>
                )}
              </>
            )}
            {platform === "hermes" && !hermesAvailable && (
              <p className="text-sm text-muted-foreground">
                Hermes is unavailable. Check Settings → Integrations.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-500">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button className={button} disabled={busy} onClick={onClose}>
                Cancel
              </button>
              <button
                className={button}
                disabled={busy || loading || !ready}
                onClick={() => void start()}
              >
                {busy ? "Sending…" : `Start ${label} work`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
