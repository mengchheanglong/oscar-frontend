import { apiRequest, apiRequestRaw } from "./api";
export interface PlatformConnection {
  id: string;
  name: string;
  platformType: "paperclip" | "t3";
  baseUrl: string;
  status: string;
  healthError?: string | null;
  lastHealthCheckAt?: string | null;
  healthFresh?: boolean;
  projectId?: string | null;
  capabilities: string[];
  metadata?: Record<string, unknown>;
}
export interface PlatformRecord {
  id: string;
  title: string;
  type: string;
  url: string;
  status?: string;
}
export interface ExternalLink {
  id: string;
  connectionId: string;
  externalId: string;
  externalTitle: string;
  externalEntityType: string;
  externalUrl: string;
  projectId?: string | null;
  goalId?: string | null;
}
export interface PlatformOverview {
  oscarAnswer: string;
  generatedAt: string;
  healthyPlatforms: number;
  totalPlatforms: number;
  warnings: string[];
}
export const platformsApi = {
  list: (projectId?: string) =>
    apiRequest<{ items: PlatformConnection[]; total: number }>(
      `/platforms/connections${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`,
    ),
  create: (data: {
    name: string;
    platformType: string;
    baseUrl: string;
    authToken?: string;
    projectId?: string;
    metadata?: Record<string, unknown>;
  }) =>
    apiRequest<PlatformConnection>("/platforms/connections", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: {
      name: string;
      baseUrl: string;
      authToken?: string;
      metadata?: Record<string, unknown>;
    },
  ) =>
    apiRequest<PlatformConnection>(`/platforms/connections/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    apiRequestRaw(`/platforms/connections/${id}`, { method: "DELETE" }),
  authorize: (id: string) =>
    apiRequest<{ authorizationUrl: string }>(
      `/platforms/connections/${id}/authorize`,
      { method: "POST" },
    ),
  test: (id: string) =>
    apiRequest<PlatformConnection>(`/platforms/connections/${id}/test`, {
      method: "POST",
    }),
  overview: (projectId?: string) =>
    apiRequest<PlatformOverview>(
      `/platforms/overview${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`,
    ),
  entities: async (id: string): Promise<PlatformRecord[]> => {
    const result = await apiRequest<{
      type: string;
      data: Record<string, Array<Record<string, unknown>>>;
    }>(`/platforms/connections/${id}/entities`);
    const groups =
      result.type === "paperclip"
        ? [
            ["agents", "agent"],
            ["issues", "issue"],
          ]
        : [
            ["threads", "thread"],
            ["runs", "run"],
            ["workspaces", "workspace"],
          ];
    return groups.flatMap(([key, type]) =>
      (result.data[key] || []).map((row) => ({
        id: String(row.id),
        title: String(row.title ?? row.name ?? row.id),
        type,
        url: String(row.url || ""),
        status: typeof row.status === "string" ? row.status : undefined,
      })),
    );
  },
  links: (projectId?: string) =>
    apiRequest<{ items: ExternalLink[]; total: number }>(
      `/platforms/links${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`,
    ),
  link: (data: {
    connectionId: string;
    externalId: string;
    externalEntityType: string;
    projectId?: string;
    goalId?: string;
  }) =>
    apiRequest<ExternalLink>("/platforms/links", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  unlink: (id: string) =>
    apiRequestRaw(`/platforms/links/${id}`, { method: "DELETE" }),
};
