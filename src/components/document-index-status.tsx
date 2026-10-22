"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { api, apiRequest } from "@/lib/api";

interface DocumentReference {
  id: string;
  projectId: string;
  revision: number;
}

type IndexState =
  | "CHECKING"
  | "PENDING"
  | "PROCESSING"
  | "INDEXED"
  | "FAILED"
  | "UNSUPPORTED"
  | "UNAVAILABLE";

const STATUS_DETAILS = {
  CHECKING: {
    label: "Checking status",
    description: "Checking this document's current indexing status.",
    tone: "bg-slate-100 text-slate-600 border-slate-200",
  },
  PENDING: {
    label: "Pending",
    description:
      "This document is uploaded, but its current revision has not been indexed for AI search yet.",
    tone: "bg-amber-50 text-amber-700 border-amber-100",
  },
  PROCESSING: {
    label: "Processing",
    description:
      "This document is being processed. Its current revision is not ready for AI search yet.",
    tone: "bg-blue-50 text-blue-700 border-blue-100",
  },
  INDEXED: {
    label: "Indexed",
    description:
      "This document's current revision is indexed and available to OSCAR for search and citations.",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  FAILED: {
    label: "Failed",
    description:
      "Document processing failed. Its current revision is not available for AI search.",
    tone: "bg-red-50 text-red-700 border-red-100",
  },
  UNSUPPORTED: {
    label: "Unsupported",
    description:
      "This file can be downloaded, but its format is not supported for AI indexing.",
    tone: "bg-amber-50 text-amber-700 border-amber-100",
  },
  UNAVAILABLE: {
    label: "Status unavailable",
    description:
      "The indexing status could not be checked. Refresh to try again.",
    tone: "bg-slate-100 text-slate-600 border-slate-200",
  },
} satisfies Record<
  IndexState,
  { label: string; description: string; tone: string }
>;

export function DocumentIndexStatus({
  document,
}: {
  document: DocumentReference;
}) {
  const [status, setStatus] = useState<IndexState>("CHECKING");
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setStatus("CHECKING");

    const refresh = async () => {
      let nextStatus: IndexState = "UNAVAILABLE";
      try {
        const [latestDocument, sources] = await Promise.all([
          apiRequest<DocumentReference & { processingStatus: string }>(
            `/projects/${document.projectId}/documents/${document.id}`,
          ),
          api.ingestion.listSources(document.projectId, {
            sourceType: "DOCUMENT",
          }),
        ]);
        const source = sources.find(
          (item: any) =>
            item.projectId === document.projectId &&
            item.sourceType === "DOCUMENT" &&
            item.sourceId === document.id &&
            item.sourceRevision === latestDocument.revision &&
            !item.deletedAt,
        );

        if (source) {
          switch (source.status) {
            case "INDEXED":
              nextStatus = "INDEXED";
              break;
            case "PROCESSING":
              nextStatus = "PROCESSING";
              break;
            case "QUEUED":
              nextStatus = "PENDING";
              break;
            case "FAILED":
              nextStatus = "FAILED";
              break;
          }
        } else {
          // File processing completion alone does not prove an AI index exists.
          switch (latestDocument.processingStatus) {
            case "PENDING":
            case "COMPLETED":
              nextStatus = "PENDING";
              break;
            case "FAILED":
              nextStatus = "FAILED";
              break;
            case "UNSUPPORTED":
              nextStatus = "UNSUPPORTED";
              break;
          }
        }
      } catch {
        // Never present an unchecked or stale index as available.
      }

      if (cancelled) return;
      setStatus(nextStatus);
      if (nextStatus === "PENDING" || nextStatus === "PROCESSING") {
        timer = setTimeout(refresh, 5000);
      }
    };

    void refresh();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [document.id, document.projectId, document.revision, refreshCount]);

  const details = STATUS_DETAILS[status];
  const Icon =
    status === "INDEXED"
      ? CheckCircle2
      : status === "CHECKING" || status === "PROCESSING"
        ? Loader2
        : AlertCircle;

  return (
    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-800">
          AI Ingestion &amp; Knowledge Index
        </span>
        <span
          role="status"
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${details.tone}`}
        >
          <Icon
            className={`w-3 h-3 ${status === "CHECKING" || status === "PROCESSING" ? "animate-spin" : ""}`}
          />
          {details.label}
        </span>
      </div>
      <p className="text-[11px] text-slate-500">{details.description}</p>
      <button
        type="button"
        onClick={() => setRefreshCount((count) => count + 1)}
        disabled={status === "CHECKING"}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
      >
        <RefreshCw className="w-3 h-3" />
        Refresh status
      </button>
    </div>
  );
}
