"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";

import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api";
import { syncGitHubPages } from "@/lib/github-sync";
import { parseGitHubRepositoryUrl } from "@/lib/github-repository-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Key,
  Copy,
  Check,
  ShieldCheck,
  ChevronRight,
  Boxes,
} from "lucide-react";
import { ConfirmModal } from "@/components/confirm-modal";
import { GitHubWorkspace } from "@/components/integrations/github-workspace";
import { HermesIntegration } from "@/components/integrations/hermes-integration";
import { McpConsole } from "@/components/integrations/mcp-console";
import { PlatformConnections } from "@/components/integrations/platform-connections";

// ==========================================
// BRAND ICONS
// ==========================================
function GithubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function McpIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18 84.8528L85.8822 16.9706C95.2548 7.59798 110.451 7.59798 119.823 16.9706V16.9706C129.196 26.3431 129.196 41.5391 119.823 50.9117L68.5581 102.177"
        stroke="currentColor"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M69.2652 101.47L119.823 50.9117C129.196 41.5391 144.392 41.5391 153.765 50.9117L154.118 51.2652C163.491 60.6378 163.491 75.8338 154.118 85.2063L92.7248 146.6C89.6006 149.724 89.6006 154.789 92.7248 157.913L105.331 170.52"
        stroke="currentColor"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M102.853 33.9411L52.6482 84.1457C43.2756 93.5183 43.2756 108.714 52.6482 118.087V118.087C62.0208 127.459 77.2167 127.459 86.5893 118.087L136.794 67.8822"
        stroke="currentColor"
        strokeWidth="15"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CursorIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
    </svg>
  );
}

function ClaudeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
    </svg>
  );
}

function CodexIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.064l-4.83 2.79a4.5 4.5 0 0 1-6.15-1.647zm-1.554-9.87a4.5 4.5 0 0 1 2.34-1.97v5.6a.78.78 0 0 0 .392.68l5.843 3.37-2.02 1.169a.076.076 0 0 1-.07.006l-4.834-2.793a4.505 4.505 0 0 1-1.651-6.062zm16.598 4.606-5.844-3.37 2.02-1.167a.076.076 0 0 1 .07-.006l4.833 2.79a4.504 4.504 0 0 1 .693 7.854v-5.42a.795.795 0 0 0-.39-.681zm2.01-3.023-.141-.085-4.783-2.759a.775.775 0 0 0-.78 0L9.106 10.54V8.208a.08.08 0 0 1 .033-.064l4.83-2.79a4.5 4.5 0 0 1 6.68 4.66zM8.307 12.713l-2.02-1.168a.076.076 0 0 1-.038-.052V5.91a4.504 4.504 0 0 1 7.37-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.392.681zm1.096-2.365L12 8.815l2.597 1.533v3.01L12 14.89l-2.597-1.533z" />
    </svg>
  );
}

function AntigravityIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c.4 3.8 3.8 7.2 7.6 7.6-3.8.4-7.2 3.8-7.6 7.6-.4-3.8-3.8-7.2-7.6-7.6 3.8-.4 7.2-3.8 7.6-7.6z" />
      <circle cx="19" cy="5" r="1.5" />
    </svg>
  );
}

// App Types
type ActiveView =
  "directory" | "mcp" | "github" | "hermes" | "platforms" | "paperclip" | "t3";
type CategoryFilter = "all" | "ai" | "vcs";

export function IntegrationsConsole({
  initialView,
  onViewChange,
}: {
  initialView?: ActiveView;
  onViewChange?: (view: ActiveView) => void;
} = {}) {
  const { currentProject } = useAuth();
  const syncRequest = useRef<AbortController | null>(null);
  const connectionRequestId = useRef(0);
  const connectionRequestController = useRef<AbortController | null>(null);
  const issuesRequestId = useRef(0);
  const pullRequestsRequestId = useRef(0);
  useEffect(() => () => syncRequest.current?.abort(), [currentProject?.id]);
  const { showToast } = useToast();

  // Navigation state: "directory" | "mcp" | "github" | "hermes"
  const [activeView, setActiveView] = useState<ActiveView>(
    initialView || "directory",
  );
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [directorySearch, setDirectorySearch] = useState("");

  // Sync state with URL params on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const app = params.get("app");
      if (app === "hermes") setActiveView("hermes");
      else if (app === "mcp") setActiveView("mcp");
      else if (app === "github") setActiveView("github");
      else if (app === "paperclip" || app === "t3") setActiveView(app);
      else if (app === "platforms") setActiveView("platforms");
    }
  }, []);

  const navigateToView = (view: ActiveView) => {
    if (onViewChange) {
      onViewChange(view);
      return;
    }
    setActiveView(view);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (view === "directory") url.searchParams.delete("app");
      else url.searchParams.set("app", view);
      window.history.pushState({}, "", url.toString());
    }
  };

  // GitHub state (Multi-Repo, PRs, Codebase)
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<
    string | null
  >(null);
  const [loadingConnection, setLoadingConnection] = useState(false);
  const [connectionLoadError, setConnectionLoadError] = useState<string | null>(
    null,
  );
  const [connectionsProjectId, setConnectionsProjectId] = useState<
    string | null
  >(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [totalIssues, setTotalIssues] = useState(0);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [pullRequests, setPullRequests] = useState<any[]>([]);
  const [totalPrs, setTotalPrs] = useState(0);
  const [loadingPrs, setLoadingPrs] = useState(false);
  const [repoFiles, setRepoFiles] = useState<any[]>([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const fileLoadRequest = useRef(0);
  const [githubLoadErrors, setGithubLoadErrors] = useState<
    Partial<Record<"code" | "issues" | "pulls", string>>
  >({});
  const [syncing, setSyncing] = useState(false);
  const [syncAccessToken, setSyncAccessToken] = useState("");
  const [indexProgress, setIndexProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [syncingCode, setSyncingCode] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [repositoryUrlError, setRepositoryUrlError] = useState<string | null>(
    null,
  );
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [selectedState, setSelectedState] = useState<string>("all");
  const [prState, setPrState] = useState<string>("all");
  const [issueSearchQuery, setIssueSearchQuery] = useState("");
  const [prSearchQuery, setPrSearchQuery] = useState("");
  const [fileSearchQuery, setFileSearchQuery] = useState("");

  // MCP state
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [apiKeysError, setApiKeysError] = useState<string | null>(null);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiryDays, setNewKeyExpiryDays] = useState<number>(90);
  const [creatingKey, setCreatingKey] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [keyToRevoke, setKeyToRevoke] = useState<any>(null);
  const [revokingKey, setRevokingKey] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Do not show a repository from the previously selected project while the
  // current project's connections are still loading.
  const projectConnections =
    currentProject && connectionsProjectId === currentProject.id
      ? connections
      : [];
  const activeConnection =
    projectConnections.find((c) => c.id === selectedConnectionId) ||
    projectConnections[0] ||
    null;
  const isLoadingConnection =
    !!currentProject &&
    (loadingConnection || connectionsProjectId !== currentProject.id);

  // Clear project-scoped GitHub data immediately when the selected project changes.
  useEffect(() => {
    issuesRequestId.current += 1;
    pullRequestsRequestId.current += 1;
    fileLoadRequest.current += 1;
    setConnections([]);
    setSelectedConnectionId(null);
    setConnectionsProjectId(null);
    setConnectionLoadError(null);
    setIssues([]);
    setTotalIssues(0);
    setLoadingIssues(false);
    setPullRequests([]);
    setTotalPrs(0);
    setLoadingPrs(false);
    setRepoFiles([]);
    setTotalFiles(0);
    setLoadingFiles(false);
    setGithubLoadErrors({});
  }, [currentProject?.id]);

  // Load GitHub connections
  const loadConnections = useCallback(async () => {
    const requestId = ++connectionRequestId.current;
    connectionRequestController.current?.abort();
    connectionRequestController.current = null;

    if (!currentProject) {
      setConnections([]);
      setSelectedConnectionId(null);
      setIssues([]);
      setTotalIssues(0);
      setPullRequests([]);
      setTotalPrs(0);
      setRepoFiles([]);
      setTotalFiles(0);
      setGithubLoadErrors({});
      setConnectionsProjectId(null);
      setConnectionLoadError(null);
      setLoadingConnection(false);
      return;
    }

    const projectId = currentProject.id;
    const controller = new AbortController();
    connectionRequestController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setLoadingConnection(true);
    setConnectionLoadError(null);
    try {
      const list = await api.integrations.github.listConnections(
        projectId,
        controller.signal,
      );
      if (requestId !== connectionRequestId.current) return;
      const conns = Array.isArray(list)
        ? list.filter((connection) => connection.status !== "DISCONNECTED")
        : [];
      setConnections(conns);
      if (conns.length > 0) {
        setSelectedConnectionId((selectedId) =>
          selectedId && conns.some((connection) => connection.id === selectedId)
            ? selectedId
            : conns[0].id,
        );
      } else {
        setSelectedConnectionId(null);
        setIssues([]);
        setTotalIssues(0);
        setPullRequests([]);
        setTotalPrs(0);
        setRepoFiles([]);
        setTotalFiles(0);
      }
    } catch (err: any) {
      if (requestId === connectionRequestId.current) {
        setConnections([]);
        setSelectedConnectionId(null);
        setConnectionLoadError(
          err?.name === "AbortError"
            ? "Loading repositories took too long. Check your connection and try again."
            : "Could not load repositories. Check your connection and try again.",
        );
        if (err?.name !== "AbortError") {
          console.error("Failed to load GitHub connections:", err);
        }
      }
    } finally {
      window.clearTimeout(timeout);
      if (requestId === connectionRequestId.current) {
        setConnectionsProjectId(projectId);
        setLoadingConnection(false);
        connectionRequestController.current = null;
      }
    }
  }, [currentProject]);

  const loadIssues = useCallback(
    async (connId?: string) => {
      if (!currentProject) return;
      const requestId = ++issuesRequestId.current;
      setLoadingIssues(true);
      setGithubLoadErrors((previous) => ({ ...previous, issues: undefined }));
      try {
        const res = await api.integrations.github.listIssues(
          currentProject.id,
          {
            connectionId: connId,
            state: selectedState !== "all" ? selectedState : undefined,
            q: issueSearchQuery.trim() || undefined,
            limit: 50,
          },
        );
        if (requestId !== issuesRequestId.current) return;
        setIssues(res.items || []);
        setTotalIssues(res.total ?? res.items?.length ?? 0);
      } catch (err: any) {
        if (requestId === issuesRequestId.current) {
          setGithubLoadErrors((previous) => ({
            ...previous,
            issues: err.message || "Please try again.",
          }));
          console.error("Failed to load issues:", err);
        }
      } finally {
        if (requestId === issuesRequestId.current) setLoadingIssues(false);
      }
    },
    [currentProject, selectedState, issueSearchQuery],
  );

  const loadPullRequests = useCallback(
    async (connId?: string) => {
      if (!currentProject) return;
      const requestId = ++pullRequestsRequestId.current;
      setLoadingPrs(true);
      setGithubLoadErrors((previous) => ({ ...previous, pulls: undefined }));
      try {
        const res = await api.integrations.github.listPullRequests(
          currentProject.id,
          {
            connectionId: connId,
            state: prState !== "all" ? prState : undefined,
            q: prSearchQuery.trim() || undefined,
            limit: 50,
          },
        );
        if (requestId !== pullRequestsRequestId.current) return;
        setPullRequests(res.items || []);
        setTotalPrs(res.total ?? res.items?.length ?? 0);
      } catch (err: any) {
        if (requestId === pullRequestsRequestId.current) {
          setGithubLoadErrors((previous) => ({
            ...previous,
            pulls: err.message || "Please try again.",
          }));
          console.error("Failed to load PRs:", err);
        }
      } finally {
        if (requestId === pullRequestsRequestId.current) setLoadingPrs(false);
      }
    },
    [currentProject, prState, prSearchQuery],
  );

  const loadFiles = useCallback(
    async (connId?: string) => {
      if (!currentProject) return;
      const request = ++fileLoadRequest.current;
      setLoadingFiles(true);
      setGithubLoadErrors((previous) => ({ ...previous, code: undefined }));
      setRepoFiles([]);
      try {
        const first = await api.integrations.github.listFiles(
          currentProject.id,
          { connectionId: connId, limit: 100, page: 1 },
        );
        if (request !== fileLoadRequest.current) return;
        const files = [...(first.items || [])];
        for (let page = 2; files.length < first.total; page++) {
          const next = await api.integrations.github.listFiles(
            currentProject.id,
            { connectionId: connId, limit: 100, page },
          );
          if (request !== fileLoadRequest.current) return;
          if (!next.items?.length) break;
          files.push(...next.items);
        }
        if (request !== fileLoadRequest.current) return;
        setRepoFiles(files);
        setTotalFiles(first.total ?? files.length);
      } catch (err: any) {
        if (request === fileLoadRequest.current)
          setGithubLoadErrors((previous) => ({
            ...previous,
            code: err.message || "Please try again.",
          }));
        console.error("Failed to load files:", err);
      } finally {
        if (request === fileLoadRequest.current) setLoadingFiles(false);
      }
    },
    [currentProject],
  );

  // Load Personal Access Tokens
  const loadApiKeys = useCallback(async () => {
    setLoadingKeys(true);
    setApiKeysError(null);
    try {
      const keys = await api.auth.listApiKeys();
      setApiKeys(Array.isArray(keys) ? keys : []);
    } catch (err: any) {
      setApiKeysError(err.message || "Please try again.");
      console.error("Failed to load API keys:", err);
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
    loadApiKeys();
  }, [loadConnections, loadApiKeys]);

  useEffect(
    () => () => {
      connectionRequestId.current += 1;
      connectionRequestController.current?.abort();
    },
    [],
  );

  const activeRepositoryId =
    activeConnection?.status === "CONNECTED" ? activeConnection.id : undefined;
  useEffect(() => {
    if (activeRepositoryId) loadIssues(activeRepositoryId);
  }, [activeRepositoryId, loadIssues]);
  useEffect(() => {
    if (activeRepositoryId) loadPullRequests(activeRepositoryId);
  }, [activeRepositoryId, loadPullRequests]);
  useEffect(() => {
    if (activeRepositoryId) loadFiles(activeRepositoryId);
  }, [activeRepositoryId, loadFiles]);

  const handleConnectGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    const repository = parseGitHubRepositoryUrl(repositoryUrl);
    if (!repository) {
      setRepositoryUrlError(
        "Use a GitHub repository link, like https://github.com/owner/repository.",
      );
      return;
    }
    setRepositoryUrlError(null);
    setConnecting(true);
    const operation = new AbortController();
    syncRequest.current = operation;
    try {
      const newConn = await api.integrations.github.connect(currentProject.id, {
        ...repository,
        accessToken: token.trim() || undefined,
      });
      await syncGitHubPages(
        () =>
          api.integrations.github.sync(
            currentProject.id,
            newConn.id,
            token.trim() || undefined,
            operation.signal,
          ),
        operation.signal,
      );
      showToast(
        "Repository connected and issues and pull requests synced.",
        "success",
      );
      setShowConnectForm(false);
      setRepositoryUrl("");
      setToken("");
      setSelectedConnectionId(newConn.id);
      await loadConnections();
    } catch (err: any) {
      if (!operation.signal.aborted) {
        showToast(err.message || "Failed to connect repository", "error");
        await loadConnections();
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncGithub = async () => {
    if (!currentProject || !activeConnection) return;
    setSyncing(true);
    const operation = new AbortController();
    syncRequest.current = operation;
    try {
      const res = await syncGitHubPages(
        () =>
          api.integrations.github.sync(
            currentProject.id,
            activeConnection.id,
            syncAccessToken.trim() || undefined,
            operation.signal,
          ),
        operation.signal,
      );
      showToast(
        `Sync completed: ${res.issues} issues and ${res.pullRequests} pull requests updated.`,
        "success",
      );
      await loadConnections();
      await loadIssues(activeConnection.id);
      await loadPullRequests(activeConnection.id);
    } catch (err: any) {
      if (!operation.signal.aborted) {
        showToast(err.message || "Sync interrupted. Retry to resume.", "error");
        await loadConnections();
      }
    } finally {
      setSyncing(false);
      setSyncAccessToken("");
    }
  };

  const handleSyncCodebase = async () => {
    if (!currentProject || !activeConnection) return;
    setSyncingCode(true);
    setIndexProgress(null);
    let cursor = 0;
    let treeVersion: string | undefined;
    let indexed = 0;
    let unchanged = 0;
    try {
      while (true) {
        const res = await api.integrations.github.syncCode(
          currentProject.id,
          activeConnection.id,
          syncAccessToken.trim() || undefined,
          { cursor, treeVersion },
        );
        indexed += res.indexedFilesCount;
        unchanged += res.unchangedFilesCount;
        treeVersion = res.treeVersion;
        setIndexProgress({
          completed: res.nextCursor ?? res.candidateFilesCount,
          total: res.candidateFilesCount,
        });
        if (res.nextCursor === null) break;
        cursor = res.nextCursor;
      }
      await loadConnections();
      await loadFiles(activeConnection.id);
      showToast(
        `Indexing complete: ${indexed} files updated, ${unchanged} unchanged.`,
        "success",
      );
    } catch (err: any) {
      showToast(err.message || "Codebase indexing failed", "error");
      await loadConnections();
      await loadFiles(activeConnection.id);
    } finally {
      setSyncingCode(false);
      setSyncAccessToken("");
    }
  };

  const handleDisconnectGithub = async () => {
    if (!currentProject || !activeConnection) return;
    setDisconnecting(true);
    try {
      await api.integrations.github.disconnect(
        currentProject.id,
        activeConnection.id,
      );
      showToast("Repository disconnected successfully", "info");
      setShowDisconnectConfirm(false);
      await loadConnections();
    } catch (err: any) {
      showToast(err.message || "Failed to disconnect", "error");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const created = await api.auth.createApiKey({
        name: newKeyName.trim(),
        expiresInDays: newKeyExpiryDays > 0 ? newKeyExpiryDays : undefined,
      });
      showToast("Personal Access Token created successfully!", "success");
      setRevealedToken(created.rawToken || null);
      setNewKeyName("");
      await loadApiKeys();
    } catch (err: any) {
      showToast(err.message || "Failed to create token", "error");
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async () => {
    if (!keyToRevoke) return;
    setRevokingKey(true);
    try {
      await api.auth.revokeApiKey(keyToRevoke.id);
      showToast(`Revoked token "${keyToRevoke.name}"`, "info");
      setKeyToRevoke(null);
      await loadApiKeys();
    } catch (err: any) {
      showToast(err.message || "Failed to revoke token", "error");
    } finally {
      setRevokingKey(false);
    }
  };

  const copyToClipboard = async (text: string, isToken = false) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        const didCopy = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (!didCopy) throw new Error("Clipboard unavailable");
      }
    } catch {
      showToast(
        "Could not copy. Please select and copy the text manually.",
        "error",
      );
      return false;
    }
    if (isToken) {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
    showToast("Copied to clipboard!", "success");
    return true;
  };

  const projectKey = currentProject?.key || "AIW";

  const apiBaseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/v1`
      : "http://localhost:3001/api/v1";

  const activeTokenValue = revealedToken || "<YOUR_PERSONAL_ACCESS_TOKEN>";

  const universalAgentPrompt = `Configure and connect our OSCAR MCP (Model Context Protocol) server for this project repository.

### MCP Server Parameters:
- Server Command: node <PATH_TO_BACKEND>/dist/mcp/cli.js
- Environment Variables:
  OSCAR_API_URL: "${apiBaseUrl}"
  OSCAR_API_KEY: "${activeTokenValue}"
  OSCAR_PROJECT_ID: "${projectKey}"

### Instructions for Agent:
1. Detect my coding environment (Cursor, Claude Code, Codex, or Google Antigravity) and configure the "oscar" MCP server:
   - In Cursor: add to .cursor/mcp.json
   - In Claude Code: run \`claude mcp add oscar -e OSCAR_API_URL="${apiBaseUrl}" -e OSCAR_API_KEY="${activeTokenValue}" -e OSCAR_PROJECT_ID="${projectKey}" -- node "<PATH_TO_BACKEND>/dist/mcp/cli.js"\`
   - In Codex: add to .codex/config.toml or run \`codex mcp add oscar ...\`
   - In Antigravity: add to ~/.gemini/config/mcp_config.json or .agents/mcp_config.json
2. Test the connection by running MCP tool \`list_tasks\` for project "${projectKey}".
3. Available OSCAR MCP tools and resources:
   - Tasks & Kanban: list_tasks, get_task, create_task, update_task_status (real-time board sync)
   - Architecture ADRs: list_decisions, get_decision, propose_decision
   - Documents & RAG: list_documents, get_document, search_workspace (keyword, semantic, hybrid)
   - GitHub VCS: get_github_integration, list_github_issues
   - Workspace activity and projects: get_activity_stream, list_projects, get_project, list_project_members
   - Reviewed AI Actions: generate_decision_task_proposal, list_ai_proposals, get_ai_proposal, update_ai_proposal, confirm_ai_proposal, reject_ai_proposal
4. Workflow Rules:
   - Consult accepted architecture decisions (\`list_decisions\`) before making design changes.
   - AI generation saves drafts only. Review/edit with get_ai_proposal and update_ai_proposal, then confirm only user-authorized selected items using the current version and a stable idempotency key. Reuse that key when retrying. Reject unwanted drafts.
   - When any assigned task is completed and verified, automatically call \`update_task_status\` to set it to "DONE" on the OSCAR project task board.`;

  // Pre-formatted MCP Configs
  const cursorConfigJson = JSON.stringify(
    {
      mcpServers: {
        oscar: {
          command: "node",
          args: ["<PATH_TO_BACKEND>/dist/mcp/cli.js"],
          env: {
            OSCAR_API_URL: apiBaseUrl,
            OSCAR_API_KEY: activeTokenValue,
            OSCAR_PROJECT_ID: projectKey,
          },
        },
      },
    },
    null,
    2,
  );

  const claudeCodeCommand = `claude mcp add oscar -e OSCAR_API_URL="${apiBaseUrl}" -e OSCAR_API_KEY="${activeTokenValue}" -e OSCAR_PROJECT_ID="${projectKey}" -- node "<PATH_TO_BACKEND>/dist/mcp/cli.js"`;

  const codexConfigToml = `[mcp_servers.oscar]
command = "node"
args = ["<PATH_TO_BACKEND>/dist/mcp/cli.js"]
env_vars = ["OSCAR_API_KEY"]
tool_timeout_sec = 90

[mcp_servers.oscar.env]
OSCAR_API_URL = ${JSON.stringify(apiBaseUrl)}
OSCAR_PROJECT_ID = ${JSON.stringify(projectKey)}`;

  const codexCommand = `codex mcp add oscar --env OSCAR_API_URL="${apiBaseUrl}" --env OSCAR_API_KEY="${activeTokenValue}" --env OSCAR_PROJECT_ID="${projectKey}" -- node "<PATH_TO_BACKEND>/dist/mcp/cli.js"`;

  const antigravityConfigJson = JSON.stringify(
    {
      mcpServers: {
        oscar: {
          command: "node",
          args: ["<PATH_TO_BACKEND>/dist/mcp/cli.js"],
          env: {
            OSCAR_API_URL: apiBaseUrl,
            OSCAR_API_KEY: activeTokenValue,
            OSCAR_PROJECT_ID: projectKey,
          },
        },
      },
    },
    null,
    2,
  );

  const antigravityCommand = `agy mcp add oscar -- node "<PATH_TO_BACKEND>/dist/mcp/cli.js" -e OSCAR_API_URL="${apiBaseUrl}" -e OSCAR_API_KEY="${activeTokenValue}" -e OSCAR_PROJECT_ID="${projectKey}"`;

  // App catalog data
  const integrationCount = 5;

  const searchQuery = directorySearch.trim().toLowerCase();

  const isMcpVisible =
    (categoryFilter === "all" || categoryFilter === "ai") &&
    (!searchQuery ||
      "coding agents & mcp model context protocol claude cursor codex antigravity stdio json-rpc access tokens".includes(
        searchQuery,
      ));

  const isGithubVisible =
    (categoryFilter === "all" || categoryFilter === "vcs") &&
    (!searchQuery ||
      "github issues sync git repository version control pull requests".includes(
        searchQuery,
      ));

  const isHermesVisible =
    (categoryFilter === "all" || categoryFilter === "ai") &&
    (!searchQuery ||
      "hermes agent copilot runtime research pricing task drafts".includes(
        searchQuery,
      ));

  const isPlatformsVisible =
    (categoryFilter === "all" || categoryFilter === "ai") &&
    (!searchQuery ||
      "paperclip t3 code agent connections delegated work".includes(
        searchQuery,
      ));
  const hasAnyResults =
    isMcpVisible || isGithubVisible || isHermesVisible || isPlatformsVisible;

  return (
    <>
      <div className="integration-console space-y-6">
        {/* ========================================================================= */}
        {/* VIEW 1: APPS DIRECTORY / MARKETPLACE (MATCHING REFERENCE APP STORE)       */}
        {/* ========================================================================= */}
        {activeView === "directory" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Title */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif flex items-center gap-2.5">
                    <span>Apps & Integrations</span>
                    <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs font-semibold px-2 py-0.5">
                      {integrationCount} Integrations
                    </Badge>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Connect agents, repositories, and your coding tools.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    placeholder="Search apps & tools..."
                    className="w-full pl-9 pr-3 h-8 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-2xs"
                  />
                  {directorySearch && (
                    <button
                      type="button"
                      onClick={() => setDirectorySearch("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "all" as const, label: "All Integrations" },
                { id: "ai" as const, label: "Coding & AI Agents" },
                { id: "vcs" as const, label: "Version Control & Git" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCategoryFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    categoryFilter === f.id
                      ? "bg-slate-900 text-white font-semibold shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Empty State when search has zero matches */}
            {!hasAnyResults && (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <Search className="w-8 h-8 text-slate-300 mx-auto" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 font-serif">
                    No integrations found
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    No integrations or tools match &ldquo;{directorySearch}
                    &rdquo; in this filter.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDirectorySearch("");
                    setCategoryFilter("all");
                  }}
                  className="text-xs border-slate-200 text-slate-700"
                >
                  Reset Filters
                </Button>
              </div>
            )}

            {/* SECTION: Available Integrations */}
            {hasAnyResults && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-blue-600" />
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Available Integrations
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isHermesVisible && (
                    <HermesIntegration
                      projectId={currentProject?.id}
                      onOpen={() => navigateToView("hermes")}
                    />
                  )}
                  {/* APP CARD 1: Model Context Protocol (MCP) */}
                  {isMcpVisible && (
                    <div
                      onClick={() => navigateToView("mcp")}
                      className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs p-2">
                              <McpIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 font-serif group-hover:text-blue-600 transition-colors">
                                Coding Agents & MCP
                              </h3>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Model Context Protocol
                              </span>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60] border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A60]" />
                            Active
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed mb-4">
                          Connect external coding tools to search project
                          records and work with tasks, files, and decisions.
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            stdio JSON-RPC
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            {apiKeys.length}{" "}
                            {apiKeys.length === 1 ? "Token" : "Tokens"}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-slate-200 hover:bg-slate-50 gap-1 text-slate-700 font-medium"
                        >
                          <span>Configure</span>
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {(["paperclip", "t3"] as const)
                    .filter(
                      (platform) =>
                        isPlatformsVisible &&
                        (!searchQuery ||
                          (platform === "paperclip"
                            ? "paperclip agent orchestration"
                            : "t3 code coding agent"
                          ).includes(searchQuery)),
                    )
                    .map((platform) => (
                      <button
                        type="button"
                        key={platform}
                        onClick={() => navigateToView(platform)}
                        className="p-5 rounded-2xl bg-card border border-border text-left hover:bg-muted transition-colors flex flex-col gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <Boxes
                            className="h-5 w-5 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <h3 className="font-semibold">
                            {platform === "paperclip" ? "Paperclip" : "T3 Code"}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {platform === "paperclip"
                            ? "Connect Paperclip to assign work to your agents and review their results in OSCAR."
                            : "Connect T3 Code for supervised coding tasks and return results to your OSCAR chat."}
                        </p>
                        <span className="text-sm font-medium inline-flex items-center gap-1">
                          Manage connections <ChevronRight size={14} />
                        </span>
                      </button>
                    ))}
                  {/* APP CARD 2: GitHub Integration */}
                  {isGithubVisible && (
                    <div
                      onClick={() => navigateToView("github")}
                      className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                              <GithubIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 font-serif group-hover:text-blue-600 transition-colors">
                                GitHub Code & Repos
                              </h3>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Multi-Repo & Codebase
                              </span>
                            </div>
                          </div>

                          {connections.length > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60] border border-green-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A60]" />
                              {connections.length}{" "}
                              {connections.length === 1 ? "Repo" : "Repos"}{" "}
                              Connected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Available
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed mb-4">
                          Synchronize multiple repositories, pull requests,
                          issue discussions, and source code files directly into
                          vector memory for OSCAR context and evidence
                          citations.
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            REST + Git Trees
                          </span>
                          {connections.length > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {totalIssues} Issues • {totalPrs} PRs
                            </span>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-slate-200 hover:bg-slate-50 gap-1 text-slate-700 font-medium"
                        >
                          <span>
                            {connections.length > 0
                              ? "Manage Repos"
                              : "Connect"}
                          </span>
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: CODING AGENTS & MCP APP CONSOLE                                   */}
        {/* ========================================================================= */}
        {activeView === "hermes" && (
          <HermesIntegration
            key={currentProject?.id}
            projectId={currentProject?.id}
            detail
            onBack={() => navigateToView("directory")}
          />
        )}

        {["platforms", "paperclip", "t3"].includes(activeView) && (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => navigateToView("directory")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Integrations
            </button>
            <PlatformConnections
              key={`${currentProject?.id || "ALL"}:${activeView}`}
              platformType={
                activeView === "paperclip" || activeView === "t3"
                  ? activeView
                  : undefined
              }
            />
          </div>
        )}

        {activeView === "mcp" && (
          <McpConsole
            logo={<McpIcon className="h-6 w-6" />}
            projectKey={projectKey}
            projectName={currentProject?.name || "OSCAR"}
            apiUrl={apiBaseUrl}
            prompt={universalAgentPrompt}
            tokens={apiKeys}
            loadingTokens={loadingKeys}
            tokensError={apiKeysError}
            onBack={() => navigateToView("directory")}
            onCreateToken={() => {
              setRevealedToken(null);
              setShowCreateKeyModal(true);
            }}
            onRevokeToken={setKeyToRevoke}
            onReloadTokens={loadApiKeys}
            onCopy={copyToClipboard}
            editors={[
              {
                id: "cursor",
                name: "Cursor",
                icon: <CursorIcon className="h-4 w-4" />,
                snippets: [
                  {
                    id: "cursor-json",
                    title: ".cursor/mcp.json",
                    description:
                      "Add this configuration to your project. Replace the backend path and access token before connecting.",
                    code: cursorConfigJson,
                    copyLabel: "Copy JSON",
                  },
                ],
              },
              {
                id: "claude",
                name: "Claude Code",
                icon: <ClaudeIcon className="h-4 w-4" />,
                snippets: [
                  {
                    id: "claude-cli",
                    title: "Terminal",
                    description:
                      "Replace the backend path and access token, then run this command in your project terminal.",
                    code: claudeCodeCommand,
                    copyLabel: "Copy command",
                  },
                ],
              },
              {
                id: "codex",
                name: "Codex",
                icon: <CodexIcon className="h-4 w-4" />,
                snippets: [
                  {
                    id: "codex-cli",
                    title: "Terminal",
                    description:
                      "Replace the backend path and access token, then run this command in your project terminal.",
                    code: codexCommand,
                    copyLabel: "Copy command",
                  },
                  {
                    id: "codex-toml",
                    title: ".codex/config.toml",
                    description:
                      "Or use this config file. Set OSCAR_API_KEY in your environment before starting Codex, and replace the backend path.",
                    code: codexConfigToml,
                    copyLabel: "Copy TOML",
                  },
                ],
              },
              {
                id: "antigravity",
                name: "Antigravity",
                icon: <AntigravityIcon className="h-4 w-4" />,
                snippets: [
                  {
                    id: "antigravity-cli",
                    title: "Terminal",
                    description:
                      "Replace the backend path and access token, then run with the Antigravity CLI (agy).",
                    code: antigravityCommand,
                    copyLabel: "Copy command",
                  },
                  {
                    id: "antigravity-json",
                    title: "~/.gemini/config/mcp_config.json",
                    description:
                      "Or add this configuration to your config file or .agents/mcp_config.json. Replace the backend path and access token.",
                    code: antigravityConfigJson,
                    copyLabel: "Copy JSON",
                  },
                ],
              },
            ]}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: GITHUB ISSUES APP CONSOLE                                         */}
        {/* ========================================================================= */}
        {activeView === "github" && (
          <GitHubWorkspace
            projectId={currentProject?.id ?? null}
            connections={projectConnections}
            activeConnection={activeConnection}
            loadingConnection={isLoadingConnection}
            connectionLoadError={connectionLoadError}
            onRetryConnections={loadConnections}
            onSelectConnection={(id) => {
              setSelectedConnectionId(id);
              setFileSearchQuery("");
              setIssueSearchQuery("");
              setPrSearchQuery("");
            }}
            onBack={() => navigateToView("directory")}
            showConnectForm={showConnectForm}
            onToggleConnect={() => setShowConnectForm((v) => !v)}
            connecting={connecting}
            connectForm={{
              url: repositoryUrl,
              error: repositoryUrlError,
              token,
              setUrl: (value) => {
                setRepositoryUrl(value);
                setRepositoryUrlError(null);
              },
              setToken,
              onSubmit: handleConnectGithub,
            }}
            files={repoFiles}
            loadingFiles={loadingFiles}
            totalFiles={totalFiles}
            loadErrors={githubLoadErrors}
            onRetry={(view) => {
              if (!activeRepositoryId) return;
              if (view === "code") loadFiles(activeRepositoryId);
              else if (view === "issues") loadIssues(activeRepositoryId);
              else loadPullRequests(activeRepositoryId);
            }}
            fileQuery={fileSearchQuery}
            onFileQueryChange={setFileSearchQuery}
            issues={issues}
            totalIssues={totalIssues}
            loadingIssues={loadingIssues}
            issueQuery={issueSearchQuery}
            onIssueQueryChange={setIssueSearchQuery}
            issueState={selectedState}
            onIssueStateChange={setSelectedState}
            pullRequests={pullRequests}
            totalPrs={totalPrs}
            loadingPrs={loadingPrs}
            prQuery={prSearchQuery}
            onPrQueryChange={setPrSearchQuery}
            prState={prState}
            onPrStateChange={setPrState}
            syncing={syncing}
            syncingCode={syncingCode}
            indexProgress={indexProgress}
            onSync={handleSyncGithub}
            onIndex={handleSyncCodebase}
            onDisconnect={() => setShowDisconnectConfirm(true)}
            disconnecting={disconnecting}
            syncToken={syncAccessToken}
            onSyncTokenChange={setSyncAccessToken}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE API KEY / PAT                                               */}
      {/* ========================================================================= */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mcp-token-dialog-title"
            className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4"
          >
            {!revealedToken ? (
              <form onSubmit={handleCreateApiKey} className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3
                      id="mcp-token-dialog-title"
                      className="text-base font-semibold text-slate-900"
                    >
                      Create access token
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Connect an agent with your workspace permissions.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="mcp-token-name"
                    className="text-xs font-medium text-slate-700"
                  >
                    Token name
                  </label>
                  <Input
                    id="mcp-token-name"
                    autoFocus
                    required
                    placeholder="e.g. Claude Code CLI, Cursor MacBook"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="h-10 text-sm bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="mcp-token-expiration"
                    className="text-xs font-medium text-slate-700"
                  >
                    Expiration
                  </label>
                  <select
                    id="mcp-token-expiration"
                    value={newKeyExpiryDays}
                    onChange={(e) =>
                      setNewKeyExpiryDays(parseInt(e.target.value, 10))
                    }
                    className="w-full h-10 rounded-lg bg-white border border-slate-200 px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value={30}>30 Days</option>
                    <option value={60}>60 Days</option>
                    <option value={90}>90 Days (Recommended)</option>
                    <option value={365}>1 Year</option>
                    <option value={0}>Never Expires</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-800 leading-relaxed flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Tokens grant the authenticated agent your exact permissions
                    on this workspace. Keep your token secret and never commit
                    it to source control.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateKeyModal(false)}
                    disabled={creatingKey}
                    className="h-10 text-xs text-slate-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={creatingKey || !newKeyName.trim()}
                    className="h-10 bg-codex-accent hover:bg-codex-hover text-white text-xs px-4"
                  >
                    {creatingKey ? "Creating..." : "Create token"}
                  </Button>
                </div>
              </form>
            ) : (
              /* Token Reveal State (Once only!) */
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3
                      id="mcp-token-dialog-title"
                      className="text-base font-semibold text-slate-900"
                    >
                      Token created
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Copy and store this token now. It will not be shown again.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Make sure to copy your Personal Access Token now. For your
                    security, you will not be able to view it again after
                    closing this dialog.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Your Access Token
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={revealedToken}
                      className="h-9 text-xs bg-slate-50 border-slate-200 font-mono text-slate-800"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(revealedToken, true)}
                      className="h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white shrink-0 text-xs gap-1.5"
                    >
                      {copiedToken ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedToken ? "Copied" : "Copy"}</span>
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setRevealedToken(null);
                      setShowCreateKeyModal(false);
                    }}
                    className="bg-codex-accent hover:bg-codex-hover text-white text-xs px-5"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disconnect GitHub Modal */}
      <ConfirmModal
        isOpen={showDisconnectConfirm}
        onClose={() => !disconnecting && setShowDisconnectConfirm(false)}
        onConfirm={handleDisconnectGithub}
        title="Disconnect Repository"
        description="Are you sure you want to disconnect this repository? Synced issues will be unlinked from this workspace."
        confirmText="Disconnect"
        cancelText="Cancel"
        variant="danger"
        loading={disconnecting}
      />

      {/* Revoke Token Modal */}
      <ConfirmModal
        isOpen={!!keyToRevoke}
        onClose={() => !revokingKey && setKeyToRevoke(null)}
        onConfirm={handleRevokeApiKey}
        title="Revoke Personal Access Token"
        description={`Are you sure you want to revoke "${keyToRevoke?.name}"? Any coding agents using this token will immediately lose access.`}
        confirmText="Revoke Token"
        cancelText="Cancel"
        variant="danger"
        loading={revokingKey}
      />
    </>
  );
}
