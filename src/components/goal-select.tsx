"use client";
import { useEffect, useState, useId } from "react";
import { api } from "@/lib/api";

export function GoalSelect({
  projectId,
  value,
  onChange,
  disabled = false,
}: {
  projectId?: string | null;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [goals, setGoals] = useState<
    Array<{ id: string; title: string; projectId?: string | null }>
  >([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setGoals([]);
    setFailed(false);
    const request = projectId
      ? api.goals.listProjectGoals(projectId, { limit: 100 })
      : api.goals.listUserGoals({ limit: 100 });
    request
      .then((result) => {
        if (active)
          setGoals(
            (result.data || []).filter(
              (goal: any) => projectId || !goal.projectId,
            ),
          );
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [projectId]);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        Goal
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || failed}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="">No linked goal</option>
        {value && !goals.some((g) => g.id === value) && (
          <option value={value}>Current goal</option>
        )}
        {goals.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.title}
          </option>
        ))}
      </select>
      {failed && (
        <p role="status" className="text-xs text-muted-foreground">
          Goals could not load. Reopen this form to retry.
        </p>
      )}
    </div>
  );
}
