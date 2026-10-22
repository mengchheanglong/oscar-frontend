import { apiRequest } from "./api";
export interface PlatformHandoff {
  platformType: "t3" | "paperclip";
  externalUrl: string | null;
  id: string;
  conversationId: string;
  projectId: string;
  prompt: string;
  status:
    | "QUEUED"
    | "DISPATCHING"
    | "UNCERTAIN"
    | "RUNNING"
    | "WAITING"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED";
  threadId: string | null;
  remoteStatus: string | null;
  notice: string | null;
  assistantMessageId: string | null;
  createdAt: string;
  updatedAt: string;
}
export const platformHandoffs = {
  paperclipTargets: (projectId: string, connectionId: string) =>
    apiRequest<{
      agents: Array<{ id: string; name: string }>;
      projects: Array<{ id: string; name: string }>;
    }>(
      `/projects/${projectId}/ai/handoffs/paperclip-targets?connectionId=${connectionId}`,
    ),
  models: (projectId: string, connectionId: string) =>
    apiRequest<
      Array<{
        provider: string;
        instanceId: string;
        model: string;
        label: string;
      }>
    >(`/projects/${projectId}/ai/handoffs/models?connectionId=${connectionId}`),
  list: (projectId: string, conversationId?: string) =>
    apiRequest<PlatformHandoff[]>(
      `/projects/${projectId}/ai/handoffs${conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : ""}`,
    ),
  create: (
    projectId: string,
    body: {
      conversationId: string;
      connectionId: string;
      platformType?: "t3" | "paperclip";
      remoteAgentId?: string;
      remoteProjectId?: string;
      prompt: string;
      idempotencyKey: string;
      providerInstanceId?: string;
      model?: string;
    },
  ) =>
    apiRequest<PlatformHandoff>(`/projects/${projectId}/ai/handoffs`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  action: (projectId: string, id: string, action: "refresh" | "cancel") =>
    apiRequest<PlatformHandoff>(
      `/projects/${projectId}/ai/handoffs/${id}/${action}`,
      { method: "POST" },
    ),
};
