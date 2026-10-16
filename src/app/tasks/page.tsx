"use client";
import { useEffect, useState, FormEvent } from "react";
import { AppLayout } from "@/components/app-layout";
import { ProjectNavigation } from "@/components/project-navigation";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";

type Task = {
  id: string;
  title: string;
  description?: string;
  status: string;
  version: number;
  dueDate?: string;
};
function Checklist({
  projectId,
  writable,
}: {
  projectId: string;
  writable: boolean;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    api.tasks
      .list(projectId)
      .then((rows) => {
        if (live) setTasks(rows);
      })
      .catch((e) => {
        if (live) setError(e.message || "Could not load tasks.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [projectId, retry]);
  async function add(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || busy || !writable) return;
    setBusy(true);
    setError("");
    try {
      const task = await api.tasks.create(projectId, {
        title: title.trim(),
        status: "TODO",
      });
      setTasks((previous) => [task, ...previous]);
      setTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add task.");
    } finally {
      setBusy(false);
    }
  }
  async function toggle(task: Task) {
    setBusy(true);
    setError("");
    try {
      const updated = await api.tasks.update(projectId, task.id, {
        version: task.version,
        status: task.status === "DONE" ? "TODO" : "DONE",
      });
      setTasks((previous) =>
        previous.map((t) => (t.id === task.id ? updated : t)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update task.");
    } finally {
      setBusy(false);
    }
  }
  const shown = tasks.filter(
    (task) => showDone || !["DONE", "CANCELLED"].includes(task.status),
  );
  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className="text-sm text-slate-500 mt-2">
          The next actions for this project.
        </p>
      </header>
      {writable && (
        <form onSubmit={add} className="flex gap-2">
          <input
            aria-label="New task"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a task…"
            className="flex-1 min-w-0 rounded-lg border border-slate-200 px-4 py-3 text-sm"
          />
          <button
            disabled={busy || loading || !title.trim()}
            className="rounded-lg bg-slate-900 text-white px-4 text-sm disabled:opacity-40"
          >
            Add
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}{" "}
          <button className="underline" onClick={() => setRetry((r) => r + 1)}>
            Reload tasks
          </button>
        </p>
      )}
      <label className="flex gap-2 text-sm text-slate-500">
        <input
          type="checkbox"
          checked={showDone}
          onChange={(e) => setShowDone(e.target.checked)}
        />
        Show completed and cancelled tasks
      </label>
      {loading ? (
        <p className="text-sm text-slate-500">Loading tasks…</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {shown.map((task) => (
            <div key={task.id} className="flex gap-3 p-4">
              <input
                aria-label={`Complete ${task.title}`}
                type="checkbox"
                checked={task.status === "DONE"}
                disabled={!writable || busy || task.status === "CANCELLED"}
                onChange={() => toggle(task)}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm ${task.status === "DONE" ? "line-through text-slate-400" : "text-slate-900"}`}
                >
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">
                    {task.description}
                  </p>
                )}
                {!["TODO", "DONE"].includes(task.status) && (
                  <p className="text-xs text-slate-400 mt-1">
                    {task.status.replaceAll("_", " ")}
                  </p>
                )}
                {task.dueDate && (
                  <p className="text-xs text-slate-400 mt-1">
                    Due {task.dueDate.slice(0, 10)}
                  </p>
                )}
              </div>
            </div>
          ))}
          {!shown.length && !error && (
            <p className="p-8 text-center text-sm text-slate-400">
              No unfinished tasks. Add your next action above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
export default function TasksPage() {
  const { currentProject, user } = useAuth();
  const writable =
    user?.systemRole === "ADMIN" ||
    ["OWNER", "MANAGER", "CONTRIBUTOR"].includes(
      currentProject?.currentUserRole || "",
    );
  return (
    <AppLayout>
      <ProjectNavigation active="Tasks" />
      {currentProject ? (
        <Checklist
          key={currentProject.id}
          projectId={currentProject.id}
          writable={writable}
        />
      ) : (
        <p className="text-sm text-slate-500">
          Open a project to use its checklist.
        </p>
      )}
    </AppLayout>
  );
}
