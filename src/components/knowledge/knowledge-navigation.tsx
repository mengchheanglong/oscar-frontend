"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";

export function KnowledgeNavigation({
  active,
}: {
  active: "files" | "memories";
}) {
  const { currentProject } = useAuth();
  return (
    <header className="space-y-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentProject
            ? `Sources and memories for ${currentProject.name}.`
            : "Your sources and memories across projects."}
        </p>
      </div>
      <nav
        aria-label="Knowledge views"
        className="flex flex-wrap items-center gap-1 border-b border-border pb-3"
      >
        {(["files", "memories"] as const).map((view) => (
          <Link
            key={view}
            href={`/knowledge?view=${view}`}
            aria-current={active === view ? "page" : undefined}
            className={`rounded-xl px-4 py-2 text-sm transition-colors ${active === view ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted"}`}
          >
            {view === "files" ? "Files & sources" : "Memories"}
          </Link>
        ))}
        <Link
          href="/settings?section=integrations"
          className="sm:ml-auto rounded-xl px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          Connected sources
        </Link>
      </nav>
    </header>
  );
}
