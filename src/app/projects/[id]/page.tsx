"use client";
import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { AppLayout } from "@/components/app-layout";
import { useProjectWorkspace } from "@/components/project-workspace";
function ProjectEntry() {
  const { id } = useParams<{ id: string }>();
  const { projects, isLoading } = useAuth();
  const { openPanel } = useProjectWorkspace();
  const opened = useRef(false);
  const project = projects.find((item) => item.id === id);
  useEffect(() => {
    if (project && !opened.current) {
      opened.current = true;
      openPanel(project);
    }
  }, [project, openPanel]);
  return (
    <p className="p-6 text-sm text-slate-500">
      {isLoading
        ? "Loading project…"
        : project
          ? "Opening project…"
          : "Project unavailable. Select a project from the sidebar."}
    </p>
  );
}
export default function ProjectPage() {
  return (
    <AppLayout>
      <ProjectEntry />
    </AppLayout>
  );
}
