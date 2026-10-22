"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useProjectWorkspace } from "@/components/project-workspace";
import { SavedMemorySettings } from "@/components/assistant/saved-memory-settings";

export function PersonalizationSettings() {
  const { user, currentProject, projects, setCurrentProject } = useAuth();
  const { memoryDraft, clearMemoryDraft } = useProjectWorkspace();
  const [draft, setDraft] = useState(memoryDraft);
  const [saving, setSaving] = useState(false);
  useEffect(() => clearMemoryDraft(), [clearMemoryDraft]);

  return (
    <div className="personalization-settings">
      <div>
        <h1>Personalization</h1>
        <p>Manage what your assistant remembers for future conversations.</p>
      </div>
      <label className="personalization-project">
        Project
        <select
          aria-label="Memory project"
          value={currentProject?.id || ""}
          disabled={saving}
          onChange={(event) => {
            setDraft(null);
            setCurrentProject(
              projects.find((project) => project.id === event.target.value) ||
                null,
            );
          }}
        >
          <option value="" disabled>
            Choose a project
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <div>
        <h2>Saved memory</h2>
        {currentProject ? (
          <SavedMemorySettings
            key={`${user?.id}:${currentProject.id}`}
            projectId={currentProject.id}
            projectLabel={currentProject.name}
            draft={
              draft?.userId === user?.id &&
              draft?.projectId === currentProject.id
                ? draft
                : null
            }
            onSavingChange={setSaving}
          />
        ) : (
          <p className="personalization-empty">
            {projects.length
              ? "Choose a project to manage its private memory."
              : "Create a project to start saving memory."}
          </p>
        )}
      </div>
    </div>
  );
}
