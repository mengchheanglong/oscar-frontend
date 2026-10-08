export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "/api/v1" : "http://localhost:3000/api/v1");


let csrfToken: string | null = null;
if (typeof window !== "undefined") {
  csrfToken = localStorage.getItem("aiw_csrf_token");
}

export function setCsrfToken(token: string | null) {
  csrfToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("aiw_csrf_token", token);
    } else {
      localStorage.removeItem("aiw_csrf_token");
    }
  }
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export interface ApiEnvelope<T = any, M = any> {
  data: T;
  meta?: M;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequestRaw(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const isMutating = ["POST", "PATCH", "PUT", "DELETE"].includes(options.method?.toUpperCase() || "");

  if (!csrfToken && typeof window !== "undefined") {
    csrfToken = localStorage.getItem("aiw_csrf_token");
  }

  if (csrfToken && isMutating) {
    headers["x-csrf-token"] = csrfToken;
  }

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const newCsrf = res.headers.get("x-csrf-token");
  if (newCsrf) {
    setCsrfToken(newCsrf);
  }

  // Automatic recovery if CSRF token was invalid/expired
  if (res.status === 403 && isMutating) {
    try {
      const errClone = res.clone();
      const errJson = await errClone.json();
      const errCode = errJson?.error?.code || errJson?.code;
      if (errCode === "CSRF_INVALID") {
        const csrfRes = await fetch(`${API_URL}/auth/csrf`, { credentials: "include" });
        const csrfJson = await csrfRes.json();
        const freshToken = csrfJson.data?.csrfToken;
        if (freshToken) {
          setCsrfToken(freshToken);
          headers["x-csrf-token"] = freshToken;
          res = await fetch(url, {
            ...options,
            headers,
            credentials: "include",
          });
          const retryNewCsrf = res.headers.get("x-csrf-token");
          if (retryNewCsrf) {
            setCsrfToken(retryNewCsrf);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (!res.ok) {
    let errorMsg = `Request failed with status ${res.status}`;
    let errorCode: string | undefined;
    let errorDetails: Array<{ field: string; message: string }> | undefined;

    try {
      const errJson = await res.json();
      const errObj = errJson.error || errJson;
      if (errObj.message) {
        errorMsg = errObj.message;
      }
      if (errObj.code) {
        errorCode = errObj.code;
      }
      const rawDetails = errObj.details || errJson.details;
      if (Array.isArray(rawDetails) && rawDetails.length > 0) {
        errorDetails = rawDetails;
      }
    } catch {
      // fallback
    }
    throw new ApiError(errorMsg, res.status, errorCode, errorDetails);
  }

  return res;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await apiRequestRaw(endpoint, options);
  if (res.status === 204) {
    return {} as T;
  }
  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

export async function apiEnvelopeRequest<T = any, M = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiEnvelope<T, M>> {
  const res = await apiRequestRaw(endpoint, options);
  if (res.status === 204) {
    return { data: {} as T };
  }
  const json = await res.json();
  return {
    data: json.data !== undefined ? json.data : json,
    meta: json.meta,
  };
}

export const api = {
  auth: {
    csrf: async () => {
      const res = await apiRequest<{ csrfToken: string | null }>("/auth/csrf");
      if (res?.csrfToken) {
        setCsrfToken(res.csrfToken);
      }
      return res;
    },
    login: async (email: string, password: string) => {
      const envelope = await apiEnvelopeRequest<{ user: any; csrfToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = envelope.data;
      if (data?.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      return data;
    },
    register: async (email: string, password: string, displayName?: string) => {
      const envelope = await apiEnvelopeRequest<{ user: any; csrfToken: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = envelope.data;
      if (data?.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      return data;
    },
    logout: async () => {
      try {
        await apiRequestRaw("/auth/logout", { method: "POST" });
      } catch {
        // ignore
      }
      setCsrfToken(null);
    },
    me: async () => {
      return apiRequest<any>("/auth/me");
    },
    updateProfile: async (data: { displayName?: string; professionalRole?: string }) => {
      return apiRequest<any>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    changePassword: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest<any>("/auth/password", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    // Personal Access Tokens (for MCP & Coding Agents)
    createApiKey: async (data: { name: string; expiresInDays?: number }) => {
      return apiRequest<{
        id: string;
        name: string;
        keyPrefix: string;
        lastUsedAt: string | null;
        expiresAt: string | null;
        createdAt: string;
        rawToken?: string;
      }>("/auth/api-keys", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    listApiKeys: async () => {
      return apiRequest<
        Array<{
          id: string;
          name: string;
          keyPrefix: string;
          lastUsedAt: string | null;
          expiresAt: string | null;
          createdAt: string;
        }>
      >("/auth/api-keys");
    },
    revokeApiKey: async (id: string) => {
      return apiRequest<any>(`/auth/api-keys/${id}`, {
        method: "DELETE",
      });
    },
  },

  projects: {
    list: async () => apiRequest<any[]>("/projects"),
    get: async (id: string) => apiRequest<any>(`/projects/${id}`),
    create: async (data: {
      name: string;
      key: string;
      description?: string;
      members?: Array<{ userId: string; role?: string }>;
    }) =>
      apiRequest<any>("/projects", { method: "POST", body: JSON.stringify(data) }),
    update: async (id: string, data: { name?: string; description?: string }) =>
      apiRequest<any>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    archive: async (id: string) =>
      apiRequest<any>(`/projects/${id}/archive`, { method: "POST" }),
    unarchive: async (id: string) =>
      apiRequest<any>(`/projects/${id}/unarchive`, { method: "POST" }),
    getMembers: async (id: string) => apiRequest<any[]>(`/projects/${id}/members`),
    addMember: async (id: string, data: { userId?: string; email?: string; accessRole: string }) =>
      apiRequest<any>(`/projects/${id}/members`, { method: "POST", body: JSON.stringify(data) }),
    updateMemberRole: async (id: string, userId: string, data: { accessRole: string }) =>
      apiRequest<any>(`/projects/${id}/members/${userId}`, { method: "PATCH", body: JSON.stringify(data) }),
    removeMember: async (id: string, userId: string) =>
      apiRequestRaw(`/projects/${id}/members/${userId}`, { method: "DELETE" }),
    transferOwnership: async (id: string, data: { newOwnerUserId: string }) =>
      apiRequest<any>(`/projects/${id}/ownership-transfer`, { method: "POST", body: JSON.stringify(data) }),
    getMemberCandidates: async (id: string, search?: string) => {
      const q = search ? `?search=${encodeURIComponent(search)}` : "";
      return apiRequest<any[]>(`/projects/${id}/member-candidates${q}`);
    },
    getAuditLogs: async (id: string, page = 1, pageSize = 50) =>
      apiEnvelopeRequest<any[]>(`/projects/${id}/audit?page=${page}&pageSize=${pageSize}`),
  },

  dashboard: {
    get: async (projectId: string, timezone = "Asia/Bangkok") =>
      apiRequest<any>(`/projects/${projectId}/dashboard?timezone=${encodeURIComponent(timezone)}`),
    getActivity: async (projectId: string, page = 1, pageSize = 20) =>
      apiEnvelopeRequest<any[]>(`/projects/${projectId}/activity?page=${page}&pageSize=${pageSize}`),
  },

  search: {
    query: async (
      projectId: string,
      q: string,
      type?: string,
      page = 1,
      pageSize = 20,
      mode: "keyword" | "semantic" | "hybrid" = "hybrid"
    ) => {
      let queryUrl = `/projects/${projectId}/search?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}&mode=${mode}`;
      if (type && type.trim()) {
        queryUrl += `&type=${encodeURIComponent(type.trim().toUpperCase())}`;
      }
      return apiEnvelopeRequest<any[]>(queryUrl);
    },
  },

  requirements: {
    list: async (projectId: string, status?: string) => {
      let url = `/projects/${projectId}/requirements`;
      if (status) url += `?status=${encodeURIComponent(status)}`;
      return apiRequest<any[]>(url);
    },
    listAll: async (params?: {
      projectId?: string;
      status?: string;
      priority?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.projectId && params.projectId !== "ALL") q.append("projectId", params.projectId);
      if (params?.status && params.status !== "ALL") q.append("status", params.status);
      if (params?.priority && params.priority !== "ALL") q.append("priority", params.priority);
      if (params?.search) q.append("search", params.search);
      if (params?.page) q.append("page", String(params.page));
      if (params?.pageSize) q.append("pageSize", String(params.pageSize));
      const qs = q.toString() ? `?${q.toString()}` : "";
      return apiEnvelopeRequest<any[]>(`/requirements${qs}`);
    },
    create: async (
      projectId: string,
      data: {
        title: string;
        description?: string;
        acceptanceCriteria?: string;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      }
    ) => apiRequest<any>(`/projects/${projectId}/requirements`, { method: "POST", body: JSON.stringify(data) }),
    update: async (
      projectId: string,
      requirementId: string,
      data: {
        version: number;
        title?: string;
        description?: string;
        acceptanceCriteria?: string;
        status?: string;
        priority?: string;
      }
    ) =>
      apiRequest<any>(`/projects/${projectId}/requirements/${requirementId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    listRevisions: async (projectId: string, requirementId: string) =>
      apiRequest<any[]>(`/projects/${projectId}/requirements/${requirementId}/revisions`),
    listTasks: async (projectId: string, requirementId: string) =>
      apiRequest<any[]>(`/projects/${projectId}/requirements/${requirementId}/tasks`),
    delete: async (projectId: string, requirementId: string) =>
      apiRequest<any>(`/projects/${projectId}/requirements/${requirementId}`, {
        method: "DELETE",
      }),
  },

  decisions: {
    list: async (projectId: string, status?: string) => {
      let url = `/projects/${projectId}/decisions`;
      if (status) url += `?status=${encodeURIComponent(status)}`;
      return apiRequest<any[]>(url);
    },
    create: async (
      projectId: string,
      data: {
        title: string;
        decisionText: string;
        rationale?: string;
        requirementId?: string;
        supersedesDecisionId?: string;
      }
    ) => apiRequest<any>(`/projects/${projectId}/decisions`, { method: "POST", body: JSON.stringify(data) }),
    update: async (
      projectId: string,
      decisionId: string,
      data: {
        version: number;
        title?: string;
        decisionText?: string;
        rationale?: string;
        status?: string;
        supersedesDecisionId?: string;
      }
    ) =>
      apiRequest<any>(`/projects/${projectId}/decisions/${decisionId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    listRevisions: async (projectId: string, decisionId: string) =>
      apiRequest<any[]>(`/projects/${projectId}/decisions/${decisionId}/revisions`),
    delete: async (projectId: string, decisionId: string) =>
      apiRequestRaw(`/projects/${projectId}/decisions/${decisionId}`, { method: "DELETE" }),
  },

  tasks: {
    get: async (projectId: string, taskId: string) =>
      apiRequest<any>(`/projects/${projectId}/tasks/${taskId}`),
    list: async (projectId: string, status?: string) => {
      let url = `/projects/${projectId}/tasks`;
      if (status) url += `?status=${encodeURIComponent(status)}`;
      return apiRequest<any[]>(url);
    },
    listAll: async (params?: {
      projectId?: string;
      status?: string;
      priority?: string;
      assigneeId?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append("projectId", params.projectId);
      if (params?.status) q.append("status", params.status);
      if (params?.priority) q.append("priority", params.priority);
      if (params?.assigneeId) q.append("assigneeId", params.assigneeId);
      if (params?.search) q.append("search", params.search);
      if (params?.page) q.append("page", String(params.page));
      if (params?.pageSize) q.append("pageSize", String(params.pageSize));
      const qs = q.toString() ? `?${q.toString()}` : "";
      return apiEnvelopeRequest<any[]>(`/tasks${qs}`);
    },
    create: async (
      projectId: string,
      data: {
        title: string;
        description?: string;
        status?: string;
        priority?: string;
        assigneeId?: string;
        blockedReason?: string;
        dueDate?: string; // YYYY-MM-DD
        requirementId?: string;
        sourceMeetingId?: string;
      }
    ) => apiRequest<any>(`/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(data) }),
    update: async (
      projectId: string,
      taskId: string,
      data: {
        version: number;
        title?: string;
        description?: string | null;
        status?: string;
        priority?: string;
        assigneeId?: string | null;
        blockedReason?: string | null;
        dueDate?: string | null;
      }
    ) =>
      apiRequest<any>(`/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: async (projectId: string, taskId: string) =>
      apiRequestRaw(`/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" }),
  },

  meetings: {
    list: async (projectId: string) => apiRequest<any[]>(`/projects/${projectId}/meetings`),
    create: async (
      projectId: string,
      data: {
        title: string;
        startsAt: string; // ISO 8601
        endsAt: string; // ISO 8601
        agenda?: string;
        notes?: string;
        transcriptText?: string;
        attendeeUserIds?: string[];
      }
    ) => apiRequest<any>(`/projects/${projectId}/meetings`, { method: "POST", body: JSON.stringify(data) }),
    update: async (
      projectId: string,
      meetingId: string,
      data: {
        version?: number;
        title?: string;
        startsAt?: string;
        endsAt?: string;
        agenda?: string;
        notes?: string;
        transcriptText?: string;
        attendeeUserIds?: string[];
      }
    ) =>
      apiRequest<any>(`/projects/${projectId}/meetings/${meetingId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: async (projectId: string, meetingId: string) =>
      apiRequestRaw(`/projects/${projectId}/meetings/${meetingId}`, { method: "DELETE" }),
  },

  documents: {
    list: async (projectId: string) => apiRequest<any[]>(`/projects/${projectId}/documents`),
    listAll: async (params?: {
      projectId?: string;
      fileType?: string;
      createdBy?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.projectId && params.projectId !== "ALL") q.append("projectId", params.projectId);
      if (params?.fileType && params.fileType !== "ALL") q.append("fileType", params.fileType);
      if (params?.createdBy && params.createdBy !== "ALL") q.append("createdBy", params.createdBy);
      if (params?.search) q.append("search", params.search);
      if (params?.page) q.append("page", String(params.page));
      if (params?.pageSize) q.append("pageSize", String(params.pageSize));
      const qs = q.toString() ? `?${q.toString()}` : "";
      return apiEnvelopeRequest<any[]>(`/documents${qs}`);
    },
    upload: async (projectId: string, formData: FormData) =>
      apiRequest<any>(`/projects/${projectId}/documents`, { method: "POST", body: formData }),
    uploadRevision: async (projectId: string, documentId: string, formData: FormData) =>
      apiRequest<any>(`/projects/${projectId}/documents/${documentId}/revisions`, {
        method: "POST",
        body: formData,
      }),
    listRevisions: async (projectId: string, documentId: string) =>
      apiRequest<any[]>(`/projects/${projectId}/documents/${documentId}/revisions`),
    getDownloadUrl: (projectId: string, docId: string) =>
      `${API_URL}/projects/${projectId}/documents/${docId}/download`,
    downloadFile: async (projectId: string, docId: string, filename: string) => {
      const res = await apiRequestRaw(`/projects/${projectId}/documents/${docId}/download`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "document";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    delete: async (projectId: string, docId: string) =>
      apiRequestRaw(`/projects/${projectId}/documents/${docId}`, { method: "DELETE" }),
  },

  ingestion: {
    listSources: async (
      projectId: string,
      params?: { sourceType?: string; status?: string; search?: string }
    ) => {
      const q = new URLSearchParams();
      if (params?.sourceType) q.append("sourceType", params.sourceType);
      if (params?.status) q.append("status", params.status);
      if (params?.search) q.append("search", params.search);
      const qs = q.toString() ? `?${q.toString()}` : "";
      return apiRequest<any[]>(`/projects/${projectId}/ingestion/sources${qs}`);
    },
    getSource: async (projectId: string, sourceId: string) =>
      apiRequest<any>(`/projects/${projectId}/ingestion/sources/${sourceId}`),
    reindexSource: async (projectId: string, sourceId: string) =>
      apiRequest<any>(`/projects/${projectId}/ingestion/sources/${sourceId}/reindex`, {
        method: "POST",
      }),
    listJobs: async (projectId: string) =>
      apiRequest<any[]>(`/projects/${projectId}/ingestion/jobs`),
  },

  ai: {
    listConversations: async (projectId: string) =>
      apiRequest<any[]>(`/projects/${projectId}/ai/conversations`),
    createConversation: async (
      projectId: string,
      data?: { title?: string; defaultMode?: string }
    ) =>
      apiRequest<any>(`/projects/${projectId}/ai/conversations`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    getConversation: async (projectId: string, conversationId: string) =>
      apiRequest<any>(`/projects/${projectId}/ai/conversations/${conversationId}`),
    deleteConversation: async (projectId: string, conversationId: string) =>
      apiRequestRaw(`/projects/${projectId}/ai/conversations/${conversationId}`, {
        method: "DELETE",
      }),
    listMessages: async (projectId: string, conversationId: string) =>
      apiRequest<any[]>(`/projects/${projectId}/ai/conversations/${conversationId}/messages`),
    postMessage: async (
      projectId: string,
      conversationId: string,
      data: { content: string; mode?: string; sourceType?: string; includeAllWorkspaces?: boolean }
    ) =>
      apiRequest<{ userMessage: any; assistantMessage: any }>(
        `/projects/${projectId}/ai/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      ),
    generateTaskProposal: async (projectId: string, requirementId: string) =>
      apiRequest<any>(`/projects/${projectId}/ai/requirements/${requirementId}/task-proposals`, {
        method: "POST",
      }),
    generateDecisionTaskProposal: async (projectId: string, decisionId: string) =>
      apiRequest<{ proposal: any }>(`/projects/${projectId}/ai/decisions/${decisionId}/task-proposals`, {
        method: "POST",
      }),
    generateMeetingAnalysis: async (projectId: string, meetingId: string) =>
      apiRequest<any>(`/projects/${projectId}/ai/meetings/${meetingId}/analysis-proposals`, {
        method: "POST",
      }),
    listProposals: async (projectId: string, params?: { status?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.append("status", params.status);
      const qs = q.toString() ? `?${q.toString()}` : "";
      return apiRequest<any[]>(`/projects/${projectId}/ai/proposals${qs}`);
    },
    getProposal: async (projectId: string, proposalId: string) =>
      apiRequest<any>(`/projects/${projectId}/ai/proposals/${proposalId}`),
    updateProposal: async (
      projectId: string,
      proposalId: string,
      data: { version: number; draftJson: any }
    ) =>
      apiRequest<any>(`/projects/${projectId}/ai/proposals/${proposalId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    rejectProposal: async (projectId: string, proposalId: string) =>
      apiRequest<any>(`/projects/${projectId}/ai/proposals/${proposalId}/reject`, {
        method: "POST",
      }),
    confirmProposal: async (
      projectId: string,
      proposalId: string,
      data: { version: number; selectedItemIds?: string[]; includeSummary?: boolean },
      idempotencyKey?: string
    ) => {
      const headers: Record<string, string> = {
        "Idempotency-Key":
          idempotencyKey ||
          (typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `idem-${Date.now()}`),
      };
      return apiRequest<{ proposal: any; resultRecordIds: any[] }>(
        `/projects/${projectId}/ai/proposals/${proposalId}/confirm`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(data),
        }
      );
    },
  },
  integrations: {
    github: {
      listConnections: async (projectId: string) =>
        apiRequest<any[]>(`/projects/${projectId}/integrations/github/connections`),
      getConnection: async (projectId: string, connectionId?: string) => {
        const qs = connectionId ? `?connectionId=${connectionId}` : "";
        return apiRequest<any>(`/projects/${projectId}/integrations/github${qs}`);
      },
      connect: async (
        projectId: string,
        data: { repositoryOwner: string; repositoryName: string; accessToken?: string }
      ) =>
        apiRequest<any>(`/projects/${projectId}/integrations/github/connect`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
      sync: async (projectId: string, connectionId?: string, accessToken?: string) =>
        apiRequest<{ syncedCount: number; totalCount: number; syncedPrCount?: number; totalPrCount?: number; lastSyncedAt: string }>(
          `/projects/${projectId}/integrations/github/sync`,
          {
            method: "POST",
            body: JSON.stringify({ connectionId, accessToken }),
          }
        ),
      syncCode: async (projectId: string, connectionId?: string, accessToken?: string, progress?: { cursor?: number; treeVersion?: string }) =>
        apiRequest<{ nextCursor: number | null; treeVersion: string; indexedFilesCount: number; unchangedFilesCount: number; candidateFilesCount: number; totalFiles: number; lastSyncedAt: string }>(
          `/projects/${projectId}/integrations/github/sync-code`,
          {
            method: "POST",
            body: JSON.stringify({ connectionId, accessToken, ...progress }),
          }
        ),
      disconnect: async (projectId: string, connectionId?: string) => {
        const url = connectionId
          ? `/projects/${projectId}/integrations/github/connections/${connectionId}`
          : `/projects/${projectId}/integrations/github`;
        return apiRequest<void>(url, {
          method: "DELETE",
        });
      },
      listIssues: async (
        projectId: string,
        params?: { state?: string; q?: string; page?: number; limit?: number; connectionId?: string }
      ) => {
        const q = new URLSearchParams();
        if (params?.connectionId) q.append("connectionId", params.connectionId);
        if (params?.state) q.append("state", params.state);
        if (params?.q) q.append("q", params.q);
        if (params?.page) q.append("page", String(params.page));
        if (params?.limit) q.append("limit", String(params.limit));
        const qs = q.toString() ? `?${q.toString()}` : "";
        return apiRequest<{ items: any[]; total: number; page: number; limit: number }>(
          `/projects/${projectId}/integrations/github/issues${qs}`
        );
      },
      listPullRequests: async (
        projectId: string,
        params?: { state?: string; q?: string; page?: number; limit?: number; connectionId?: string }
      ) => {
        const q = new URLSearchParams();
        if (params?.connectionId) q.append("connectionId", params.connectionId);
        if (params?.state) q.append("state", params.state);
        if (params?.q) q.append("q", params.q);
        if (params?.page) q.append("page", String(params.page));
        if (params?.limit) q.append("limit", String(params.limit));
        const qs = q.toString() ? `?${q.toString()}` : "";
        return apiRequest<{ items: any[]; total: number; page: number; limit: number }>(
          `/projects/${projectId}/integrations/github/pull-requests${qs}`
        );
      },
      listFiles: async (
        projectId: string,
        params?: { extension?: string; q?: string; page?: number; limit?: number; connectionId?: string }
      ) => {
        const q = new URLSearchParams();
        if (params?.connectionId) q.append("connectionId", params.connectionId);
        if (params?.extension) q.append("extension", params.extension);
        if (params?.q) q.append("q", params.q);
        if (params?.page) q.append("page", String(params.page));
        if (params?.limit) q.append("limit", String(params.limit));
        const qs = q.toString() ? `?${q.toString()}` : "";
        return apiRequest<{ items: any[]; total: number; page: number; limit: number }>(
          `/projects/${projectId}/integrations/github/files${qs}`
        );
      },
    },
  },
  workspace: {
    getMembers: async () => apiRequest<any[]>("/workspace/members"),
    getInvites: async () => apiRequest<any[]>("/workspace/invites"),
    createInvite: async (data: { email: string; systemRole?: string; professionalRole?: string }) =>
      apiRequest<any>("/workspace/invites", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    cancelInvite: async (id: string) =>
      apiRequest<any>(`/workspace/invites/${id}`, {
        method: "DELETE",
      }),
  },
  invites: {
    getPreview: async (token: string) =>
      apiRequest<{
        email: string;
        systemRole: string;
        professionalRole: string;
        expiresAt: string;
        inviterName?: string;
      }>(`/auth/invite/${encodeURIComponent(token)}`),
    accept: async (data: { token: string; name: string; password: string }) =>
      apiRequest<{ user: any; csrfToken: string }>("/auth/accept-invite", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};
