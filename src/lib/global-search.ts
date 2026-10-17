type Scope = { id: string; name: string; status: string };
type Mode = "hybrid" | "semantic" | "keyword";
type Row = {
  id: string;
  type: string;
  updatedAt: string;
  projectId: string;
  projectName: string;
  metadata?: { score?: number };
  [key: string]: any;
};
type Query = (
  projectId: string,
  term: string,
  type: string | undefined,
  page: number,
  pageSize: number,
  mode: Mode,
) => Promise<{
  data: any[];
  meta?: { total?: number; countsByType?: Record<string, number> };
}>;

// Reuse the authenticated project endpoints, so global search retains their access checks.
export async function searchAcrossProjects(
  projects: Scope[],
  query: Query,
  term: string,
  type: string,
  mode: Mode,
  page = 1,
) {
  const scopes = projects.filter((project) => project.status !== "ARCHIVED");
  const rows: Row[] = [];
  const countsByType: Record<string, number> = {};
  const failed: string[] = [];
  let total = 0;
  let hasMore = false;
  // Bound parallel requests for accounts with many projects.
  for (let offset = 0; offset < scopes.length; offset += 4) {
    await Promise.all(
      scopes.slice(offset, offset + 4).map(async (project) => {
        try {
          const envelope = await query(
            project.id,
            term,
            type || undefined,
            page,
            25,
            mode,
          );
          rows.push(
            ...(envelope.data || []).map((item) => ({
              ...item,
              projectId: project.id,
              projectName: project.name,
            })),
          );
          total += envelope.meta?.total || 0;
          hasMore ||= (envelope.meta?.total || 0) > page * 25;
          Object.entries(envelope.meta?.countsByType || {}).forEach(
            ([kind, count]) => {
              countsByType[kind] = (countsByType[kind] || 0) + Number(count);
            },
          );
        } catch {
          failed.push(project.name);
        }
      }),
    );
  }
  return { rows, meta: { total, countsByType }, hasMore, failed };
}

export function mergeSearchResults(
  previous: Row[],
  rows: Row[],
  mode: Mode,
): Row[] {
  const unique = Array.from(
    new Map(
      [...previous, ...rows].map((item) => [
        `${item.projectId}:${item.type}:${item.id}`,
        item,
      ]),
    ).values(),
  );
  return unique.sort(
    (a, b) =>
      (mode !== "keyword"
        ? Number(b.metadata?.score || 0) - Number(a.metadata?.score || 0)
        : 0) ||
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() ||
      `${a.projectId}:${a.type}:${a.id}`.localeCompare(
        `${b.projectId}:${b.type}:${b.id}`,
      ),
  );
}
