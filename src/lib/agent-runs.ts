import { apiRequest } from "./api";

export interface AgentRun {
  id: string;
  projectId: string;
  prompt: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  model: string;
  runtimeRevision: string;
  events: Array<{ name: string; at: string }>;
  evidence: Array<{
    chunkId: string;
    sourceId: string;
    title: string;
    revision: number;
    locator: string;
  }>;
  artifact: string | null;
  proposalId: string | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export const agentRuns = {
  status: (projectId: string) =>
    apiRequest<{ available: boolean; runtime: string; revision: string }>(
      `/projects/${projectId}/ai/runs/runtime`,
    ),
  list: (projectId: string) =>
    apiRequest<AgentRun[]>(`/projects/${projectId}/ai/runs`),
  create: (projectId: string, prompt: string, idempotencyKey: string) =>
    apiRequest<AgentRun>(`/projects/${projectId}/ai/runs`, {
      method: "POST",
      body: JSON.stringify({ prompt, idempotencyKey }),
    }),
  cancel: (projectId: string, id: string) =>
    apiRequest<AgentRun>(`/projects/${projectId}/ai/runs/${id}/cancel`, {
      method: "POST",
    }),
};
