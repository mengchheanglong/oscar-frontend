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

export function searchResultHref(item: {
  id: string;
  type: string;
  projectId: string;
  key?: string;
  title?: string;
  metadata?: Record<string, any>;
}): string {
  if (
    item.type.startsWith("GITHUB_") &&
    typeof item.metadata?.htmlUrl === "string"
  ) {
    try {
      const url = new URL(item.metadata.htmlUrl);
      if (url.protocol === "https:" && url.hostname === "github.com")
        return url.href;
    } catch {
      /* Fall back to the integration page for unavailable source URLs. */
    }
  }
  if (
    item.metadata?.sourceType === "LOCAL_FILE" &&
    item.metadata.folderId &&
    item.metadata.relativePath
  ) {
    return `/documents?${new URLSearchParams({
      projectId: item.projectId,
      folderId: item.metadata.folderId,
      path: item.metadata.relativePath,
    })}`;
  }
  const base =
    (
      {
        DOCUMENT: "/documents",
        TASK: "/tasks",
        DECISION: "/decisions",
      } as Record<string, string>
    )[item.type] || "/integrations";
  const params = new URLSearchParams({ id: item.id });
  if (item.key || item.title)
    params.set("search", item.key || item.title || "");
  return `${base}?${params}`;
}

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
