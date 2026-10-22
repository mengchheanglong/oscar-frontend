import type { AgentRun } from "./agent-runs";
import type { PlatformHandoff } from "./platform-handoffs";

export type WorkItem = {
  id: string;
  projectId: string;
  projectName: string;
  conversationId: string | null;
  agent: "Hermes" | "T3 Code" | "Paperclip";
  prompt: string;
  status: string;
  updatedAt: string;
  notice?: string | null;
  artifact?: string | null;
  proposalId?: string | null;
};

// Keep independent failures visible and bound requests for larger workspaces.
export async function loadAgentWork(
  projects: Array<{ id: string; name: string }>,
  loadHermes: (projectId: string) => Promise<AgentRun[]>,
  loadHandoffs: (projectId: string) => Promise<PlatformHandoff[]>,
) {
  const items: WorkItem[] = [];
  const failures: string[] = [];
  for (let offset = 0; offset < projects.length; offset += 2) {
    await Promise.all(
      projects.slice(offset, offset + 2).map(async (project) => {
        const results = await Promise.allSettled([
          loadHermes(project.id),
          loadHandoffs(project.id),
        ]);
        results.forEach((result, index) => {
          if (result.status === "rejected") {
            failures.push(
              `${project.name} (${index === 0 ? "Hermes" : "T3 / Paperclip"})`,
            );
            return;
          }
          for (const run of result.value) {
            items.push({
              id: `${project.id}:${index === 0 ? "hermes" : "handoff"}:${run.id}`,
              projectId: project.id,
              projectName: project.name,
              conversationId: run.conversationId,
              agent:
                index === 0
                  ? "Hermes"
                  : (run as PlatformHandoff).platformType === "paperclip"
                    ? "Paperclip"
                    : "T3 Code",
              prompt: run.prompt,
              status: run.status,
              updatedAt: run.updatedAt,
              notice:
                index === 0
                  ? (run as AgentRun).errorCode
                  : (run as PlatformHandoff).notice,
              artifact: index === 0 ? (run as AgentRun).artifact : undefined,
              proposalId:
                index === 0 ? (run as AgentRun).proposalId : undefined,
            });
          }
        });
      }),
    );
  }
  items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return { items, failures };
}
