"use client";
import { useEffect, useRef, useState } from "react";
import {
  Download,
  FolderOpen,
  FolderPlus,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { folderResumeHash } from "@/lib/folder-resume";
import { apiRequest, apiRequestRaw } from "@/lib/api";
interface Folder {
  id: string;
  name: string;
  status: string;
  fileCount: number;
  expectedFiles: number;
  bytes: number;
  pendingFiles: number;
  failedFiles: number;
}
interface StoredFile {
  id: string;
  path: string;
  size: number;
  reason: string | null;
  resumeHash: string | null;
  extractionStatus: string;
}
interface Settings {
  quotaBytes: number;
  usedBytes: number;
  maxFileBytes: number;
  maxFiles: number;
  maxSources: number;
}
interface Page {
  files: StoredFile[];
  nextOffset: number | null;
}
interface Upload {
  id?: string;
  name: string;
  files: File[];
}
const size = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KiB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
export function UploadedFolderSources({
  projectId,
  initialFiles,
  onInitialFilesConsumed,
}: {
  projectId?: string;
  initialFiles?: File[];
  onInitialFilesConsumed?: () => void;
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const resumeTarget = useRef<Folder | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [pending, setPending] = useState<Upload | null>(null),
    [expanded, setExpanded] = useState<string | null>(null),
    [pages, setPages] = useState<Record<string, Page>>({}),
    [preview, setPreview] = useState<{
      path: string;
      text: string;
      nextOffset: number | null;
      folderId: string;
    } | null>(null),
    [deleting, setDeleting] = useState<Folder | null>(null);
  const previewDialog = useRef<HTMLDialogElement>(null),
    deleteDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = previewDialog.current;
    if (preview) node?.showModal();
    return () => node?.close();
  }, [preview]);
  useEffect(() => {
    const node = deleteDialog.current;
    if (deleting) node?.showModal();
    return () => node?.close();
  }, [deleting]);
  const input = useRef<HTMLInputElement>(null),
    alive = useRef(true),
    request = useRef<AbortController | null>(null);
  const base = `/projects/${projectId}/uploaded-folders`;
  const openedTarget = useRef<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const folderId = params.get("folderId");
    const path = params.get("path");
    const target = `${projectId}:${folderId}:${path}`;
    if (
      !folderId ||
      !path ||
      openedTarget.current === target ||
      (params.get("projectId") && params.get("projectId") !== projectId) ||
      !folders.some((folder) => folder.id === folderId)
    )
      return;
    openedTarget.current = target;
    setExpanded(folderId);
    void loadFiles(folderId);
    void read(folderId, path);
    // Deep links open once after the owner-scoped folder list is available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders, projectId]);
  async function refresh() {
    const [data, policy] = await Promise.all([
      apiRequest<Folder[]>(base),
      apiRequest<Settings>(`${base}/settings`),
    ]);
    if (alive.current) {
      setFolders(data);
      setSettings(policy);
    }
  }
  useEffect(() => {
    alive.current = true;
    input.current?.setAttribute("webkitdirectory", "");
    const update = () => {
      if (projectId)
        Promise.all([
          apiRequest<Folder[]>(`/projects/${projectId}/uploaded-folders`),
          apiRequest<Settings>(
            `/projects/${projectId}/uploaded-folders/settings`,
          ),
        ])
          .then(([data, policy]) => {
            if (alive.current) {
              setFolders(data);
              setSettings(policy);
            }
          })
          .catch((e) => {
            if (alive.current) setError(e.message);
          });
    };
    update();
    const timer = setInterval(update, 5000);
    return () => {
      clearInterval(timer);
      alive.current = false;
      request.current?.abort();
    };
  }, [projectId]);
  async function upload(job: Upload) {
    if (!projectId || busy) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setProgress(0);
    setError("");
    setPending(job);
    try {
      if (!job.id)
        job.id = (
          await apiRequest<{ id: string }>(base, {
            method: "POST",
            body: JSON.stringify({
              name: job.name,
              expectedFiles: job.files.length,
            }),
            signal: controller.signal,
          })
        ).id;
      const existing = new Map<string, StoredFile>();
      let pageOffset: number | null = 0;
      while (pageOffset !== null) {
        const page: Page = await apiRequest<Page>(
          `${base}/${job.id}/files?limit=1000&offset=${pageOffset}`,
          { signal: controller.signal },
        );
        page.files.forEach((file) => existing.set(file.path, file));
        pageOffset = page.nextOffset;
      }
      const paths = new Set(
        job.files.map((file) =>
          file.webkitRelativePath.split("/").slice(1).join("/"),
        ),
      );
      if (Array.from(existing.keys()).some((path) => !paths.has(path)))
        throw new Error(
          "This folder has changed. Resume with the original files or discard this copy and upload again.",
        );
      let cursor = 0,
        done = 0;
      const workers = Array.from(
        { length: Math.min(3, job.files.length) },
        async () => {
          while (cursor < job.files.length && !controller.signal.aborted) {
            const file = job.files[cursor++];
            const path = file.webkitRelativePath.split("/").slice(1).join("/");
            const saved = existing.get(path);
            if (saved?.resumeHash) {
              if (
                saved.size !== file.size ||
                (await folderResumeHash(file, controller.signal)) !==
                  saved.resumeHash
              )
                throw new Error(
                  `The saved file ${path} has changed. Discard this copy to upload the changed folder.`,
                );
            } else {
              const body = new FormData();
              body.append("path", path);
              body.append("file", file);
              await apiRequest(`${base}/${job.id}/files`, {
                method: "PUT",
                body,
                signal: controller.signal,
              });
            }
            done++;
            if (alive.current) setProgress(done);
          }
        },
      );
      const results = await Promise.allSettled(workers);
      const failure = results.find((r) => r.status === "rejected");
      if (failure?.status === "rejected") throw failure.reason;
      await apiRequest(`${base}/${job.id}/complete`, {
        method: "POST",
        signal: controller.signal,
      });
      if (alive.current) {
        setPending(null);
        await refresh();
      }
    } catch (e) {
      if (alive.current) {
        setError(
          controller.signal.aborted
            ? "Upload paused. Resume when ready."
            : (e as Error).message,
        );
        await refresh().catch(() => {});
      }
    } finally {
      if (request.current === controller) request.current = null;
      if (alive.current) setBusy(false);
    }
  }
  function choose(files: File[]) {
    if (!files.length || !settings) return;
    const target = resumeTarget.current;
    resumeTarget.current = null;
    const name = files[0].webkitRelativePath.split("/")[0];
    if (
      target &&
      (target.name !== name || target.expectedFiles !== files.length)
    ) {
      setError(
        "Choose the same folder and file count to resume. Discard the incomplete copy to start over.",
      );
      return;
    }
    const bytes = files.reduce((n, f) => n + f.size, 0);
    if (
      files.length > settings.maxFiles ||
      bytes - (target?.bytes || 0) > settings.quotaBytes - settings.usedBytes ||
      files.some(
        (f) =>
          f.size > settings.maxFileBytes || !f.webkitRelativePath.includes("/"),
      )
    ) {
      setError(
        `Upload exceeds your storage quota or file policy (${settings.maxFiles.toLocaleString()} files; ${size(settings.maxFileBytes)} per file).`,
      );
      return;
    }
    void upload({ id: target?.id, name, files });
  }
  const importedFiles = useRef<File[] | undefined>();
  useEffect(() => {
    if (
      !settings ||
      !initialFiles?.length ||
      importedFiles.current === initialFiles
    )
      return;
    importedFiles.current = initialFiles;
    choose(initialFiles);
    onInitialFilesConsumed?.();
    // The existing chooser owns policy checks and upload retries. Import each selection once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiles, settings, onInitialFilesConsumed]);
  async function loadFiles(id: string, offset = 0) {
    try {
      const page = await apiRequest<Page>(
        `${base}/${id}/files?offset=${offset}`,
      );
      if (alive.current)
        setPages((old) => ({
          ...old,
          [id]: {
            ...page,
            files: offset
              ? [...(old[id]?.files || []), ...page.files]
              : page.files,
          },
        }));
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    }
  }
  async function download(folderId: string, file: StoredFile) {
    try {
      const response = await apiRequestRaw(
        `${base}/${folderId}/files/${file.id}/download`,
      );
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.path.split("/").pop() || "file";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    }
  }
  async function read(folderId: string, path: string, offset = 0) {
    try {
      const data = await apiRequest<{
        text: string | null;
        reason?: string;
        nextOffset: number | null;
      }>(
        `${base}/${folderId}/read?path=${encodeURIComponent(path)}&offset=${offset}`,
      );
      if (alive.current)
        setPreview({
          path,
          folderId,
          text: data.text ?? data.reason ?? "No extracted text.",
          nextOffset: data.nextOffset ?? null,
        });
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    }
  }
  async function remove(folder: Folder) {
    try {
      await apiRequest(`${base}/${folder.id}`, { method: "DELETE" });
      if (alive.current) {
        if (pending?.id === folder.id) setPending(null);
        setDeleting(null);
        await refresh();
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    }
  }
  if (!projectId) return null;
  return (
    <section className="uploaded-folder-sources">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">Folders</h2>
          <p className="mt-1 text-xs text-slate-500">
            Saved folder copies for your project context.
          </p>
        </div>
        <button
          disabled={busy || !!pending || !settings}
          onClick={() => {
            resumeTarget.current = null;
            input.current?.click();
          }}
          className="files-secondary-button"
        >
          <FolderPlus size={16} />
          Upload folder
        </button>
      </div>
      <input
        aria-label="Choose folder to upload"
        className="hidden"
        type="file"
        multiple
        ref={input}
        onChange={(e) => {
          choose(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <details className="mt-2 text-xs text-slate-500">
        <summary className="cursor-pointer">Upload details</summary>
        <p className="mt-2">
          All chosen files, including hidden files, are stored here. Relevant
          content may reach your AI provider. Later edits need another upload.
        </p>
        {settings && (
          <p className="mt-2">
            {size(settings.usedBytes)} / {size(settings.quotaBytes)} stored · up
            to {settings.maxFiles.toLocaleString()} files and{" "}
            {size(settings.maxFileBytes)} per file.
          </p>
        )}
      </details>
      {pending && (
        <div className="mt-3 flex items-center gap-3 text-sm" role="status">
          <span>
            {pending.name} · {progress}/{pending.files.length} files
            {busy ? " uploading…" : " · incomplete"}
          </span>
          {busy && (
            <button
              className="underline"
              onClick={() => request.current?.abort()}
            >
              Pause
            </button>
          )}
          {!busy && (
            <>
              <button
                className="underline"
                onClick={() => void upload(pending)}
              >
                Retry
              </button>
              <button
                className="underline"
                onClick={() =>
                  pending.id
                    ? setDeleting({
                        id: pending.id,
                        name: pending.name,
                      } as Folder)
                    : setPending(null)
                }
              >
                Discard
              </button>
            </>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-3 divide-y">
        {folders.map((folder) => (
          <div key={folder.id} className="py-2">
            <div className="flex items-center gap-2">
              <button
                aria-expanded={expanded === folder.id}
                className="uploaded-folder-row"
                onClick={() => {
                  setExpanded(expanded === folder.id ? null : folder.id);
                  if (!pages[folder.id]) void loadFiles(folder.id);
                }}
              >
                <ChevronRight
                  size={14}
                  className={expanded === folder.id ? "rotate-90" : ""}
                />
                <FolderOpen size={16} />
                <span className="uploaded-folder-name">{folder.name}</span>
                <span className="uploaded-folder-meta">
                  {folder.fileCount} files · {size(folder.bytes)}
                  {folder.status !== "READY"
                    ? " · incomplete"
                    : folder.pendingFiles
                      ? ` · preparing ${folder.pendingFiles} files`
                      : folder.failedFiles
                        ? ` · ${folder.failedFiles} files unavailable to AI`
                        : ""}
                </span>
              </button>
              {folder.status === "UPLOADING" && !busy && (
                <button
                  className="text-xs underline"
                  onClick={() => {
                    resumeTarget.current = folder;
                    input.current?.click();
                  }}
                >
                  Resume
                </button>
              )}
              <button
                disabled={busy}
                aria-label={`Delete ${folder.name}`}
                className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-40"
                onClick={() => setDeleting(folder)}
              >
                <Trash2 size={15} />
              </button>
            </div>
            {expanded === folder.id && (
              <div className="mt-2 max-h-72 overflow-auto pl-5">
                {pages[folder.id]?.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 py-1 text-xs"
                  >
                    <button
                      disabled={folder.status !== "READY"}
                      title={file.reason || "Preview extracted text"}
                      className="min-w-0 flex-1 truncate text-left disabled:text-slate-400"
                      onClick={() => void read(folder.id, file.path)}
                    >
                      {file.path}
                    </button>
                    <span className="text-slate-400">{size(file.size)}</span>
                    <button
                      aria-label={`Download ${file.path}`}
                      className="p-1"
                      onClick={() => void download(folder.id, file)}
                    >
                      <Download size={14} />
                    </button>
                  </div>
                ))}
                {pages[folder.id]?.nextOffset != null && (
                  <button
                    className="my-2 text-xs underline"
                    onClick={() =>
                      void loadFiles(folder.id, pages[folder.id].nextOffset!)
                    }
                  >
                    Show more files
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {preview && (
        <dialog
          ref={previewDialog}
          aria-label="File preview"
          onCancel={() => setPreview(null)}
          className="fixed inset-0 z-50 m-auto w-[min(90vw,800px)] rounded-xl border bg-white p-5 shadow-xl"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm">{preview.path}</span>
            <button onClick={() => setPreview(null)}>Close</button>
          </div>
          <pre className="my-4 max-h-[60vh] overflow-auto whitespace-pre-wrap break-words text-xs">
            {preview.text}
          </pre>
          {preview.nextOffset != null && (
            <button
              className="text-sm underline"
              onClick={() =>
                void read(preview.folderId, preview.path, preview.nextOffset!)
              }
            >
              Next page
            </button>
          )}
        </dialog>
      )}
      {deleting && (
        <dialog
          ref={deleteDialog}
          aria-label="Delete saved folder"
          onCancel={() => setDeleting(null)}
          className="fixed inset-0 z-50 m-auto rounded-xl border bg-white p-5 shadow-xl"
        >
          <p className="text-sm">
            Delete the saved copy of {deleting.name} and its index?
          </p>
          <p className="mt-2 text-xs text-slate-500">
            The original folder on your computer stays intact.
          </p>
          <div className="mt-4 flex justify-end gap-4">
            <button onClick={() => setDeleting(null)}>Cancel</button>
            <button
              className="text-red-600"
              onClick={() => void remove(deleting)}
            >
              Delete copy
            </button>
          </div>
        </dialog>
      )}
    </section>
  );
}
