"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { agentRuns } from "@/lib/agent-runs";

type Entry = { id: string; title: string; detail: string };
type Group = { title: string; href: string; items: Entry[]; failed: boolean };
export default function HomePage() {
  const { projects, currentProject, setCurrentProject } = useAuth();
  const [work, setWork] = useState<{
    projectId: string;
    groups: Group[];
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const projectId = currentProject?.id;
  useEffect(() => {
    if (!projectId) return;
    let live = true;
    const id = projectId;
    Promise.allSettled([
      api.tasks.list(id),
      api.ai.listConversations(id),
      agentRuns.list(id),
    ]).then(([tasks, chats, runs]) => {
      if (!live) return;
      setWork({
        projectId: id,
        groups: [
          {
            title: "Unfinished tasks",
            href: "/tasks",
            failed: tasks.status === "rejected",
            items:
              tasks.status === "fulfilled"
                ? tasks.value
                    .filter((t) => !["DONE", "CANCELLED"].includes(t.status))
                    .slice(0, 5)
                    .map((t) => ({
                      id: t.id,
                      title: t.title,
                      detail: t.status.replaceAll("_", " "),
                    }))
                : [],
          },
          {
            title: "Recent conversations",
            href: "/assistant",
            failed: chats.status === "rejected",
            items:
              chats.status === "fulfilled"
                ? chats.value
                    .slice(0, 5)
                    .map((c) => ({
                      id: c.id,
                      title: c.title,
                      detail: "Conversation",
                    }))
                : [],
          },
          {
            title: "Agent runs",
            href: "/assistant",
            failed: runs.status === "rejected",
            items:
              runs.status === "fulfilled"
                ? runs.value
                    .slice(0, 5)
                    .map((r) => ({
                      id: r.id,
                      title: r.prompt,
                      detail: r.status,
                    }))
                : [],
          },
        ],
      });
    });
    return () => {
      live = false;
    };
  }, [projectId, revision]);
  const visible = work?.projectId === currentProject?.id ? work : null;
  const recentProjects = [...projects]
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
    .slice(0, 6);
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-9">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Home</h1>
          <p className="mt-2 text-sm text-slate-500">
            Pick up where you left off.
          </p>
        </header>
        <section>
          <div className="flex justify-between mb-4">
            <h2 className="font-medium">Recent projects</h2>
            <Link
              href="/projects"
              className="text-sm text-slate-500 hover:underline"
            >
              All projects
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                onClick={() => setCurrentProject(project)}
                className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-400"
              >
                <span className="text-xs text-slate-400">{project.key}</span>
                <h3 className="mt-2 font-medium">{project.name}</h3>
                <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                  {project.description || "Open project"}
                </p>
              </Link>
            ))}
          </div>
          {!projects.length && (
            <Link
              href="/projects"
              className="block rounded-xl border border-dashed p-8 text-center text-sm"
            >
              Create your first project
            </Link>
          )}
        </section>
        {currentProject && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-medium">Continue in {currentProject.name}</h2>
              <select
                aria-label="Project for recent work"
                value={currentProject.id}
                onChange={(e) =>
                  setCurrentProject(
                    projects.find((p) => p.id === e.target.value) || null,
                  )
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {!visible ? (
              <p className="text-sm text-slate-500">Loading recent work…</p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {visible.groups.map((group) => (
                  <div
                    key={group.title}
                    className="rounded-xl border border-slate-200 bg-white p-5"
                  >
                    <Link
                      href={group.href}
                      className="font-medium text-sm hover:underline"
                    >
                      {group.title}
                    </Link>
                    <div className="mt-3 divide-y divide-slate-100">
                      {group.failed ? (
                        <p role="alert" className="text-sm text-amber-700 py-3">
                          Could not load.{" "}
                          <button
                            className="underline"
                            onClick={() => setRevision((r) => r + 1)}
                          >
                            Retry
                          </button>
                        </p>
                      ) : (
                        group.items.map((item) => (
                          <Link
                            href={group.href}
                            key={item.id}
                            className="block py-3"
                          >
                            <p className="text-sm line-clamp-2">{item.title}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {item.detail}
                            </p>
                          </Link>
                        ))
                      )}
                      {!group.failed && !group.items.length && (
                        <p className="text-sm text-slate-400 py-3">
                          Nothing here yet.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </AppLayout>
  );
}
