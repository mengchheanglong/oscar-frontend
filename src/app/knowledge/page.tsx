"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FileLibrary from "@/components/knowledge/file-library";
import MemoryLibrary from "@/components/knowledge/memory-library";
function KnowledgeView() {
  const params = useSearchParams();
  return params.get("view") === "memories" ? (
    <MemoryLibrary />
  ) : (
    <FileLibrary />
  );
}
export default function KnowledgePage() {
  return (
    <Suspense fallback={<div role="status">Loading knowledge…</div>}>
      <KnowledgeView />
    </Suspense>
  );
}
