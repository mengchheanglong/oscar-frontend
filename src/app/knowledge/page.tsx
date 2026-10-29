import { Suspense } from "react";
import { redirect } from "next/navigation";
import FileLibrary from "@/components/knowledge/file-library";
import MemoryLibrary from "@/components/knowledge/memory-library";
export default function KnowledgePage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  if (searchParams.view === "graph") redirect("/graph");
  return (
    <Suspense fallback={<div role="status">Loading knowledge…</div>}>
      {searchParams.view !== "files" ? <MemoryLibrary /> : <FileLibrary />}
    </Suspense>
  );
}
