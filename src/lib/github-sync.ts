export type GitHubSyncPage = {
  syncedCount: number;
  syncedPrCount?: number;
  hasMore: boolean;
};

// Each request checkpoints one page on the server. A reload can safely resume it.
export async function syncGitHubPages(
  next: () => Promise<GitHubSyncPage>,
  signal: AbortSignal,
) {
  let issues = 0,
    pullRequests = 0;
  while (true) {
    signal.throwIfAborted();
    const page = await next();
    signal.throwIfAborted();
    if (typeof page.hasMore !== "boolean") {
      throw new Error(
        "GitHub sync did not report whether more pages remain. Update the API and retry.",
      );
    }
    issues += page.syncedCount;
    pullRequests += page.syncedPrCount ?? 0;
    if (!page.hasMore) return { issues, pullRequests };
  }
}
