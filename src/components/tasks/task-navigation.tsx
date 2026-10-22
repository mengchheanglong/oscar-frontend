import Link from "next/link";

export function TaskNavigation({ active }: { active: "tasks" | "agents" }) {
  return (
    <nav
      aria-label="Task views"
      className="flex gap-1 border-b border-border pb-3"
    >
      {(["tasks", "agents"] as const).map((view) => (
        <Link
          key={view}
          href={view === "tasks" ? "/tasks" : "/tasks?view=agents"}
          aria-current={active === view ? "page" : undefined}
          className={`rounded-xl px-4 py-2 text-sm transition-colors ${active === view ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted"}`}
        >
          {view === "tasks" ? "Your tasks" : "Agent work"}
        </Link>
      ))}
    </nav>
  );
}
