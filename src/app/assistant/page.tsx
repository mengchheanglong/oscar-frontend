"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { WorkspaceIcon } from "@/components/workspace-icons";
import {
  ChatNavigationItem,
  type NavigationChat,
} from "@/components/ai/chat-navigation";
import { useProjectWorkspace } from "@/components/project-workspace";
import type { Project } from "@/context/auth-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import {
  Sparkles,
  Brain,
  Bot,
  Plus,
  Trash2,
  Search,
  PanelLeftClose,
  PanelLeft,
  Copy,
  Check,
  Filter,
  FileText,
  FileCheck2,
  GitPullRequest,
  CheckSquare,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ChevronDown,
  MessageSquare,
  Zap,
  Code2,
  TestTube,
  Layers,
  Server,
  Presentation,
  Eye,
  X,
  ArrowUpRight,
  ArrowLeft,
  FolderKanban,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { MarkdownContent } from "@/components/markdown-content";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import { CopilotComposer } from "@/components/ai/copilot-composer";
import {
  CopilotMemoryPanel,
  type MemoryDraft,
} from "@/components/ai/copilot-memory-panel";
import {
  useConversationWork,
  ConversationWorkStatus,
} from "@/components/ai/conversation-work";
import { agentRuns } from "@/lib/agent-runs";
import { DropdownSelect } from "@/components/ui/dropdown-select";

const getSourceLink = (
  sourceType: string,
  title: string,
  sourceId?: string,
) => {
  const cleanTitle = title.replace(/\s*\([^)]*\)$/, "").trim();
  const params = new URLSearchParams();
  if (sourceId) {
    params.set("id", sourceId);
  }
  if (cleanTitle) {
    params.set("search", cleanTitle);
  }
  const qs = params.toString() ? `?${params.toString()}` : "";

  switch (sourceType) {
    case "REQUIREMENT":
      return `/requirements${qs}`;
    case "DECISION":
      return `/decisions${qs}`;
    case "TASK":
      return `/tasks${qs}`;
    case "MEETING":
      return `/meetings${qs}`;
    case "DOCUMENT":
      return `/documents${qs}`;
    case "LOCAL_FILE":
      return "/documents";
    default:
      return `/search?q=${encodeURIComponent(cleanTitle || sourceId || "")}`;
  }
};

interface CitationItem {
  evidenceNumber?: number;
  chunkId: string;
  sourceId: string;
  sourceType: string;
  title: string;
  revision: number;
  locator?: string | null;
  score?: number;
  snippet?: string;
  projectName?: string;
  projectKey?: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  mode: string;
  content: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  contextExcluded?: boolean;
  citations: CitationItem[];
  modelName?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  createdAt: string;
}

interface Conversation {
  id: string;
  projectId: string;
  title: string;
  defaultMode: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
  projectKey?: string;
  projectName?: string;
}

const MODES = [
  {
    key: "WORKSPACE",
    label: "Assistant",
    icon: Bot,
    color: "text-indigo-600",
    desc: "Research, analysis, and project work",
  },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All project sources", icon: Filter },
  { value: "DOCUMENT", label: "Documents", icon: FileText },
  { value: "LOCAL_FILE", label: "Folder files", icon: FileText },
  { value: "REQUIREMENT", label: "Requirements", icon: FileCheck2 },
  { value: "DECISION", label: "Decisions", icon: GitPullRequest },
  { value: "TASK", label: "Tasks", icon: CheckSquare },
  { value: "MEETING", label: "Meetings", icon: Calendar },
];

const SOURCE_TYPE_ICONS: Record<string, React.ElementType> = {
  DOCUMENT: FileText,
  REQUIREMENT: FileCheck2,
  DECISION: GitPullRequest,
  TASK: CheckSquare,
  MEETING: Calendar,
};

function getModeConfig(key: string) {
  return MODES.find((m) => m.key === key) ?? MODES[0]!;
}

function UserAvatar({ name }: { name?: string }) {
  const initials = (name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs">
      {initials}
    </div>
  );
}

type DateGroup = "Today" | "Yesterday" | "Previous 7 Days" | "Older";

function groupConversationsByDate(
  conversations: Conversation[],
): Record<DateGroup, Conversation[]> {
  const groups: Record<DateGroup, Conversation[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOf7DaysAgo = startOfToday - 7 * 86400000;

  for (const conv of conversations) {
    const time = new Date(conv.updatedAt || conv.createdAt).getTime();
    if (time >= startOfToday) {
      groups["Today"].push(conv);
    } else if (time >= startOfYesterday) {
      groups["Yesterday"].push(conv);
    } else if (time >= startOf7DaysAgo) {
      groups["Previous 7 Days"].push(conv);
    } else {
      groups["Older"].push(conv);
    }
  }

  return groups;
}

export default function AssistantPage() {
  const { currentProject, user, projects, setCurrentProject } = useAuth();
  const projectWorkspace = useProjectWorkspace();
  const requestedChat = useRef<Conversation | null>(null);
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const selectedMode = "WORKSPACE";
  const [useTools, setUseTools] = useState(false);
  const workRequest = useRef<{
    conversationId: string;
    prompt: string;
    key: string;
  } | null>(null);
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false);
  const [memoryDraft, setMemoryDraft] = useState<MemoryDraft | null>(null);
  const memoryProjectId = activeConv?.projectId || currentProject?.id;
  useEffect(() => {
    setMemoryPanelOpen(false);
    setMemoryDraft(null);
    setUseTools(false);
  }, [memoryProjectId, currentProject?.id, user?.id]);
  const currentView = useRef({
    conversationId: activeConv?.id,
    projectId: currentProject?.id,
    userId: user?.id,
  });
  currentView.current = {
    conversationId: activeConv?.id,
    projectId: currentProject?.id,
    userId: user?.id,
  };
  const [inputContent, setInputContent] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const skipLoadMessagesRef = useRef<string | null>(null);
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [failedRequest, setFailedRequest] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const messageLoadRef = useRef(0);
  const historyLoadRef = useRef(0);
  const invalidateHistoryLoads = useCallback(() => {
    historyLoadRef.current++;
  }, []);
  const invalidateMessageLoads = useCallback(() => {
    messageLoadRef.current++;
  }, []);
  const invalidateAllLoads = useCallback(() => {
    historyLoadRef.current++;
    messageLoadRef.current++;
  }, []);
  const sendInFlightRef = useRef(false);
  const draftsRef = useRef<Record<string, string>>({});
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [excludeTarget, setExcludeTarget] = useState<{
    projectId: string;
    conversationId: string;
    messageId: string;
  } | null>(null);
  const [isExcluding, setIsExcluding] = useState(false);
  useEffect(() => {
    setExcludeTarget(null);
  }, [activeConv?.id, currentProject?.id, user?.id]);
  const [allProjectConvIds, setAllProjectConvIds] = useState<Set<string>>(
    () => {
      if (typeof window === "undefined") return new Set();
      try {
        const stored = localStorage.getItem("aiw_all_project_convs");
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    },
  );

  const markAsAllProjectConv = useCallback((id: string) => {
    setAllProjectConvIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(
          "aiw_all_project_convs",
          JSON.stringify(Array.from(next)),
        );
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  // Search in conversation history
  const [convSearch, setConvSearch] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [inspectingCitation, setInspectingCitation] =
    useState<CitationItem | null>(null);
  const [inspectingDetails, setInspectingDetails] = useState<any | null>(null);
  const [loadingInspectDetails, setLoadingInspectDetails] =
    useState<boolean>(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const inspectorRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (
      inspectingCitation &&
      inspectorRef.current &&
      !inspectorRef.current.open
    )
      inspectorRef.current.showModal();
  }, [inspectingCitation]);

  // Fetch complete entity records when inspecting citation in-app
  useEffect(() => {
    const matchedProj = projects.find(
      (p) =>
        p.key === inspectingCitation?.projectKey ||
        p.name === inspectingCitation?.projectName,
    );
    const targetProjId =
      matchedProj?.id ||
      activeConv?.projectId ||
      currentProject?.id ||
      projects[0]?.id;
    if (!inspectingCitation || !targetProjId) {
      setInspectingDetails(null);
      return;
    }
    let isCancelled = false;
    setLoadingInspectDetails(true);
    setInspectingDetails(null);
    setInspectError(null);

    const loadDetails = async () => {
      try {
        const id = inspectingCitation.sourceId;
        const type = inspectingCitation.sourceType;
        if (!id) return;

        if (type === "TASK") {
          const found = await api.tasks.get(targetProjId, id);
          if (!isCancelled && found) setInspectingDetails(found);
        } else if (type === "DECISION") {
          const list = await api.decisions.list(targetProjId);
          const found = (Array.isArray(list) ? list : []).find(
            (d: any) => d.id === id,
          );
          if (!isCancelled && found) setInspectingDetails(found);
        } else if (type === "REQUIREMENT") {
          const list = await api.requirements.list(targetProjId);
          const found = (Array.isArray(list) ? list : []).find(
            (r: any) => r.id === id,
          );
          if (!isCancelled && found) setInspectingDetails(found);
        } else if (type === "MEETING") {
          const list = await api.meetings.list(targetProjId);
          const found = (Array.isArray(list) ? list : []).find(
            (m: any) => m.id === id,
          );
          if (!isCancelled && found) setInspectingDetails(found);
        } else if (type === "DOCUMENT") {
          const res = await api.documents.list(targetProjId);
          const items = Array.isArray(res)
            ? res
            : (res as any)?.data || (res as any)?.items || [];
          const found = items.find((d: any) => d.id === id);
          if (!isCancelled && found) setInspectingDetails(found);
        } else if (type === "LOCAL_FILE") {
          const sources = await api.ingestion.listSources(targetProjId, {
            sourceType: "LOCAL_FILE",
          });
          const source = sources.find((item) => item.sourceId === id);
          if (!source) throw new Error("Local source is no longer indexed.");
          const found = await api.ingestion.getSource(targetProjId, source.id);
          if (!isCancelled) setInspectingDetails(found);
        }
      } catch (err) {
        if (!isCancelled)
          setInspectError(
            "The full source record couldn’t be loaded. You can still review the evidence excerpt or open the source.",
          );
      } finally {
        if (!isCancelled) setLoadingInspectDetails(false);
      }
    };

    void loadDetails();

    return () => {
      isCancelled = true;
    };
  }, [inspectingCitation, activeConv?.projectId, currentProject?.id, projects]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);

  useEffect(() => {
    const container = messageScrollRef.current;
    if (!container) return;
    if (messages.length === 0 && !isSending) container.scrollTo({ top: 0 });
    else if (stickToBottomRef.current)
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  const loadConversations = useCallback(async () => {
    const request = ++historyLoadRef.current;
    setIsLoading(true);
    setHistoryError(null);
    try {
      const results = await Promise.allSettled(
        projects.map(async (project) => {
          const list = await api.ai.listConversations(project.id);
          return (Array.isArray(list) ? list : []).map((conversation) => ({
            ...conversation,
            projectKey: allProjectConvIds.has(conversation.id)
              ? "ALL"
              : project.key,
            projectName: allProjectConvIds.has(conversation.id)
              ? "All Workspaces"
              : project.name,
          }));
        }),
      );
      if (request !== historyLoadRef.current) return;
      const list: Conversation[] = [];
      for (const result of results)
        if (result.status === "fulfilled") list.push(...result.value);
      list.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setConversations(list);
      if (results.some((result) => result.status === "rejected")) {
        setHistoryError(
          "Some chats could not be loaded. Retry to refresh them.",
        );
      }
    } catch (err) {
      if (request === historyLoadRef.current)
        setHistoryError(
          err instanceof Error ? err.message : "Could not load conversations.",
        );
    } finally {
      if (request === historyLoadRef.current) setIsLoading(false);
    }
  }, [projects, allProjectConvIds]);

  const loadMessages = useCallback(
    async (convId: string, convProjectId?: string) => {
      const targetProjId =
        convProjectId ||
        activeConv?.projectId ||
        currentProject?.id ||
        projects[0]?.id;
      if (!targetProjId) return;
      const request = ++messageLoadRef.current;
      setMessages([]);
      setIsLoadingMessages(true);
      setMessagesError(null);
      try {
        const res = await api.ai.listMessages(targetProjId, convId);
        if (request !== messageLoadRef.current) return;
        const fetched = Array.isArray(res) ? res : [];
        const citedProjects = new Set<string>();
        for (const msg of fetched) {
          if (msg.citations && Array.isArray(msg.citations)) {
            for (const cit of msg.citations) {
              if (cit.projectKey) citedProjects.add(cit.projectKey);
            }
          }
        }
        if (citedProjects.size > 1) {
          markAsAllProjectConv(convId);
        }
        setMessages((prev) => {
          // Keep any active optimistic user messages so they never vanish
          const optimistic = prev.filter((m) => m.id.startsWith("temp-"));
          if (optimistic.length > 0) {
            const fetchedIds = new Set(fetched.map((m) => m.id));
            return [
              ...fetched,
              ...optimistic.filter((m) => !fetchedIds.has(m.id)),
            ];
          }
          return fetched;
        });
      } catch (err) {
        if (request === messageLoadRef.current)
          setMessagesError(
            err instanceof Error ? err.message : "Could not load messages.",
          );
      } finally {
        if (request === messageLoadRef.current) setIsLoadingMessages(false);
      }
    },
    [activeConv?.projectId, currentProject?.id, projects, markAsAllProjectConv],
  );

  const work = useConversationWork(
    activeConv?.projectId || currentProject?.id,
    activeConv?.id,
    () => {
      if (activeConv && !sendInFlightRef.current)
        void loadMessages(activeConv.id, activeConv.projectId);
    },
  );

  const draftKey = activeConv?.id || `new:${currentProject?.id || "all"}`;
  useEffect(() => {
    invalidateMessageLoads();
    const requested = requestedChat.current;
    requestedChat.current = null;
    setActiveConv(requested);
    setMessages([]);
    setIsLoadingMessages(false);
    setInputContent(
      draftsRef.current[
        requested?.id || `new:${currentProject?.id || "all"}`
      ] || "",
    );
    setSendError(null);
    setFailedRequest(null);
    setMessagesError(null);
    setInspectingCitation(null);
    // Only a project identity change starts another conversation; metadata refreshes preserve drafts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id, user?.id, invalidateMessageLoads]);

  useEffect(() => {
    void loadConversations();
    return invalidateHistoryLoads;
  }, [loadConversations, invalidateHistoryLoads]);
  useEffect(() => invalidateAllLoads, [invalidateAllLoads]);

  useEffect(() => {
    if (!activeConv) {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }
    // If this conversation was just newly created, skip fetching empty message list from server
    if (skipLoadMessagesRef.current === activeConv.id) {
      skipLoadMessagesRef.current = null;
      setIsLoadingMessages(false);
      return;
    }
    void loadMessages(activeConv.id, activeConv.projectId);

    stickToBottomRef.current = true;
    setShowScrollToLatest(false);
    return invalidateMessageLoads;
  }, [activeConv, loadMessages, invalidateMessageLoads]);

  const handleResetChat = () => {
    if (sendInFlightRef.current) return;
    draftsRef.current[draftKey] = inputContent;
    messageLoadRef.current++;
    setActiveConv(null);
    setMessages([]);

    setIsLoadingMessages(false);
    setInputContent("");
    setSendError(null);
    setFailedRequest(null);
    setMessagesError(null);
    if (window.innerWidth < 1024) setSidebarOpen(false);
    textareaRef.current?.focus();
  };

  const selectConversation = (conversation: Conversation) => {
    if (sendInFlightRef.current) return;
    draftsRef.current[draftKey] = inputContent;
    setInputContent(draftsRef.current[conversation.id] || "");
    setSendError(null);
    setFailedRequest(null);
    const project = allProjectConvIds.has(conversation.id)
      ? null
      : projects.find((project) => project.id === conversation.projectId) ||
        null;
    if (project?.id !== currentProject?.id) {
      requestedChat.current = conversation;
      setCurrentProject(project);
    } else setActiveConv(conversation);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const confirmDeleteConversation = async () => {
    if (!deleteTargetId) return;
    const targetConv = conversations.find((c) => c.id === deleteTargetId);
    const targetProjectId = targetConv?.projectId || currentProject?.id;
    if (!targetProjectId) return;
    setIsDeleting(true);
    try {
      await api.ai.deleteConversation(targetProjectId, deleteTargetId);
      const updated = conversations.filter((c) => c.id !== deleteTargetId);
      setConversations(updated);
      if (activeConv?.id === deleteTargetId) {
        setActiveConv(null);
        setMessages([]);
      }
      setDeleteTargetId(null);
      showToast("Conversation deleted", "info");
    } catch (err: any) {
      showToast(err.message || "Failed to delete conversation", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyMessage = async (msgId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {
      showToast(
        "Could not copy. Select the response and copy it manually.",
        "error",
      );
    }
  };

  const confirmExcludeMessage = async () => {
    if (!excludeTarget || isExcluding || isSending) return;
    const target = excludeTarget;
    const request = messageLoadRef.current;
    setIsExcluding(true);
    try {
      await api.ai.excludeMessageContext(
        target.projectId,
        target.conversationId,
        target.messageId,
      );
      setExcludeTarget(null);
      showToast("Message excluded from future context", "info");
      if (request === messageLoadRef.current) {
        setMessages((previous) =>
          previous.map((message) =>
            message.id === target.messageId || message.role === "assistant"
              ? { ...message, contextExcluded: true }
              : message,
          ),
        );
      }
      try {
        const refreshed = await api.ai.listMessages(
          target.projectId,
          target.conversationId,
        );
        if (request === messageLoadRef.current)
          setMessages(Array.isArray(refreshed) ? refreshed : []);
      } catch {
        showToast(
          "Context excluded, but messages could not refresh. Reopen this chat.",
          "error",
        );
      }
    } catch (error: unknown) {
      showToast(
        error instanceof Error
          ? error.message
          : "Could not update message context",
        "error",
      );
    } finally {
      setIsExcluding(false);
    }
  };

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const text = (
        textToSend !== undefined ? textToSend : inputContent
      ).trim();
      const targetProjectId =
        activeConv?.projectId || currentProject?.id || projects[0]?.id;
      if (
        !text ||
        sendInFlightRef.current ||
        work.active ||
        isLoadingMessages ||
        !targetProjectId
      )
        return;
      if (useTools && (!currentProject || text.length > 4000)) {
        setSendError(
          "Choose a project and keep tool requests under 4,000 characters.",
        );
        return;
      }
      const origin = { ...currentView.current };
      const inView = (conversationId = origin.conversationId) =>
        currentView.current.userId === origin.userId &&
        currentView.current.projectId === origin.projectId &&
        currentView.current.conversationId === conversationId;
      sendInFlightRef.current = true;
      messageLoadRef.current++;
      stickToBottomRef.current = true;
      setShowScrollToLatest(false);
      setFailedRequest(null);

      setSendError(null);
      setIsSending(true);
      delete draftsRef.current[draftKey];
      setInputContent("");

      const optimisticId = "temp-" + Date.now();
      const optimisticMsg: ChatMessage = {
        id: optimisticId,
        conversationId: activeConv?.id ?? "temp-conv",
        role: "user",
        mode: selectedMode,
        content: text,
        status: "COMPLETED",
        citations: [],
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      let conv = activeConv;
      if (!conv) {
        try {
          const rawConv = await api.ai.createConversation(targetProjectId, {
            title: text.length > 45 ? text.slice(0, 42) + "..." : text,
            defaultMode: selectedMode,
          });
          if (!rawConv)
            throw new Error("Conversation creation returned empty response");
          if (!inView()) {
            sendInFlightRef.current = false;
            setIsSending(false);
            return;
          }
          currentView.current.conversationId = rawConv.id;
          const targetProj = projects.find((p) => p.id === targetProjectId);
          const isAllMode = !currentProject;
          if (isAllMode) {
            markAsAllProjectConv(rawConv.id);
          }
          const createdConv: Conversation = {
            ...rawConv,
            projectKey: isAllMode ? "ALL" : targetProj?.key,
            projectName: isAllMode ? "All Workspaces" : targetProj?.name,
          };
          conv = createdConv;
          skipLoadMessagesRef.current = createdConv.id;
          setActiveConv(createdConv);
          setConversations((prev) => [createdConv, ...prev]);
        } catch (err: any) {
          if (!inView()) {
            sendInFlightRef.current = false;
            setIsSending(false);
            return;
          }
          setSendError(
            err?.message ?? "Failed to create conversation. Are you logged in?",
          );
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
          setFailedRequest(text);
          setInputContent((draft) => draft || text);
          sendInFlightRef.current = false;
          setIsSending(false);
          return;
        }
      }

      if (!conv) {
        sendInFlightRef.current = false;
        setIsSending(false);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        return;
      }

      try {
        const postProjId = conv.projectId || targetProjectId;
        if (useTools) {
          if (
            !workRequest.current ||
            workRequest.current.conversationId !== conv.id ||
            workRequest.current.prompt !== text
          )
            workRequest.current = {
              conversationId: conv.id,
              prompt: text,
              key: crypto.randomUUID(),
            };
          const run = await agentRuns.create(
            postProjId,
            text,
            workRequest.current.key,
            conv.id,
          );
          work.record(run);
          const latest = await api.ai.listMessages(postProjId, conv.id);
          if (inView(conv.id)) setMessages(latest);
          workRequest.current = null;
          return;
        }
        const res = await api.ai.postMessage(postProjId, conv.id, {
          content: text,
          mode: selectedMode,
          includeAllWorkspaces: !currentProject,
        });

        if (!inView(conv.id)) return;
        const { userMessage, assistantMessage } = res;
        if (!currentProject && conv) {
          markAsAllProjectConv(conv.id);
        }

        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimisticId),
          userMessage,
          assistantMessage,
        ]);

        setConversations((prev) =>
          prev.map((c) =>
            c.id === conv!.id
              ? {
                  ...c,
                  title:
                    c.title === "New Conversation" || !c.title
                      ? text.slice(0, 45)
                      : c.title,
                  projectKey: !currentProject ? "ALL" : c.projectKey,
                  projectName: !currentProject
                    ? "All Workspaces"
                    : c.projectName,
                }
              : c,
          ),
        );
      } catch (err: any) {
        if (!inView(conv.id)) return;
        setSendError(err?.message ?? "Failed to send message");
        setFailedRequest(text);
        setInputContent((draft) => draft || text);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      } finally {
        sendInFlightRef.current = false;
        setIsSending(false);
      }
    },
    [
      activeConv,
      currentProject,
      projects,
      inputContent,
      draftKey,
      isLoadingMessages,
      selectedMode,
      markAsAllProjectConv,
      useTools,
      work,
    ],
  );

  const closeNavigation = useCallback(() => setSidebarOpen(false), []);
  const updateChat = (chat: NavigationChat) => {
    setConversations((previous) =>
      previous.map((item) =>
        item.id === chat.id ? { ...item, ...chat } : item,
      ),
    );
    setActiveConv((previous) =>
      previous?.id === chat.id ? { ...previous, ...chat } : previous,
    );
  };
  const chatItem = (chat: Conversation) => (
    <ChatNavigationItem
      key={chat.id}
      chat={chat}
      active={activeConv?.id === chat.id}
      disabled={isSending || work.active}
      onSelect={() => selectConversation(chat)}
      onChanged={updateChat}
      onDelete={() => setDeleteTargetId(chat.id)}
    />
  );
  const projectChats: Record<string, React.ReactNode> = {};
  for (const project of projects) {
    projectChats[project.id] = (
      <>
        {currentProject?.id === project.id && !activeConv && (
          <button
            type="button"
            className="project-draft-chat"
            aria-current="page"
            onClick={handleResetChat}
          >
            New chat
          </button>
        )}
        {conversations
          .filter((chat) => chat.projectId === project.id)
          .map(chatItem)}
      </>
    );
  }
  const rootChats = conversations.filter(
    (chat) =>
      chat.isPinned || !currentProject || chat.projectId !== currentProject.id,
  );
  const pinnedChats = rootChats.filter((chat) => chat.isPinned);
  const recentChats = rootChats.filter((chat) => !chat.isPinned);
  const chatHistory = (
    <div className="space-y-1">
      {isLoading && (
        <p role="status" className="px-3 py-2 text-xs text-slate-400">
          Loading chats…
        </p>
      )}
      {historyError && (
        <button
          type="button"
          onClick={() => void loadConversations()}
          className="px-3 py-2 text-xs text-slate-400"
        >
          {historyError}
        </button>
      )}
      {pinnedChats.map(chatItem)}
      {pinnedChats.length > 0 && recentChats.length > 0 && (
        <div className="workspace-menu-divider" />
      )}
      {recentChats.map(chatItem)}
      {!isLoading && !historyError && !rootChats.length && (
        <p className="px-3 py-2 text-xs text-slate-500">
          Your recent chats appear here.
        </p>
      )}
    </div>
  );
  const newProjectChat = (project: Project) => {
    if (sendInFlightRef.current || work.active) return;
    if (currentProject?.id !== project.id) setCurrentProject(project);
    else handleResetChat();
  };
  const isNewChat =
    messages.length === 0 &&
    !isSending &&
    !isLoadingMessages &&
    !messagesError &&
    projects.length > 0;

  return (
    <AppLayout
      projectChats={projectChats}
      onNewProjectChat={newProjectChat}
      chatHistory={chatHistory}
      onNewChat={() => {
        if (sendInFlightRef.current || work.active) return;
        if (currentProject) setCurrentProject(null);
        else handleResetChat();
      }}
      navigationOpen={sidebarOpen}
      onCloseNavigation={closeNavigation}
    >
      <div className="relative flex h-full min-h-0 w-full overflow-hidden chat-canvas">
        <section
          aria-label="Copilot conversation"
          className="flex min-w-0 flex-1 flex-col overflow-hidden chat-canvas"
        >
          <header className="chat-header">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((open) => !open)}
                aria-label="Open navigation"
                aria-expanded={sidebarOpen}
                className="workspace-icon-button md:hidden"
              >
                <WorkspaceIcon name="panel" />
              </button>
              <div className="chat-header-title">{activeConv?.title || ""}</div>
            </div>
            <div className="chat-header-actions">
              {currentProject && (
                <button
                  type="button"
                  aria-label="Open project settings"
                  onClick={() => projectWorkspace.openPanel(currentProject)}
                  className="workspace-icon-button"
                >
                  <WorkspaceIcon name="panel" />
                </button>
              )}
              <button
                type="button"
                aria-label="Memory"
                disabled={!memoryProjectId}
                onClick={() => {
                  setMemoryDraft(null);
                  setMemoryPanelOpen(true);
                }}
                className="workspace-icon-button disabled:opacity-40"
                title="Memory"
              >
                <Brain className="h-5 w-5" />
              </button>
              {projects.length > 0 && (
                <DropdownSelect
                  value={currentProject?.id ?? "ALL"}
                  onChange={(val) => {
                    if (val === "ALL") {
                      setCurrentProject(null);
                    } else {
                      const p = projects.find((proj) => proj.id === val);
                      if (p) setCurrentProject(p);
                    }
                  }}
                  placeholder="All Projects"
                  triggerClassName="chat-project-trigger"
                  options={[
                    {
                      value: "ALL",
                      label: "All Projects",
                      icon: (
                        <Layers className="w-3.5 h-3.5 text-codex-accent shrink-0" />
                      ),
                    },
                    ...projects.map((p) => ({
                      value: p.id,
                      label: `[${p.key}] ${p.name}`,
                      icon: (
                        <FolderKanban className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      ),
                    })),
                  ]}
                />
              )}
            </div>
          </header>

          {/* Messages Stream / Hero Canvas */}
          <div
            className={
              isNewChat ? "relative shrink-0" : "relative min-h-0 flex-1"
            }
          >
            <div
              ref={messageScrollRef}
              onScroll={(event) => {
                const container = event.currentTarget;
                const nearBottom =
                  container.scrollHeight -
                    container.scrollTop -
                    container.clientHeight <
                  80;
                stickToBottomRef.current = nearBottom;
                setShowScrollToLatest(!nearBottom && messages.length > 0);
              }}
              className={
                isNewChat
                  ? "px-3 sm:px-6"
                  : "h-full overflow-y-auto px-3 py-6 sm:px-6 space-y-6"
              }
            >
              {messagesError ? (
                <div
                  role="alert"
                  className="mx-auto max-w-md space-y-3 rounded-xl border border-slate-200 p-6 text-center"
                >
                  <AlertCircle className="mx-auto h-6 w-6 text-slate-400" />
                  <h2 className="text-sm font-medium text-slate-700">
                    Couldn’t load this conversation
                  </h2>
                  <p className="text-xs text-slate-500">{messagesError}</p>
                  <button
                    type="button"
                    onClick={() =>
                      activeConv && void loadMessages(activeConv.id)
                    }
                    className="text-xs font-medium text-codex-accent hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : isLoadingMessages ? (
                /* Loading Skeleton when switching conversations */
                <div className="max-w-3xl mx-auto space-y-6 pt-6">
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 animate-pulse shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-100 rounded-md w-24 animate-pulse" />
                      <div className="h-16 bg-slate-100 rounded-2xl w-3/4 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex gap-3 items-start flex-row-reverse">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 animate-pulse shrink-0" />
                    <div className="space-y-2 flex-1 flex flex-col items-end">
                      <div className="h-4 bg-slate-100 rounded-md w-16 animate-pulse" />
                      <div className="h-12 bg-slate-100 rounded-2xl w-1/2 animate-pulse" />
                    </div>
                  </div>
                </div>
              ) : projects.length === 0 ? (
                <div className="mx-auto max-w-md py-12 text-center">
                  <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-codex-accent">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h2 className="font-serif text-xl font-bold tracking-tight text-slate-900">
                    No Project Workspaces Found
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Create your first project workspace to start using AI
                    Copilot.
                  </p>
                  <div className="mt-6 flex justify-center">
                    <Link
                      href="/projects"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-codex-accent text-white text-xs font-medium shadow-xs hover:bg-codex-hover"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Project</span>
                    </Link>
                  </div>
                </div>
              ) : messages.length === 0 && !isSending ? (
                <div className="chat-welcome">
                  <h2>{currentProject?.name || "What should we explore?"}</h2>
                </div>
              ) : (
                /* Message Bubbles */
                messages.map((msg) => {
                  const isAssistant = msg.role === "assistant";
                  const run = work.runs.find(
                    (r) => r.assistantMessageId === msg.id,
                  );
                  const isFailed = msg.status === "FAILED";
                  const isInsufficient =
                    msg.content
                      .toLowerCase()
                      .includes("insufficient evidence") ||
                    msg.content
                      .toLowerCase()
                      .includes("no relevant project evidence");

                  return (
                    <div
                      key={msg.id}
                      data-message-role={msg.role}
                      className={`chat-message flex gap-3 items-start ${
                        !isAssistant ? "flex-row-reverse" : ""
                      }`}
                    >
                      <div className="chat-avatar">
                        {isAssistant ? (
                          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                            <Bot className="w-4 h-4" />
                          </div>
                        ) : (
                          <UserAvatar
                            name={user?.displayName ?? user?.fullName}
                          />
                        )}
                      </div>

                      <div
                        className={`space-y-1.5 ${
                          isAssistant
                            ? "min-w-0 flex-1"
                            : "min-w-0 max-w-[85%] sm:max-w-[75%]"
                        }`}
                      >
                        {/* Meta header */}
                        <div
                          className={`chat-meta flex flex-wrap items-center gap-2 text-[10px] text-slate-400 ${
                            !isAssistant ? "flex-row-reverse" : ""
                          }`}
                        >
                          <span className="font-semibold text-slate-700">
                            {isAssistant
                              ? "AI Copilot"
                              : (user?.displayName ?? "You")}
                          </span>
                          {isAssistant && (
                            <span className="chat-mode-badge text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                              {getModeConfig(msg.mode).label}
                            </span>
                          )}
                          <span>{formatDateTime(msg.createdAt)}</span>
                          {msg.contextExcluded ? (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                              Excluded from context
                            </span>
                          ) : msg.status === "COMPLETED" &&
                            !msg.id.startsWith("temp-") &&
                            activeConv ? (
                            <button
                              type="button"
                              disabled={isSending || isExcluding}
                              onClick={() =>
                                setExcludeTarget({
                                  projectId: activeConv.projectId,
                                  conversationId: activeConv.id,
                                  messageId: msg.id,
                                })
                              }
                              className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-codex-accent disabled:opacity-50"
                            >
                              Exclude from context…
                            </button>
                          ) : null}
                        </div>

                        {/* Bubble Body */}
                        <div
                          className={`chat-bubble ${isAssistant ? "chat-bubble-assistant" : "chat-bubble-user"} rounded-2xl p-4 sm:p-5 space-y-3 ${
                            isAssistant
                              ? isFailed
                                ? "bg-rose-50 border border-rose-200 text-rose-700"
                                : "bg-white border border-slate-200/90 shadow-xs text-slate-800"
                              : "bg-slate-900 text-white shadow-xs"
                          }`}
                        >
                          {run && (
                            <ConversationWorkStatus
                              run={run}
                              onChanged={work.refresh}
                              canRetry={work.available && !work.active}
                              onRetry={(prompt) => {
                                setInputContent(prompt);
                                setUseTools(true);
                                textareaRef.current?.focus();
                              }}
                            />
                          )}
                          {isAssistant && isInsufficient && (
                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-amber-800">
                                  Evidence limitation
                                </p>
                                <p className="text-[11px] text-amber-700 mt-0.5">
                                  The retrieved evidence may not fully answer
                                  this question. Review the response and
                                  available sources.
                                </p>
                              </div>
                            </div>
                          )}

                          {isAssistant ? (
                            <div className="text-sm leading-7 text-slate-800">
                              <MarkdownContent content={msg.content} />
                              {msg.status === "COMPLETED" &&
                                !msg.id.startsWith("temp-") && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMemoryDraft({
                                        content: msg.content,
                                        sourceMessageId: msg.id,
                                      });
                                      setMemoryPanelOpen(true);
                                    }}
                                    className="mt-3 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
                                  >
                                    Remember…
                                  </button>
                                )}
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-white">
                              {msg.content}
                            </p>
                          )}

                          {isAssistant && msg.citations?.length > 0 && (
                            <details className="group border-t border-slate-100 pt-3">
                              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md py-1 text-xs font-medium text-slate-500 hover:text-slate-800 [&::-webkit-details-marker]:hidden">
                                <FileText className="h-3.5 w-3.5" /> Sources{" "}
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">
                                  {msg.citations.length}
                                </span>
                                <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                              </summary>
                              <div className="mt-3 space-y-2">
                                {msg.citations.map((citation, index) => {
                                  const Icon =
                                    SOURCE_TYPE_ICONS[citation.sourceType] ||
                                    FileText;
                                  const citationKey =
                                    msg.id +
                                    ":" +
                                    citation.chunkId +
                                    ":" +
                                    index;
                                  const expanded =
                                    expandedCitation === citationKey;
                                  return (
                                    <div
                                      key={citationKey}
                                      className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60"
                                    >
                                      <div className="flex items-center gap-1 pr-2">
                                        <button
                                          type="button"
                                          aria-expanded={expanded}
                                          aria-label={`${expanded ? "Hide" : "Show"} evidence from ${citation.title}`}
                                          onClick={() =>
                                            setExpandedCitation(
                                              expanded ? null : citationKey,
                                            )
                                          }
                                          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-3 text-left text-xs text-slate-600 hover:bg-slate-100"
                                        >
                                          <span className="shrink-0 font-mono text-[10px] text-slate-400">
                                            [
                                            {citation.evidenceNumber ??
                                              index + 1}
                                            ]
                                          </span>
                                          {citation.projectKey && (
                                            <span className="shrink-0 rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
                                              {citation.projectKey}
                                            </span>
                                          )}
                                          <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                          <span className="truncate font-medium">
                                            {citation.title}
                                          </span>
                                          <ChevronDown
                                            className={`ml-auto h-3 w-3 shrink-0 text-slate-400 ${expanded ? "rotate-180" : ""}`}
                                          />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setInspectingCitation(citation)
                                          }
                                          aria-label={`Inspect source: ${citation.title}`}
                                          className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-white hover:text-codex-accent"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </button>
                                        <Link
                                          href={getSourceLink(
                                            citation.sourceType,
                                            citation.title,
                                            citation.sourceId,
                                          )}
                                          aria-label={`Open source: ${citation.title}`}
                                          className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-white hover:text-codex-accent"
                                        >
                                          <ArrowUpRight className="h-3.5 w-3.5" />
                                        </Link>
                                      </div>
                                      {expanded && (
                                        <div className="space-y-2 border-t border-slate-200 bg-white p-3">
                                          <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                                            {citation.snippet ||
                                              "No preview is available. Open the source to review the full record."}
                                          </p>
                                          <p className="text-[10px] text-slate-400">
                                            Revision {citation.revision}
                                            {citation.locator
                                              ? " · " + citation.locator
                                              : ""}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          )}

                          {isAssistant && msg.status === "COMPLETED" && (
                            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleCopyMessage(msg.id, msg.content)
                                }
                                aria-label="Copy response"
                                className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                              >
                                {copiedMsgId === msg.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                                {copiedMsgId === msg.id
                                  ? "Copied"
                                  : "Copy response"}
                              </button>
                              {msg.modelName && (
                                <span className="text-[10px] text-slate-400">
                                  {msg.modelName}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {isSending && (
                <div
                  role="status"
                  className="flex items-start gap-3 max-w-3xl mx-auto"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span className="text-xs text-slate-600 font-medium">
                      {!currentProject
                        ? "Reading all workspace sources and preparing an answer…"
                        : "Reading project sources and preparing an answer…"}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {showScrollToLatest && (
              <button
                type="button"
                onClick={() => {
                  stickToBottomRef.current = true;
                  messageScrollRef.current?.scrollTo({
                    top: messageScrollRef.current.scrollHeight,
                    behavior: "smooth",
                  });
                }}
                className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm"
              >
                <ChevronDown className="h-3.5 w-3.5" /> Latest messages
              </button>
            )}
          </div>

          {work.error && (
            <p role="status" className="px-6 text-xs text-amber-700">
              {work.error}
            </p>
          )}
          <CopilotComposer
            projectId={currentProject?.id}
            projectName={currentProject?.name}
            onProjectFiles={() =>
              currentProject &&
              projectWorkspace.openPanel(currentProject, "files")
            }
            value={inputContent}
            onChange={(value) => {
              draftsRef.current[draftKey] = value;
              setInputContent(value);
            }}
            onSend={() => void handleSendMessage()}
            useTools={useTools}
            onUseToolsChange={setUseTools}
            toolsAvailable={work.available && !!currentProject}
            toolsHint={
              !currentProject
                ? "Choose a project to use Hermes tools."
                : work.available
                  ? "Hermes can search files, calculate, and prepare changes for review."
                  : "Hermes is unavailable. Check Settings > Integrations."
            }
            sending={isSending || work.active}
            loading={
              isLoading ||
              isLoadingMessages ||
              (useTools && !work.available) ||
              (!!activeConv && work.loading) ||
              !!messagesError ||
              projects.length === 0
            }
            error={sendError}
            failedRequest={failedRequest}
            onDismissError={() => setSendError(null)}
            textareaRef={textareaRef}
          />
          {isNewChat && <div className="flex-1 min-h-0" />}
        </section>
      </div>

      {/* Confirmation Modal for Conversation Deletion */}
      <DeleteConfirmModal
        isOpen={!!excludeTarget}
        onClose={() => !isExcluding && setExcludeTarget(null)}
        onConfirm={confirmExcludeMessage}
        title="Exclude from future context?"
        warningText="This excludes the message and generated replies that may repeat it, including replies in affected chats. Chat transcripts remain visible. Saved memories are managed separately. This cannot be undone here."
        confirmText="Exclude from context"
        loading={isExcluding}
      />
      <DeleteConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => !isDeleting && setDeleteTargetId(null)}
        onConfirm={confirmDeleteConversation}
        title="Delete conversation"
        itemType="conversation"
        warningText="This hides the conversation from your history and future context. Generated replies in affected chats are also excluded from future context. Saved memories are managed separately. This cannot be undone here."
        confirmText="Delete conversation"
        loading={isDeleting}
      />

      {/* ========================================================================= */}
      {/* INSPECT SOURCE EVIDENCE MODAL (IN-APP WITHOUT REDIRECTING)                 */}
      {/* ========================================================================= */}
      {inspectingCitation && (
        <dialog
          ref={inspectorRef}
          aria-labelledby="copilot-source-title"
          onCancel={() => setInspectingCitation(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget)
              setInspectingCitation(null);
          }}
          className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
        >
          <div className="flex max-h-[88vh] flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  {inspectingCitation.sourceType === "TASK" ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : inspectingCitation.sourceType === "DECISION" ? (
                    <GitPullRequest className="w-4 h-4" />
                  ) : inspectingCitation.sourceType === "REQUIREMENT" ? (
                    <FileCheck2 className="w-4 h-4" />
                  ) : inspectingCitation.sourceType === "MEETING" ? (
                    <Calendar className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {inspectingCitation.projectKey && (
                      <span className="font-bold text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-100/90 text-indigo-800 border border-indigo-200">
                        [{inspectingCitation.projectKey}]{" "}
                        {inspectingCitation.projectName || ""}
                      </span>
                    )}
                    {inspectingDetails?.displayKey ? (
                      <span className="font-bold text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100/90 text-blue-800 border border-blue-200">
                        {inspectingDetails.displayKey}
                      </span>
                    ) : (
                      <span className="font-bold text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-blue-100/80 text-blue-800">
                        {inspectingCitation.sourceType}
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-slate-400">
                      Rev {inspectingCitation.revision}
                    </span>
                    {inspectingCitation.locator && (
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {inspectingCitation.locator}
                      </span>
                    )}
                  </div>
                  <h3
                    id="copilot-source-title"
                    className="mt-1 truncate text-sm font-semibold text-slate-900"
                  >
                    {inspectingCitation.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingCitation(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close inspector"
                aria-label="Close source preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-700 text-xs">
              {/* Grounded Evidence Snippet Callout */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Evidence excerpt</span>
                  </span>
                </div>
                <div className="whitespace-pre-wrap rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-relaxed text-slate-800">
                  {inspectingCitation.snippet ||
                    "No preview is available. Open the source to review the full record."}
                </div>
              </div>
              {inspectError && (
                <p
                  role="alert"
                  className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-700"
                >
                  {inspectError}
                </p>
              )}

              {/* Live Source Record Details (if loaded) */}
              {loadingInspectDetails ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-[11px]">Loading record metadata…</span>
                </div>
              ) : inspectingDetails ? (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Source Record Details
                  </div>

                  {/* TASK DETAILS */}
                  {inspectingCitation.sourceType === "TASK" && (
                    <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-semibold text-slate-700">
                          Status:
                        </span>
                        <span className="font-mono px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-800">
                          {inspectingDetails.status}
                        </span>
                        <span className="font-semibold text-slate-700 ml-2">
                          Priority:
                        </span>
                        <span className="font-mono px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-800">
                          {inspectingDetails.priority}
                        </span>
                        {inspectingDetails.assignee && (
                          <>
                            <span className="font-semibold text-slate-700 ml-2">
                              Assignee:
                            </span>
                            <span className="text-slate-800">
                              {inspectingDetails.assignee.displayName}
                            </span>
                          </>
                        )}
                      </div>
                      {inspectingDetails.description && (
                        <div className="pt-2 text-slate-700 whitespace-pre-wrap leading-relaxed border-t border-slate-200/60">
                          {inspectingDetails.description}
                        </div>
                      )}
                    </div>
                  )}

                  {/* DECISION DETAILS */}
                  {inspectingCitation.sourceType === "DECISION" && (
                    <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-semibold text-slate-700">
                          Status:
                        </span>
                        <span className="font-mono px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-800">
                          {inspectingDetails.status}
                        </span>
                      </div>
                      {inspectingDetails.decisionText && (
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-700">
                            Decision Outcome:
                          </div>
                          <p className="whitespace-pre-wrap text-slate-800 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/80">
                            {inspectingDetails.decisionText}
                          </p>
                        </div>
                      )}
                      {inspectingDetails.rationale && (
                        <div className="space-y-1 pt-1">
                          <div className="font-semibold text-slate-700">
                            Rationale & Context:
                          </div>
                          <p className="whitespace-pre-wrap text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/80">
                            {inspectingDetails.rationale}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* REQUIREMENT DETAILS */}
                  {inspectingCitation.sourceType === "REQUIREMENT" && (
                    <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-semibold text-slate-700">
                          Status:
                        </span>
                        <span className="font-mono px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-800">
                          {inspectingDetails.status}
                        </span>
                        <span className="font-semibold text-slate-700 ml-2">
                          Priority:
                        </span>
                        <span className="font-mono px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-800">
                          {inspectingDetails.priority}
                        </span>
                      </div>
                      {inspectingDetails.description && (
                        <div className="pt-1 whitespace-pre-wrap text-slate-800">
                          {inspectingDetails.description}
                        </div>
                      )}
                      {inspectingDetails.acceptanceCriteria && (
                        <div className="space-y-1 pt-2 border-t border-slate-200/60">
                          <div className="font-semibold text-slate-700">
                            Acceptance Criteria:
                          </div>
                          <p className="whitespace-pre-wrap text-slate-600">
                            {inspectingDetails.acceptanceCriteria}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MEETING DETAILS */}
                  {inspectingCitation.sourceType === "MEETING" && (
                    <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                      {inspectingDetails.agenda && (
                        <div>
                          <span className="font-semibold text-slate-700">
                            Agenda:
                          </span>
                          <p className="whitespace-pre-wrap text-slate-800 mt-0.5">
                            {inspectingDetails.agenda}
                          </p>
                        </div>
                      )}
                      {inspectingDetails.notes && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="font-semibold text-slate-700">
                            Notes:
                          </span>
                          <p className="whitespace-pre-wrap text-slate-800 mt-0.5">
                            {inspectingDetails.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DOCUMENT DETAILS */}
                  {inspectingCitation.sourceType === "LOCAL_FILE" && (
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                      <p className="font-semibold">
                        Current indexed file · revision{" "}
                        {inspectingDetails.sourceRevision}
                      </p>
                      <p className="text-slate-500">
                        This snapshot may be newer than the cited excerpt.
                        Rescan its folder in Documents to update it.
                      </p>
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all">
                        {inspectingDetails.chunks
                          ?.map((chunk: { text: string }) => chunk.text)
                          .join("\n\n")}
                      </pre>
                    </div>
                  )}
                  {inspectingCitation.sourceType === "DOCUMENT" && (
                    <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-semibold text-slate-700">
                          File:
                        </span>
                        <span className="text-slate-800 font-mono">
                          {inspectingDetails.originalFilename ||
                            inspectingDetails.title}
                        </span>
                        {inspectingDetails.fileType && (
                          <>
                            <span className="font-semibold text-slate-700 ml-2">
                              Type:
                            </span>
                            <span className="font-mono">
                              {inspectingDetails.fileType}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
              <Link
                href={getSourceLink(
                  inspectingCitation.sourceType,
                  inspectingCitation.title,
                  inspectingCitation.sourceId,
                )}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium hover:underline"
              >
                <span>Open source</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => setInspectingCitation(null)}
                className="px-5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </dialog>
      )}
      {memoryPanelOpen && memoryProjectId && (
        <CopilotMemoryPanel
          key={`${user?.id}:${memoryProjectId}`}
          projectId={memoryProjectId}
          projectLabel={
            projects.find((project) => project.id === memoryProjectId)?.name
          }
          draft={memoryDraft}
          onClose={() => {
            setMemoryPanelOpen(false);
            setMemoryDraft(null);
          }}
        />
      )}
    </AppLayout>
  );
}
