"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import {
  chiefApi,
  type ExecutionPlatform,
  type ExecutionReview,
} from "@/lib/chief-api";

export function ExecutionReviewForm({
  platform,
  runId,
  status,
  onClose,
}: {
  platform: ExecutionPlatform;
  runId: string;
  status: string;
  onClose: () => void;
}) {
  const [saved, setSaved] = useState<ExecutionReview | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [verdict, setVerdict] = useState<ExecutionReview["verdict"]>(
    status === "SUCCEEDED" ? "ACCEPTED" : "NEEDS_WORK",
  );
  const [observation, setObservation] = useState(""),
    [lesson, setLesson] = useState(""),
    [cost, setCost] = useState("");
  const pending = useRef<{ signature: string; key: string }>();
  useEffect(() => {
    let active = true;
    chiefApi
      .review(platform, runId)
      .then((r) => {
        if (active) {
          setSaved(r);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : "Review could not load.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [platform, runId]);
  const button = "workspace-pill text-sm disabled:opacity-50";
  const field =
    "mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm";
  return (
    <Modal label="Review execution outcome" onClose={onClose} busy={busy}>
      <form
        className="space-y-4 rounded-2xl border border-border bg-background p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const body = {
            verdict,
            observation: observation.trim(),
            lesson:
              verdict === "ACCEPTED" && lesson.trim()
                ? lesson.trim()
                : undefined,
            reportedCostUsd: cost.trim() ? Number(cost) : undefined,
          };
          const signature = JSON.stringify(body);
          if (pending.current?.signature !== signature)
            pending.current = { signature, key: crypto.randomUUID() };
          try {
            setSaved(
              await chiefApi.saveReview(platform, runId, {
                ...body,
                idempotencyKey: pending.current.key,
              }),
            );
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "The review could not save. Retry uses the same request key.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="text-lg font-semibold">Review execution outcome</h2>
        <p className="text-sm text-muted-foreground">
          The agent reported {status.toLowerCase()}. Record what you checked.
          Goal measurements are updated separately.
        </p>
        {loading ? (
          <p role="status">Loading review…</p>
        ) : saved ? (
          <>
            <p className="text-sm font-medium">
              {saved.verdict.toLowerCase().replaceAll("_", " ")}
            </p>
            <p className="whitespace-pre-wrap text-sm">{saved.observation}</p>
            <p className="text-sm text-muted-foreground">
              Cost:{" "}
              {saved.reportedCostUsd === null
                ? "unknown"
                : `$${saved.reportedCostUsd} USD (user reported)`}
            </p>
            {saved.memoryId && (
              <Link
                href="/knowledge?tab=memories"
                className="block text-sm underline"
              >
                Review the proposed lesson in Knowledge → Memories
              </Link>
            )}
          </>
        ) : (
          <>
            <label className="block text-sm">
              Outcome
              <select
                className={field}
                value={verdict}
                disabled={busy}
                onChange={(e) =>
                  setVerdict(e.target.value as ExecutionReview["verdict"])
                }
              >
                {status === "SUCCEEDED" && (
                  <option value="ACCEPTED">Accepted after checking</option>
                )}
                <option value="NEEDS_WORK">Needs more work</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
            <label className="block text-sm">
              Evidence & observation
              <textarea
                className={field}
                required
                maxLength={5000}
                rows={4}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                disabled={busy}
                placeholder="What did you verify? What gaps remain?"
              />
            </label>
            {verdict === "ACCEPTED" && (
              <label className="block text-sm">
                Lesson for MAVIS (optional)
                <textarea
                  className={field}
                  maxLength={2000}
                  rows={3}
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value)}
                  disabled={busy}
                  placeholder="A reusable lesson supported by this outcome"
                />
                <span className="text-xs text-muted-foreground">
                  Saved as a draft for separate approval in Memories.
                </span>
              </label>
            )}
            <label className="block text-sm">
              Reported execution cost (USD)
              <input
                type="number"
                min="0"
                max="99999999"
                step="0.0001"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                disabled={busy}
                className={field}
                placeholder="Leave blank when unknown"
              />
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="text-sm">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={onClose}
          >
            Close
          </button>
          {!loading && !saved && (
            <button type="submit" className={button} disabled={busy}>
              {busy ? "Saving…" : "Save review"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
