"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import {
  chiefApi,
  type ChiefBriefing,
  type ChiefPreferences,
} from "@/lib/chief-api";
import { Modal } from "@/components/ui/modal";

export function ChiefBriefingPanel() {
  const { user, currentProject } = useAuth();
  const scope = `${user?.id}:${currentProject?.id || "all"}`;
  const [snapshot, setSnapshot] = useState<{
    scope: string;
    data: ChiefBriefing;
  } | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState(false);
  const [cadence, setCadence] = useState<ChiefPreferences["cadence"]>("OFF");
  const [hour, setHour] = useState(2),
    [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false),
    [saveError, setSaveError] = useState("");
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    setSnapshot(null);
    setError("");
    setEditing(false);
    const poll = async () => {
      if (document.visibilityState === "visible") {
        try {
          const data = await chiefApi.briefing(currentProject?.id);
          if (active) {
            setSnapshot({ scope, data });
            setError("");
          }
        } catch (e) {
          if (active)
            setError(
              e instanceof Error ? e.message : "Briefing could not load.",
            );
        }
      }
      if (active) timer = setTimeout(poll, 60_000);
    };
    if (user) void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [scope, currentProject?.id, user, revision]);
  const data = snapshot?.scope === scope ? snapshot.data : null;
  const button =
    "workspace-pill inline-flex items-center justify-center text-sm disabled:opacity-50";
  return (
    <>
      <details className="rounded-2xl border border-border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
          Briefing & spending
          {data?.preferences.lastBriefingAt
            ? ` · Last scheduled ${new Date(data.preferences.lastBriefingAt).toLocaleDateString()}`
            : ""}
        </summary>
        <div className="space-y-5 border-t border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Current goals, blockers and agent outcomes
              {currentProject
                ? ` in ${currentProject.name}`
                : " across projects"}
              .
            </p>
            <div className="flex gap-2">
              <button
                className={button}
                onClick={() => setRevision((r) => r + 1)}
              >
                Refresh
              </button>
              <button
                className={button}
                disabled={!data}
                onClick={() => {
                  if (!data) return;
                  setCadence(data.preferences.cadence);
                  setHour(data.preferences.hourUtc);
                  setBudget(
                    data.preferences.monthlyBudgetUsd === null
                      ? ""
                      : String(data.preferences.monthlyBudgetUsd),
                  );
                  setSaveError("");
                  setEditing(true);
                }}
              >
                Schedule & budget
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm">
              {error}
            </p>
          )}
          {!data ? (
            <p role="status" className="text-sm text-muted-foreground">
              {error ? "Use Refresh to retry." : "Preparing briefing…"}
            </p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-xl border border-border p-4">
                  <h3 className="text-sm font-medium">Goal progress</h3>
                  {data.goals.length ? (
                    <ul className="mt-3 space-y-3">
                      {data.goals.slice(0, 5).map((g) => (
                        <li key={g.id} className="text-sm">
                          <Link className="hover:underline" href="/goals">
                            {g.title}
                          </Link>
                          <span className="ml-2 text-muted-foreground">
                            {g.measuredProgress}% measured
                          </span>
                          {g.risks && (
                            <p className="mt-1 text-muted-foreground">
                              Risk: {g.risks}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No active goals in this scope.
                    </p>
                  )}
                </section>
                <section className="rounded-xl border border-border p-4">
                  <h3 className="text-sm font-medium">Needs attention</h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    {data.tasks
                      .filter(
                        (t) =>
                          t.status === "BLOCKED" || t.status === "IN_REVIEW",
                      )
                      .slice(0, 5)
                      .map((t) => (
                        <li key={t.id}>
                          <Link className="hover:underline" href="/tasks">
                            {t.title}
                          </Link>{" "}
                          <span className="text-muted-foreground">
                            ·{" "}
                            {t.status === "BLOCKED"
                              ? "Blocked"
                              : "Review needed"}
                          </span>
                        </li>
                      ))}
                  </ul>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {
                      data.work.filter(
                        (w) =>
                          ["SUCCEEDED", "FAILED", "CANCELLED"].includes(
                            w.status,
                          ) && !w.review,
                      ).length
                    }{" "}
                    recent agent outcomes await review.
                  </p>
                  <Link
                    href="/tasks?view=agents"
                    className="mt-2 inline-block text-sm underline"
                  >
                    Review agent work
                  </Link>
                </section>
              </div>
              <section className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-medium">
                  Workspace execution spending · {data.budget.period} UTC
                </h3>
                <p className="mt-2 text-lg font-semibold">
                  ${data.budget.reportedUsd.toFixed(4)} reported
                  {data.budget.monthlyBudgetUsd !== null && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / ${data.budget.monthlyBudgetUsd} threshold
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm">
                  {data.budget.unknownRuns} of {data.budget.trackedRuns} runs
                  have unknown costs.
                  {data.budget.overBudget &&
                    " Reported spending exceeds your threshold."}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {data.budget.notice}
                </p>
              </section>
              <p className="text-xs text-muted-foreground">
                Updated {new Date(data.generatedAt).toLocaleString()}. Up to 100
                goals, 50 tasks and 50 recent runs. Spending covers all
                accessible tracked runs this month.
                {data.preferences.nextBriefingAt
                  ? ` Next scheduled briefing: ${new Date(data.preferences.nextBriefingAt).toLocaleString()}.`
                  : " Scheduled briefings are off."}{" "}
                Schedules run while OSCAR’s backend is online.
              </p>
            </>
          )}
        </div>
      </details>
      {editing && (
        <Modal
          label="Briefing schedule and budget"
          onClose={() => setEditing(false)}
          busy={busy}
        >
          <form
            className="space-y-4 rounded-2xl border border-border bg-background p-6"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setSaveError("");
              try {
                await chiefApi.preferences({
                  cadence,
                  hourUtc: hour,
                  monthlyBudgetUsd:
                    budget.trim() === "" ? null : Number(budget),
                });
                setEditing(false);
                setRevision((r) => r + 1);
              } catch (e) {
                setSaveError(
                  e instanceof Error
                    ? e.message
                    : "Preferences could not save.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2 className="text-lg font-semibold">Schedule & budget</h2>
            <label className="block text-sm">
              Briefings
              <select
                className="collection-select mt-2 w-full"
                value={cadence}
                onChange={(e) =>
                  setCadence(e.target.value as ChiefPreferences["cadence"])
                }
                disabled={busy}
              >
                <option value="OFF">Off</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly on Monday</option>
              </select>
            </label>
            <label className="block text-sm">
              Hour in UTC
              <input
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                type="number"
                min="0"
                max="23"
                required
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                disabled={busy || cadence === "OFF"}
              />
            </label>
            <label className="block text-sm">
              Monthly reporting threshold (USD)
              <input
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                type="number"
                min="0"
                max="99999999"
                step="0.0001"
                placeholder="No threshold"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                disabled={busy}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Briefings appear here in OSCAR. This does not authorize recurring
              agent work or enforce a spending cap.
            </p>
            {saveError && (
              <p role="alert" className="text-sm">
                {saveError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button className={button} disabled={busy}>
                {busy ? "Saving…" : "Save preferences"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
