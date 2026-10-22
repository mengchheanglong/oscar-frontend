import { apiRequest } from "./api";
export type ExecutionPlatform = "hermes" | "t3" | "paperclip";
export interface ChiefPreferences {
  cadence: "OFF" | "DAILY" | "WEEKLY";
  hourUtc: number;
  monthlyBudgetUsd: string | number | null;
  nextBriefingAt: string | null;
  lastBriefingAt: string | null;
}
export interface ExecutionReview {
  id: string;
  verdict: "ACCEPTED" | "NEEDS_WORK" | "REJECTED";
  observation: string;
  reportedCostUsd: string | null;
  memoryId: string | null;
}
export interface ChiefBriefing {
  generatedAt: string;
  preferences: ChiefPreferences;
  goals: Array<{
    id: string;
    title: string;
    measuredProgress: number;
    risks: string | null;
    targetDate: string | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
  }>;
  work: Array<{
    id: string;
    platform: ExecutionPlatform;
    status: string;
    goalId: string | null;
    review: ExecutionReview | null;
  }>;
  budget: {
    period: string;
    reportedUsd: number;
    unknownRuns: number;
    trackedRuns: number;
    monthlyBudgetUsd: number | null;
    overBudget: boolean;
    notice: string;
  };
}
export const chiefApi = {
  briefing: (projectId?: string) =>
    apiRequest<ChiefBriefing>(
      `/chief/briefing${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`,
    ),
  preferences: (data: {
    cadence: ChiefPreferences["cadence"];
    hourUtc: number;
    monthlyBudgetUsd: number | null;
  }) =>
    apiRequest<ChiefPreferences>("/chief/preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  review: (platform: ExecutionPlatform, id: string) =>
    apiRequest<ExecutionReview | null>(
      `/chief/executions/${platform}/${id}/review`,
    ),
  saveReview: (
    platform: ExecutionPlatform,
    id: string,
    data: {
      idempotencyKey: string;
      verdict: ExecutionReview["verdict"];
      observation: string;
      lesson?: string;
      reportedCostUsd?: number;
    },
  ) =>
    apiRequest<ExecutionReview>(`/chief/executions/${platform}/${id}/review`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
