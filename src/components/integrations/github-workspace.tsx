"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  CircleDot,
  Code2,
  ExternalLink,
  FileCode2,
  Folder,
  GitBranch,
  GitPullRequest,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { formatDate, formatDateTime } from "@/lib/utils";

interface Connection {
  id: string;
  repositoryOwner: string;
  repositoryName: string;
  status: string;
  fileCount?: number;
  issueCount?: number;
  pullRequestCount?: number;
  lastSyncedAt?: string | null;
}
interface RepoFile {
  id: string;
  path: string;
  size: number;
  htmlUrl: string;
  syncedAt: string;
}
interface Issue {
  id: string;
  issueNumber: number;
  title: string;
  body?: string;
  state: string;
  htmlUrl: string;
  authorLogin?: string;
  githubUpdatedAt: string;
  labels?: string[];
}
interface PullRequest {
  id: string;
  prNumber: number;
  title: string;
  body?: string;
  state: string;
  htmlUrl: string;
  authorLogin?: string;
  githubUpdatedAt: string;
  isMerged?: boolean;
  baseBranch?: string;
  headBranch?: string;
  labels?: string[];
}
interface Props {
  connections: Connection[];
  activeConnection: Connection | null;
  loadingConnection: boolean;
  onSelectConnection: (id: string) => void;
  onBack: () => void;
  showConnectForm: boolean;
  onToggleConnect: () => void;
  connecting: boolean;
  connectForm: {
    url: string;
    error: string | null;
    token: string;
    setUrl: (v: string) => void;
    setToken: (v: string) => void;
    onSubmit: (e: React.FormEvent) => void;
  };
  files: RepoFile[];
  loadingFiles: boolean;
  totalFiles: number;
  loadErrors: Partial<Record<"code" | "issues" | "pulls", string>>;
  onRetry: (view: "code" | "issues" | "pulls") => void;
  fileQuery: string;
  onFileQueryChange: (v: string) => void;
  issues: Issue[];
  totalIssues: number;
  loadingIssues: boolean;
  issueQuery: string;
  onIssueQueryChange: (v: string) => void;
  issueState: string;
  onIssueStateChange: (v: string) => void;
  pullRequests: PullRequest[];
  totalPrs: number;
  loadingPrs: boolean;
  prQuery: string;
  onPrQueryChange: (v: string) => void;
  prState: string;
  onPrStateChange: (v: string) => void;
  syncing: boolean;
  syncingCode: boolean;
  indexProgress: { completed: number; total: number } | null;
  onSync: () => void;
  onIndex: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
  syncToken: string;
  onSyncTokenChange: (v: string) => void;
}

const muted = "text-[#656d76]";
const outline =
  "h-8 rounded-md border-[#d0d7de] bg-[#f6f8fa] text-[#24292f] shadow-none hover:bg-[#eef1f4] text-xs";
const green =
  "h-8 rounded-md bg-[#1f883d] hover:bg-[#1a7f37] text-white shadow-none text-xs";
const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da] focus-visible:ring-offset-2";

export function GitHubWorkspace(p: Props) {
  const [tab, setTab] = useState<"code" | "issues" | "pulls" | "settings">(
    "code",
  );
  const [directory, setDirectory] = useState("");
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const connection = p.activeConnection;
  const loadError = tab === "settings" ? undefined : p.loadErrors[tab];
  const connected = !!connection && connection.status !== "DISCONNECTED";
  const syncPending = connection?.status === "SYNCING";
  const busy = p.syncing || p.syncingCode || p.disconnecting;
  const repoUrl = connection
    ? `https://github.com/${connection.repositoryOwner}/${connection.repositoryName}`
    : "";

  useEffect(() => {
    setDirectory("");
    setExpandedIssue(null);
  }, [connection?.id]);
  const rows = useMemo(() => {
    const query = p.fileQuery.trim().toLowerCase();
    if (query)
      return p.files
        .filter((f) => f.path.toLowerCase().includes(query))
        .map((file) => ({
          name: file.path,
          file,
          folder: false,
          path: file.path,
          count: 0,
        }));
    const folders = new Map<string, number>();
    const files: {
      name: string;
      file: RepoFile;
      folder: false;
      path: string;
      count: number;
    }[] = [];
    const prefix = directory ? directory + "/" : "";
    for (const file of p.files) {
      if (!file.path.startsWith(prefix)) continue;
      const relative = file.path.slice(prefix.length);
      const slash = relative.indexOf("/");
      if (slash !== -1) {
        const name = relative.slice(0, slash);
        folders.set(name, (folders.get(name) ?? 0) + 1);
      } else
        files.push({
          name: relative,
          file,
          folder: false,
          path: file.path,
          count: 0,
        });
    }
    return [
      ...Array.from(folders, ([name, count]) => ({
        name,
        folder: true,
        path: prefix + name,
        count,
        file: null,
      })).sort((a, b) => a.name.localeCompare(b.name)),
      ...files.sort((a, b) => a.name.localeCompare(b.name)),
    ];
  }, [p.files, p.fileQuery, directory]);

  const goTo = (path: string) => {
    setDirectory(path);
    p.onFileQueryChange("");
  };
  const codePrompt = (file: RepoFile) =>
    `/assistant?prompt=${encodeURIComponent(`Explain the file "${file.path}" from repository ${connection?.repositoryOwner}/${connection?.repositoryName}. What does it do and how is it used in the architecture?`)}&mode=DEVELOPER`;

  return (
    <section className="text-[#24292f]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={p.onBack}
          className={`flex items-center gap-1.5 text-xs ${muted} hover:text-[#0969da] ${focus}`}
        >
          <ArrowLeft size={14} /> Integrations
        </button>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {p.connections.length > 0 && (
            <>
              <span className={`text-xs ${muted}`}>Repository</span>
              <DropdownSelect
                value={connection?.id ?? ""}
                onChange={p.onSelectConnection}
                disabled={busy}
                options={p.connections.map((c) => ({
                  value: c.id,
                  label: `${c.repositoryOwner}/${c.repositoryName}`,
                  icon: <BookOpen size={14} />,
                }))}
                placeholder="Select repository"
                className="w-[350px] max-w-[calc(100vw-2rem)]"
                triggerClassName="h-8 w-full"
                menuWidth="w-full"
              />
            </>
          )}
          <Button
            variant="outline"
            disabled={busy}
            onClick={p.onToggleConnect}
            className={outline}
          >
            <Plus size={14} className="mr-1.5" /> Connect repository
          </Button>
        </div>
      </div>

      {syncPending && !p.syncing && (
        <p role="status" className="text-sm mb-4 text-[var(--ws-muted)]">
          Repository sync is incomplete. Select Sync from GitHub to resume.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
        <div className="grid min-w-0 grid-cols-[20px_minmax(0,1fr)] items-start gap-2 text-base sm:flex sm:flex-wrap sm:items-center sm:text-lg">
          <BookOpen size={20} className={muted} />
          <h1 className="min-w-0 break-words font-sans font-normal leading-7 text-[#0969da]">
            {connection ? (
              <>
                <span>{connection.repositoryOwner}</span>
                <span className="mx-2 text-[#656d76]">/</span>
                <span className="block font-semibold sm:inline">
                  {connection.repositoryName}
                </span>
              </>
            ) : (
              "GitHub repositories"
            )}
          </h1>
          {connected && (
            <span className="col-start-2 inline-flex w-fit items-center gap-1 rounded-full border border-[#d0d7de] px-2 py-0.5 text-[11px] text-[#656d76]">
              <CheckCircle2 size={12} className="text-[#1a7f37]" />{" "}
              {connection?.status === "ERROR"
                ? "Sync interrupted"
                : syncPending
                  ? "Sync incomplete"
                  : "Connected"}
            </span>
          )}
        </div>
        {connected && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={p.onSync}
              className={outline}
            >
              <RefreshCw
                size={14}
                className={`mr-1.5 ${p.syncing ? "animate-spin" : ""}`}
              />
              {p.syncing ? "Syncing..." : "Sync from GitHub"}
            </Button>
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className={`${outline} ${focus} inline-flex items-center gap-1.5 border px-3`}
            >
              <BookOpen size={14} />
              Open GitHub
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      {p.loadingConnection && !connection ? (
        <div className="h-48 animate-pulse rounded-md border border-[#d0d7de] bg-[#f6f8fa]" />
      ) : p.showConnectForm || !p.connections.length ? (
        <div className="mx-auto max-w-xl rounded-md border border-[#d0d7de] bg-white p-6">
          <h2 className="mb-1 text-base font-semibold">Connect a repository</h2>
          <p className={`mb-5 text-sm ${muted}`}>
            Bring your issues, pull requests and source code into this
            workspace.
          </p>
          <form onSubmit={p.connectForm.onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="github-repository-url"
                className="mb-1 block text-sm font-medium"
              >
                Repository URL
              </label>
              <Input
                id="github-repository-url"
                required
                inputMode="url"
                autoComplete="url"
                value={p.connectForm.url}
                onChange={(e) => p.connectForm.setUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                aria-invalid={!!p.connectForm.error}
                aria-describedby={
                  p.connectForm.error
                    ? "github-repository-url-error"
                    : "github-repository-url-help"
                }
                disabled={p.connecting}
              />
              {p.connectForm.error ? (
                <p
                  id="github-repository-url-error"
                  role="alert"
                  className="mt-2 text-xs text-[#cf222e]"
                >
                  {p.connectForm.error}
                </p>
              ) : (
                <p
                  id="github-repository-url-help"
                  className={`mt-1.5 text-xs ${muted}`}
                >
                  Paste a repository link to detect its owner and name.
                </p>
              )}
            </div>
            <details className="text-sm">
              <summary className={`cursor-pointer font-medium ${muted}`}>
                Add an access token (optional)
              </summary>
              <div className="mt-3">
                <label
                  htmlFor="github-connect-token"
                  className="mb-1 block text-sm font-medium"
                >
                  GitHub access token <span className={muted}>(optional)</span>
                </label>
                <Input
                  id="github-connect-token"
                  type="password"
                  autoComplete="off"
                  value={p.connectForm.token}
                  onChange={(e) => p.connectForm.setToken(e.target.value)}
                  placeholder="For private repositories"
                />
                <p className={`mt-1.5 text-xs ${muted}`}>
                  Used to connect the repository, then cleared.
                </p>
              </div>
            </details>
            <div className="flex justify-end gap-2">
              {!!p.connections.length && (
                <Button
                  type="button"
                  variant="outline"
                  className={outline}
                  onClick={p.onToggleConnect}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={p.connecting} className={green}>
                {p.connecting ? "Connecting..." : "Connect repository"}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        connected && (
          <>
            <nav
              aria-label="Repository views"
              className="mb-6 flex gap-1 overflow-x-auto border-b border-[#d0d7de]"
            >
              {(
                [
                  {
                    id: "code",
                    label: "Code",
                    icon: Code2,
                    count: connection.fileCount ?? p.totalFiles,
                  },
                  {
                    id: "issues",
                    label: "Issues",
                    icon: CircleDot,
                    count: connection.issueCount ?? p.totalIssues,
                  },
                  {
                    id: "pulls",
                    label: "Pull requests",
                    icon: GitPullRequest,
                    count: connection.pullRequestCount ?? p.totalPrs,
                  },
                  { id: "settings", label: "Settings", icon: Settings },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  aria-current={tab === t.id ? "page" : undefined}
                  onClick={() => setTab(t.id)}
                  className={`${focus} relative flex h-11 shrink-0 items-center gap-2 px-3 text-sm ${tab === t.id ? "font-semibold" : "hover:bg-[#f6f8fa]"}`}
                >
                  <t.icon size={16} className={muted} />
                  {t.label}
                  {"count" in t && (
                    <span className="rounded-full bg-[#afb8c133] px-1.5 py-0.5 text-xs font-normal">
                      {t.count}
                    </span>
                  )}
                  {tab === t.id && (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-[#fd8c73]" />
                  )}
                </button>
              ))}
            </nav>

            {p.syncingCode && (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 rounded-md border border-[#54aeff66] bg-[#ddf4ff] p-3 text-xs"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  {p.indexProgress
                    ? `Checking files: ${p.indexProgress.completed} / ${p.indexProgress.total}`
                    : "Preparing repository indexing..."}
                </div>
                {p.indexProgress && (
                  <progress
                    aria-label="Repository indexing"
                    value={p.indexProgress.completed}
                    max={p.indexProgress.total || 1}
                    className="h-1.5 w-full accent-[#0969da]"
                  />
                )}
              </div>
            )}

            {loadError && tab !== "settings" ? (
              <div
                role="alert"
                className="rounded-md border border-[#ff818266] bg-white p-5"
              >
                <h2 className="text-sm font-semibold">
                  Could not load{" "}
                  {tab === "code"
                    ? "repository files"
                    : tab === "issues"
                      ? "issues"
                      : "pull requests"}
                </h2>
                <p className="mt-2 text-sm text-[#656d76]">{loadError}</p>
                <Button
                  variant="outline"
                  className={`${outline} mt-3`}
                  onClick={() => p.onRetry(tab)}
                >
                  Retry
                </Button>
              </div>
            ) : tab === "settings" ? (
              <div className="max-w-3xl space-y-6">
                <section className="rounded-md border border-[#d0d7de] bg-white p-5">
                  <h2 className="mb-1 text-base font-semibold">
                    Synchronization access
                  </h2>
                  <p className={`mb-4 text-sm ${muted}`}>
                    Use a GitHub token for private repositories or a higher
                    request allowance.
                  </p>
                  <label
                    htmlFor="github-sync-token"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    GitHub access token{" "}
                    <span className={muted}>(optional)</span>
                  </label>
                  <Input
                    id="github-sync-token"
                    type="password"
                    autoComplete="off"
                    disabled={busy}
                    value={p.syncToken}
                    onChange={(e) => p.onSyncTokenChange(e.target.value)}
                    placeholder="GitHub access token"
                    className="max-w-lg"
                  />
                  <p className={`mt-2 text-xs ${muted}`}>
                    Used for your next sync or indexing run, then cleared. It is
                    not saved.
                  </p>
                </section>
                <section>
                  <h2 className="mb-2 text-base font-semibold">
                    Code indexing
                  </h2>
                  <p className={`text-sm leading-6 ${muted}`}>
                    Every eligible source and documentation file is checked.
                    Unchanged files are skipped, and you can restart interrupted
                    indexing. Generated files, dependencies, lockfiles,
                    unsupported formats and files larger than 100 KB are
                    excluded.
                  </p>
                </section>
                <section className="rounded-md border border-[#ff818266] bg-white p-5">
                  <h2 className="mb-2 text-base font-semibold">
                    Disconnect repository
                  </h2>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className={`text-sm ${muted}`}>
                      Remove this repository connection from the workspace.
                    </p>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={p.onDisconnect}
                      className={`${outline} text-[#cf222e] hover:bg-[#fff1f1]`}
                    >
                      <Unlink size={14} className="mr-1.5" />
                      Disconnect
                    </Button>
                  </div>
                </section>
              </div>
            ) : (
              <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_240px]">
                <div className="min-w-0">
                  {tab === "code" ? (
                    <>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          title="Indexing follows the repository's default branch"
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-xs"
                        >
                          <GitBranch size={14} />
                          Default branch
                        </span>
                        <div className="relative min-w-36 flex-1">
                          <Search
                            size={14}
                            className="absolute left-2.5 top-2.5 text-[#656d76]"
                          />
                          <input
                            aria-label="Find an indexed file"
                            value={p.fileQuery}
                            onChange={(e) =>
                              p.onFileQueryChange(e.target.value)
                            }
                            placeholder="Go to file"
                            className="h-8 w-full rounded-md border border-[#d0d7de] bg-white pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#0969da]"
                          />
                        </div>
                        <Button
                          disabled={busy || p.loadingFiles}
                          onClick={p.onIndex}
                          className={green}
                        >
                          <RefreshCw
                            size={14}
                            className={`mr-1.5 ${p.syncingCode ? "animate-spin" : ""}`}
                          />
                          {p.syncingCode ? "Indexing..." : "Index Codebase"}
                        </Button>
                      </div>
                      {directory && !p.fileQuery && (
                        <nav
                          aria-label="File path"
                          className="mb-3 flex flex-wrap items-center gap-1.5 text-sm"
                        >
                          <button
                            onClick={() => goTo("")}
                            className={`font-medium text-[#0969da] hover:underline ${focus}`}
                          >
                            {connection.repositoryName}
                          </button>
                          {directory.split("/").map((part, i) => (
                            <span className="flex items-center gap-1.5" key={i}>
                              <span className={muted}>/</span>
                              <button
                                aria-current={
                                  i === directory.split("/").length - 1
                                    ? "page"
                                    : undefined
                                }
                                className={`text-[#0969da] hover:underline ${focus}`}
                                onClick={() =>
                                  goTo(
                                    directory
                                      .split("/")
                                      .slice(0, i + 1)
                                      .join("/"),
                                  )
                                }
                              >
                                {part}
                              </button>
                            </span>
                          ))}
                        </nav>
                      )}
                      <div className="overflow-hidden rounded-md border border-[#d0d7de] bg-white">
                        <div className="flex items-center justify-between gap-2 border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-3 text-xs">
                          <span className="flex items-center gap-2 font-medium">
                            <Code2 size={16} className={muted} />
                            {p.fileQuery
                              ? `${rows.length} matching files`
                              : directory || "Repository files"}
                          </span>
                          <span className={muted}>
                            {p.totalFiles} indexed files
                          </span>
                        </div>
                        {p.loadingFiles ? (
                          <div
                            role="status"
                            className={`flex items-center justify-center gap-2 p-12 text-sm ${muted}`}
                          >
                            <Loader2 size={16} className="animate-spin" />
                            Loading repository files...
                          </div>
                        ) : (
                          <>
                            {directory && !p.fileQuery && (
                              <button
                                onClick={() =>
                                  goTo(
                                    directory.split("/").slice(0, -1).join("/"),
                                  )
                                }
                                className={`flex w-full items-center gap-3 border-b border-[#d0d7de] px-4 py-2.5 text-sm text-[#0969da] hover:bg-[#f6f8fa] ${focus}`}
                              >
                                <ArrowLeft size={16} />
                                ..
                              </button>
                            )}
                            {!!rows.length ? (
                              <ul className="divide-y divide-[#d0d7de]">
                                {rows.map((row) => (
                                  <li
                                    key={row.path}
                                    className="group flex min-w-0 items-center gap-3 px-4 py-2.5 hover:bg-[#f6f8fa]"
                                  >
                                    {row.folder ? (
                                      <Folder
                                        size={17}
                                        fill="#54aeff"
                                        strokeWidth={1.5}
                                        className="shrink-0 text-[#54aeff]"
                                      />
                                    ) : (
                                      <FileCode2
                                        size={17}
                                        className={`shrink-0 ${muted}`}
                                      />
                                    )}
                                    {row.folder ? (
                                      <button
                                        onClick={() => goTo(row.path)}
                                        className={`min-w-0 flex-1 truncate text-left text-sm hover:text-[#0969da] hover:underline ${focus}`}
                                      >
                                        {row.name}
                                      </button>
                                    ) : (
                                      <a
                                        href={row.file!.htmlUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`min-w-0 flex-1 truncate text-sm hover:text-[#0969da] hover:underline ${focus}`}
                                        title={`Open ${row.path} on GitHub`}
                                      >
                                        {row.name}
                                      </a>
                                    )}
                                    <span
                                      className={`hidden shrink-0 text-xs sm:block ${muted}`}
                                    >
                                      {row.folder
                                        ? `${row.count} indexed files`
                                        : `${(row.file!.size / 1024).toFixed(1)} KB`}
                                    </span>
                                    {!row.folder && (
                                      <Link
                                        href={codePrompt(row.file!)}
                                        title={`Ask Copilot about ${row.path}`}
                                        aria-label={`Ask Copilot about ${row.path}`}
                                        className={`rounded p-1 text-[#656d76] hover:bg-[#ddf4ff] hover:text-[#0969da] ${focus}`}
                                      >
                                        <Bot size={16} />
                                      </Link>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <EmptyState
                                icon={Code2}
                                title={
                                  p.fileQuery
                                    ? "No files found"
                                    : "No indexed files yet"
                                }
                                description={
                                  p.fileQuery
                                    ? "Try another file name or path."
                                    : "Index this repository to make its source code available to Copilot and MCP."
                                }
                              />
                            )}
                          </>
                        )}
                      </div>
                      <p className={`mt-3 text-xs ${muted}`}>
                        Files open on GitHub. Use{" "}
                        <Bot size={12} className="inline align-text-bottom" />{" "}
                        to ask Copilot about a file.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <div className="relative min-w-40 flex-1">
                          <Search
                            size={14}
                            className="absolute left-3 top-2.5 text-[#656d76]"
                          />
                          <input
                            aria-label={
                              tab === "issues"
                                ? "Search issues"
                                : "Search pull requests"
                            }
                            value={tab === "issues" ? p.issueQuery : p.prQuery}
                            onChange={(e) =>
                              tab === "issues"
                                ? p.onIssueQueryChange(e.target.value)
                                : p.onPrQueryChange(e.target.value)
                            }
                            placeholder={
                              tab === "issues"
                                ? "Search issues"
                                : "Search pull requests"
                            }
                            className="h-9 w-full rounded-md border border-[#d0d7de] bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0969da]"
                          />
                        </div>
                        <select
                          aria-label="Filter by state"
                          value={tab === "issues" ? p.issueState : p.prState}
                          onChange={(e) =>
                            tab === "issues"
                              ? p.onIssueStateChange(e.target.value)
                              : p.onPrStateChange(e.target.value)
                          }
                          className="h-9 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-xs"
                        >
                          <option value="all">All states</option>
                          <option value="open">Open</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <div className="overflow-hidden rounded-md border border-[#d0d7de] bg-white">
                        <div className="border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-3 text-sm font-medium">
                          {tab === "issues"
                            ? `${p.totalIssues} issues`
                            : `${p.totalPrs} pull requests`}
                        </div>
                        {(tab === "issues" ? p.loadingIssues : p.loadingPrs) ? (
                          <div
                            role="status"
                            className={`p-12 text-center text-sm ${muted}`}
                          >
                            Loading...
                          </div>
                        ) : tab === "issues" ? (
                          p.issues.length ? (
                            <ul className="divide-y divide-[#d0d7de]">
                              {p.issues.map((issue) => (
                                <li
                                  key={issue.id}
                                  className="px-4 py-4 hover:bg-[#f6f8fa]"
                                >
                                  <div className="flex items-start gap-3">
                                    <CircleDot
                                      size={18}
                                      className={`mt-0.5 shrink-0 ${issue.state === "open" ? "text-[#1a7f37]" : "text-[#8250df]"}`}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <a
                                        href={issue.htmlUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`text-sm font-semibold hover:text-[#0969da] ${focus}`}
                                      >
                                        {issue.title}
                                      </a>
                                      <p className={`mt-1 text-xs ${muted}`}>
                                        #{issue.issueNumber} · {issue.state}
                                        {issue.authorLogin &&
                                          ` · ${issue.authorLogin}`}{" "}
                                        · Updated{" "}
                                        {formatDate(issue.githubUpdatedAt)}
                                      </p>
                                      <Labels labels={issue.labels} />
                                      {issue.body && (
                                        <button
                                          aria-expanded={
                                            expandedIssue === issue.id
                                          }
                                          onClick={() =>
                                            setExpandedIssue(
                                              expandedIssue === issue.id
                                                ? null
                                                : issue.id,
                                            )
                                          }
                                          className={`mt-2 text-xs text-[#0969da] hover:underline ${focus}`}
                                        >
                                          {expandedIssue === issue.id
                                            ? "Hide description"
                                            : "Show description"}
                                        </button>
                                      )}
                                      {expandedIssue === issue.id && (
                                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                                          {issue.body}
                                        </p>
                                      )}
                                    </div>
                                    <Link
                                      href={`/assistant?prompt=${encodeURIComponent(`Analyze GitHub issue #${issue.issueNumber}: ${issue.title}. ${issue.body ?? ""}`)}&mode=DEVELOPER`}
                                      aria-label={`Ask Copilot about issue ${issue.issueNumber}`}
                                      className={`${focus} rounded p-1 text-[#656d76] hover:text-[#0969da]`}
                                    >
                                      <Bot size={16} />
                                    </Link>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <EmptyState
                              icon={CircleDot}
                              title="No issues found"
                              description={
                                p.issueQuery || p.issueState !== "all"
                                  ? "Try a different search or state filter."
                                  : "This repository has no synced issues."
                              }
                            />
                          )
                        ) : p.pullRequests.length ? (
                          <ul className="divide-y divide-[#d0d7de]">
                            {p.pullRequests.map((pr) => (
                              <li
                                key={pr.id}
                                className="flex items-start gap-3 px-4 py-4 hover:bg-[#f6f8fa]"
                              >
                                <GitPullRequest
                                  size={18}
                                  className={`mt-0.5 shrink-0 ${pr.isMerged ? "text-[#8250df]" : pr.state === "open" ? "text-[#1a7f37]" : "text-[#cf222e]"}`}
                                />
                                <div className="min-w-0 flex-1">
                                  <a
                                    href={pr.htmlUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`text-sm font-semibold hover:text-[#0969da] ${focus}`}
                                  >
                                    {pr.title}
                                  </a>
                                  <p className={`mt-1 text-xs ${muted}`}>
                                    #{pr.prNumber} ·{" "}
                                    {pr.isMerged ? "merged" : pr.state}
                                    {pr.authorLogin && ` · ${pr.authorLogin}`} ·
                                    Updated {formatDate(pr.githubUpdatedAt)}
                                  </p>
                                  {pr.headBranch && pr.baseBranch && (
                                    <p
                                      className={`mt-2 flex flex-wrap items-center gap-1.5 text-xs ${muted}`}
                                    >
                                      <GitBranch size={12} />
                                      <code className="rounded bg-[#eff1f3] px-1">
                                        {pr.headBranch}
                                      </code>
                                      →
                                      <code className="rounded bg-[#eff1f3] px-1">
                                        {pr.baseBranch}
                                      </code>
                                    </p>
                                  )}
                                  <Labels labels={pr.labels} />
                                </div>
                                <Link
                                  href={`/assistant?prompt=${encodeURIComponent(`Review pull request #${pr.prNumber}: ${pr.title}. ${pr.body ?? ""}`)}&mode=DEVELOPER`}
                                  aria-label={`Ask Copilot to review pull request ${pr.prNumber}`}
                                  className={`${focus} rounded p-1 text-[#656d76] hover:text-[#0969da]`}
                                >
                                  <Bot size={16} />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <EmptyState
                            icon={GitPullRequest}
                            title="No pull requests found"
                            description={
                              p.prQuery || p.prState !== "all"
                                ? "Try a different search or state filter."
                                : "This repository has no synced pull requests."
                            }
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
                <aside className="space-y-5 border-t border-[#d0d7de] pt-5 xl:border-t-0 xl:pt-0">
                  <section>
                    <h2 className="mb-2 text-sm font-semibold">
                      About this connection
                    </h2>
                    <p className={`text-sm leading-6 ${muted}`}>
                      Repository content connected to your Continuum project.
                    </p>
                    <a
                      href={repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-3 inline-flex max-w-full items-center gap-1.5 text-xs text-[#0969da] hover:underline ${focus}`}
                    >
                      <ExternalLink size={13} className="shrink-0" />
                      <span className="truncate">
                        {connection.repositoryName}
                      </span>
                    </a>
                  </section>
                  <section className="border-t border-[#d0d7de] pt-4">
                    <h2 className="mb-3 text-sm font-semibold">
                      Workspace index
                    </h2>
                    <dl className={`space-y-2.5 text-xs ${muted}`}>
                      <div className="flex justify-between">
                        <dt>Code files</dt>
                        <dd className="font-medium text-[#24292f]">
                          {connection.fileCount ?? p.totalFiles}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Issues</dt>
                        <dd className="font-medium text-[#24292f]">
                          {connection.issueCount ?? p.totalIssues}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Pull requests</dt>
                        <dd className="font-medium text-[#24292f]">
                          {connection.pullRequestCount ?? p.totalPrs}
                        </dd>
                      </div>
                    </dl>
                    <p className={`mt-4 text-xs leading-5 ${muted}`}>
                      Available to Copilot and agents through MCP. Source files
                      follow the GitHub default branch.
                    </p>
                  </section>
                  <section className="border-t border-[#d0d7de] pt-4">
                    <h2 className="mb-2 text-sm font-semibold">
                      Last GitHub sync
                    </h2>
                    <p className={`text-xs ${muted}`}>
                      {connection.lastSyncedAt
                        ? formatDateTime(connection.lastSyncedAt)
                        : "Not synced yet"}
                    </p>
                    <button
                      onClick={() => setTab("settings")}
                      className={`mt-3 text-xs text-[#0969da] hover:underline ${focus}`}
                    >
                      Manage connection
                    </button>
                  </section>
                </aside>
              </div>
            )}
          </>
        )
      )}
    </section>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Code2;
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 py-14 text-center">
      <Icon size={28} className="mx-auto mb-3 text-[#656d76]" />
      <h3 className="mb-1 text-base font-semibold">{title}</h3>
      <p className="mx-auto max-w-sm text-sm leading-6 text-[#656d76]">
        {description}
      </p>
    </div>
  );
}
function Labels({ labels }: { labels?: string[] }) {
  return labels?.length ? (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-full border border-[#d0d7de] px-2 py-0.5 text-[11px] text-[#656d76]"
        >
          {label}
        </span>
      ))}
    </div>
  ) : null;
}
