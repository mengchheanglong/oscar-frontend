import { apiRequest } from "./api";
export interface Skill {
  id: string;
  slug: string;
  name: string;
  description: string;
  instructions?: string;
  version: number;
}
export type SkillInput = Pick<Skill, "slug" | "name" | "description"> & {
  instructions: string;
};
const chatPath = (project: string, chat: string) =>
  `/projects/${project}/ai/conversations/${chat}/skills`;
export const skillsApi = {
  list: () => apiRequest<Skill[]>("/skills"),
  get: (id: string) => apiRequest<Skill>(`/skills/${id}`),
  save: (input: SkillInput, id?: string, version?: number) =>
    apiRequest<Skill>(id ? `/skills/${id}` : "/skills", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify({ ...input, ...(id ? { version } : {}) }),
    }),
  remove: (id: string) =>
    apiRequest<void>(`/skills/${id}`, { method: "DELETE" }),
  attached: (project: string, chat: string) =>
    apiRequest<Skill[]>(chatPath(project, chat)),
  detach: (project: string, chat: string, id: string) =>
    apiRequest<void>(`${chatPath(project, chat)}/${id}`, { method: "DELETE" }),
};
