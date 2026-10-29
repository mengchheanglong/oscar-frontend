"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FileLibrary from "@/components/knowledge/file-library";
import MemoryLibrary from "@/components/knowledge/memory-library";
import KnowledgeGraph from "@/components/knowledge/knowledge-graph";
function KnowledgeView() {
  const params = useSearchParams();
  if (params.get("view") === "graph") return <KnowledgeGraph />;
  return params.get("view") !== "files" ? <MemoryLibrary /> : <FileLibrary />;
}
export default function KnowledgePage() {
  return (
    <Suspense fallback={<div role="status">Loading knowledge…</div>}>
      <KnowledgeView />
    </Suspense>
  );
}
