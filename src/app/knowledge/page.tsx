"use client";

import { AppLayout } from "@/components/app-layout";
import { WorkspaceIcon } from "@/components/workspace-icons";

export default function KnowledgePage() {
  return (
    <AppLayout>
      <div className="knowledge-workspace">
        <header>
          <h1>Knowledge Graph</h1>
          <p>Explore how your workspace connects.</p>
        </header>
        <section
          className="knowledge-preview"
          aria-labelledby="knowledge-coming-soon"
        >
          <div className="knowledge-preview-icon" aria-hidden="true">
            <WorkspaceIcon name="knowledge" />
          </div>
          <h2 id="knowledge-coming-soon">Coming soon</h2>
          <p>
            A visual map of your projects, files, decisions, tasks, and
            ideas—with connections you can trace back to their sources.
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
