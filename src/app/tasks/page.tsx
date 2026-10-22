"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TaskBoard from "@/components/tasks/task-board";
import { AgentWork } from "@/components/tasks/agent-work";
function TasksView() {
  const params = useSearchParams();
  return params.get("view") === "agents" ? <AgentWork /> : <TaskBoard />;
}
export default function TasksPage() {
  return (
    <Suspense fallback={<div role="status">Loading tasks…</div>}>
      <TasksView />
    </Suspense>
  );
}
