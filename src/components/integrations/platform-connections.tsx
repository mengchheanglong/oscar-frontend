"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { GoalSelect } from "@/components/goal-select";
import {
  platformsApi,
  PlatformConnection,
  PlatformRecord,
  ExternalLink,
  PlatformOverview,
} from "@/lib/platforms-api";
import {
  Plus,
  RefreshCw,
  ExternalLink as LinkIcon,
  Trash2,
} from "lucide-react";

export function PlatformConnections() {
  const { currentProject, projects } = useAuth();
  const { showToast } = useToast();
  const [connections, setConnections] = useState<PlatformConnection[]>([]),
    [links, setLinks] = useState<ExternalLink[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [editing, setEditing] = useState<PlatformConnection | null>(null);
  const [t3Access, setT3Access] = useState("read");
  const [paperclipAccess, setPaperclipAccess] = useState("read");
  const [adding, setAdding] = useState(false),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(""),
    [type, setType] = useState("paperclip"),
    [url, setUrl] = useState(""),
    [token, setToken] = useState(""),
    [company, setCompany] = useState("");
  const [overview, setOverview] = useState<PlatformOverview | null>(null),
    [records, setRecords] = useState<Record<string, PlatformRecord[]>>({}),
    [selected, setSelected] = useState<{
      connectionId: string;
      record: PlatformRecord;
    } | null>(null),
    [projectId, setProjectId] = useState(""),
    [goalId, setGoalId] = useState("");
  const report = (e: unknown) =>
    showToast(
      e instanceof Error ? e.message : "The action could not complete.",
      "error",
    );
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, mappings] = await Promise.all([
        platformsApi.list(currentProject?.id),
        platformsApi.links(currentProject?.id),
      ]);
      setConnections(list.items);
      setLinks(mappings.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Platforms could not load.");
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);
  useEffect(() => {
    setOverview(null);
    setRecords({});
    void load();
  }, [load]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = {
        name,
        baseUrl: url,
        authToken: type === "paperclip" && token ? token : undefined,
        metadata:
          type === "paperclip"
            ? { companyId: company, paperclipAccess }
            : { t3Access },
      };
      if (editing) await platformsApi.update(editing.id, data);
      else
        await platformsApi.create({
          ...data,
          platformType: type,
          projectId: currentProject?.id,
        });
      setEditing(null);
      setAdding(false);
      setToken("");
      setName("");
      setUrl("");
      setCompany("");
      await load();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function inspect(connection: PlatformConnection) {
    setBusy(true);
    try {
      setRecords((previous) => ({ ...previous, [connection.id]: [] }));
      const items = await platformsApi.entities(connection.id);
      setRecords((previous) => ({ ...previous, [connection.id]: items }));
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setBusy(true);
    try {
      setOverview(await platformsApi.overview(currentProject?.id));
      await load();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function connect(id: string) {
    setBusy(true);
    try {
      const result = await platformsApi.authorize(id);
      window.location.assign(result.authorizationUrl);
    } catch (e) {
      report(e);
      setBusy(false);
    }
  }
  async function saveLink(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await platformsApi.link({
        connectionId: selected.connectionId,
        externalId: selected.record.id,
        externalEntityType: selected.record.type,
        projectId: projectId || undefined,
        goalId: goalId || undefined,
      });
      setSelected(null);
      await load();
      showToast("Record linked", "success");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  const button =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50";
  const field =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";
  return (
    <section
      aria-label="Platform connections"
      className="mx-auto w-full space-y-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Agent connections</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect Paperclip and T3 to OSCAR. Review delegated work in Tasks.
            Connections use read-only access by default. Enable chat handoffs on
            a connection to send work.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={button}
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RefreshCw size={16} />
            Refresh status
          </button>
          <button
            className={button}
            onClick={() => {
              setEditing(null);
              setName("");
              setUrl("");
              setToken("");
              setCompany("");
              setT3Access("read");
              setPaperclipAccess("read");
              setAdding(!adding);
            }}
          >
            <Plus size={16} />
            Add connection
          </button>
        </div>
      </header>
      {adding && (
        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-border bg-card p-5"
        >
          <h2 className="font-semibold">
            {editing ? "Edit connection" : "Connect a platform"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              Name
              <input
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={255}
              />
            </label>
            <label className="space-y-2 text-sm">
              Platform
              <select
                disabled={!!editing}
                className={field}
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setToken("");
                }}
              >
                <option value="paperclip">Paperclip</option>
                <option value="t3">T3 Code</option>
              </select>
            </label>
          </div>
          <label className="block space-y-2 text-sm">
            Installation URL
            <input
              className={field}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                type === "paperclip"
                  ? "http://localhost:3100"
                  : "https://your-t3-host"
              }
              required
            />
          </label>
          {type === "paperclip" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm sm:col-span-2">
                Paperclip access
                <select
                  className={field}
                  value={paperclipAccess}
                  onChange={(e) => setPaperclipAccess(e.target.value)}
                >
                  <option value="read">Read activity</option>
                  <option value="supervised">Assign work from chat</option>
                </select>
                <span className="block text-muted-foreground">
                  Assignment creates issues for the chosen agent. Paperclip
                  controls its execution policy. Stopping active runs requires a
                  board-authorized connection.
                </span>
              </label>
              <label className="space-y-2 text-sm">
                Company ID
                <input
                  className={field}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                />
              </label>
              <label className="space-y-2 text-sm">
                Bearer token
                <input
                  type="password"
                  autoComplete="off"
                  className={field}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={
                    editing ? "Leave blank to keep the saved token" : undefined
                  }
                  required={!editing}
                />
              </label>
            </div>
          ) : (
            <label className="block text-sm">
              T3 access
              <select
                className={field}
                value={t3Access}
                onChange={(e) => setT3Access(e.target.value)}
              >
                <option value="read">Read activity</option>
                <option value="supervised">Supervised work</option>
              </select>
              <span className="mt-2 block text-muted-foreground">
                Save, then Authorize in T3. Supervised work allows OSCAR to
                start and stop tasks; approvals and input stay in T3. Changing
                access requires authorization again.
              </span>
            </label>
          )}
          <p className="text-sm text-muted-foreground">
            {currentProject
              ? `Linked to ${currentProject.name}. Only your account can use these credentials.`
              : "This connection is private to your account."}
          </p>
          <div className="flex gap-2">
            <button className={button} disabled={busy} type="submit">
              {busy ? "Saving…" : "Save connection"}
            </button>
            <button
              className={button}
              type="button"
              onClick={() => {
                setAdding(false);
                setEditing(null);
                setToken("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {overview && (
        <section
          aria-live="polite"
          className="rounded-2xl border border-border bg-card p-5"
        >
          <h2 className="font-semibold">Live activity</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
            {overview.oscarAnswer}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Checked {new Date(overview.generatedAt).toLocaleString()}
          </p>
        </section>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-border p-4">
          <p>{error}</p>
          <button className={button} onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading connections…
        </p>
      ) : !connections.length ? (
        <section className="rounded-2xl border border-border p-8 text-center">
          <h2 className="font-medium">No platforms connected</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your Paperclip or T3 installation to see its accessible activity
            here.
          </p>
        </section>
      ) : (
        connections.map((connection) => (
          <section
            key={connection.id}
            className="space-y-4 rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{connection.name}</h2>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  {connection.platformType === "t3" ? "T3 Code" : "Paperclip"} ·{" "}
                  {connection.baseUrl}
                </p>
                <p className="mt-2 text-sm">
                  {connection.status.toLowerCase().replaceAll("_", " ")}
                </p>
                {connection.healthError && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {connection.healthError}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => {
                    setEditing(connection);
                    setPaperclipAccess(
                      connection.metadata?.paperclipAccess === "supervised"
                        ? "supervised"
                        : "read",
                    );
                    setT3Access(
                      connection.metadata?.t3Access === "supervised"
                        ? "supervised"
                        : "read",
                    );
                    setAdding(true);
                    setName(connection.name);
                    setType(connection.platformType);
                    setUrl(connection.baseUrl);
                    setCompany(String(connection.metadata?.companyId || ""));
                    setToken("");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Edit
                </button>
                {connection.platformType === "t3" && (
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() => void connect(connection.id)}
                  >
                    Authorize
                  </button>
                )}
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void inspect(connection)}
                >
                  View activity
                </button>
                <button
                  className={button}
                  aria-label={`Remove ${connection.name}`}
                  disabled={busy}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Remove ${connection.name}? Its local record links will also be removed.`,
                      )
                    )
                      return;
                    try {
                      await platformsApi.remove(connection.id);
                      await load();
                    } catch (e) {
                      report(e);
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {records[connection.id] && (
              <div className="divide-y divide-border">
                {records[connection.id].length ? (
                  records[connection.id].map((record) => (
                    <div
                      key={`${record.type}:${record.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{record.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {record.type}
                          {record.status ? ` · ${record.status}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {record.url && (
                          <a
                            className={button}
                            href={record.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <LinkIcon size={14} />
                            Open
                          </a>
                        )}
                        <button
                          className={button}
                          onClick={() => {
                            setSelected({
                              connectionId: connection.id,
                              record,
                            });
                            setProjectId(currentProject?.id || "");
                            setGoalId("");
                          }}
                        >
                          Link to goal or project
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No accessible records in this snapshot.
                  </p>
                )}
              </div>
            )}
          </section>
        ))
      )}
      {!!links.length && (
        <section className="rounded-2xl border border-border p-5">
          <h2 className="font-semibold">Linked records</h2>
          {links.map((link) => (
            <div
              className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0"
              key={link.id}
            >
              <a
                href={link.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm hover:underline"
              >
                {link.externalTitle}
              </a>
              <button
                className={button}
                onClick={async () => {
                  try {
                    await platformsApi.unlink(link.id);
                    await load();
                  } catch (e) {
                    report(e);
                  }
                }}
              >
                Unlink
              </button>
            </div>
          ))}
        </section>
      )}
      {selected && (
        <form
          onSubmit={saveLink}
          className="space-y-4 rounded-2xl border border-border bg-card p-5"
        >
          <h2 className="font-semibold">Link {selected.record.title}</h2>
          <label className="block space-y-2 text-sm">
            Project
            <select
              className={field}
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setGoalId("");
              }}
            >
              <option value="">Personal goals</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <GoalSelect
            projectId={projectId || undefined}
            value={goalId}
            onChange={setGoalId}
          />
          <div className="flex gap-2">
            <button className={button} disabled={busy} type="submit">
              Save link
            </button>
            <button
              type="button"
              className={button}
              onClick={() => setSelected(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
