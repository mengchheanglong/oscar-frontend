"use client";

import { useEffect, useRef, useState } from "react";

import {
  FileText,
  FolderOpen,
  FolderPlus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  directoryPicker,
  folderHandle,
  FolderSource,
  LocalDirectory,
  localFolders,
  ScannedFile,
  scanFolder,
} from "@/lib/local-folders";

export function LocalFolderSources({
  projectId,
  userId,
}: {
  projectId?: string;
  userId?: string;
}) {
  const [folders, setFolders] = useState<FolderSource[]>([]);

  const [supported, setSupported] = useState(false);

  const [busy, setBusy] = useState(false);

  const [loaded, setLoaded] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [preview, setPreview] = useState<{
    id: string;
    version: number;
    directory: LocalDirectory;
    files: ScannedFile[];
    skipped: number;
  }>();

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [removing, setRemoving] = useState<string>();

  const [query, setQuery] = useState("");
  const [activePath, setActivePath] = useState("");
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const reviewing = !!preview;
  useEffect(() => {
    if (!reviewing) return;
    const dialog = reviewDialog.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
    };
  }, [reviewing]);

  const handles = useRef(new Map<string, LocalDirectory>());

  const alive = useRef(true);

  const key = (id: string) => `${userId}:${projectId}:${id}`;

  useEffect(() => {
    alive.current = true;

    setSupported(!!directoryPicker() && window.isSecureContext);

    let cancelled = false;

    if (projectId && userId)
      localFolders
        .list(projectId)
        .then(async (sources) => {
          if (cancelled) return;

          setFolders(sources);
          setLoaded(true);

          for (const source of sources) {
            try {
              const handle = await folderHandle(
                `${userId}:${projectId}:${source.id}`,
                "get",
              );
              if (handle && !cancelled) handles.current.set(source.id, handle);
            } catch {
              /* Reconnect through the picker if browser persistence is unavailable. */
            }
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError(
              "Could not load folder sources. Reload this page to try again.",
            );
            setLoaded(true);
          }
        });

    return () => {
      cancelled = true;
      alive.current = false;
    };
  }, [projectId, userId]);

  async function choose(source?: FolderSource) {
    const picker = directoryPicker();

    if (!picker || !projectId || !userId || busy) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      // Request access directly from the user's click; do not silently restore permissions.

      let directory = source && handles.current.get(source.id);

      if (directory) {
        if ((await directory.requestPermission({ mode: "read" })) !== "granted")
          throw new Error(
            "Folder access was not granted. Reconnect the folder to try again.",
          );
      } else {
        directory = await picker({ mode: "read" });

        if (source && directory.name !== source.name)
          throw new Error(
            "Choose the original folder, or connect this folder as a new source.",
          );
      }

      const scanned = await scanFolder(directory);

      if (!alive.current) return;

      setPreview({
        id: source?.id ?? crypto.randomUUID(),
        version: source?.version ?? 0,
        directory,
        ...scanned,
      });

      const initial = scanned.files.filter((file) =>
        source
          ? source.files.some((previous) => previous.path === file.path)
          : scanned.files.length <= 100 &&
            scanned.files.reduce((sum, item) => sum + item.bytes, 0) <=
              512 * 1024,
      );

      setSelected(new Set(initial.map((file) => file.path)));
      setQuery("");
      setActivePath(scanned.files[0]?.path ?? "");
    } catch (err) {
      if (alive.current && (err as Error).name !== "AbortError")
        setError((err as Error).message || "Could not read the folder.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function indexPreview() {
    if (!preview || !projectId || busy) return;

    setBusy(true);
    setError("");

    try {
      await localFolders.sync(
        projectId,
        preview.id,
        preview.directory.name,
        preview.version,
        preview.files.filter((file) => selected.has(file.path)),
      );

      if (!alive.current) return;

      handles.current.set(preview.id, preview.directory);

      try {
        await folderHandle(key(preview.id), "put", preview.directory);
      } catch {
        if (alive.current)
          setNotice(
            "Indexed successfully. This browser could not remember access; select the folder again after reopening the page.",
          );
      }

      if (!alive.current) return;

      setPreview(undefined);

      setFolders(await localFolders.list(projectId));
    } catch (err) {
      if (alive.current)
        setError(
          (err as Error).message ||
            "Indexing failed. Your previous index is unchanged.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function disconnect(id: string) {
    if (!projectId || busy) return;

    setBusy(true);
    setError("");

    try {
      await localFolders.disconnect(projectId, id);

      if (!alive.current) return;

      handles.current.delete(id);

      try {
        await folderHandle(key(id), "delete");
      } catch {
        /* No backend index remains. */
      }

      if (!alive.current) return;

      setFolders((items) => items.filter((item) => item.id !== id));
      setRemoving(undefined);
    } catch (err) {
      if (alive.current)
        setError((err as Error).message || "Disconnect failed.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  const selectedBytes =
    preview?.files
      .filter((file) => selected.has(file.path))
      .reduce((sum, file) => sum + file.bytes, 0) ?? 0;

  const selectionTooLarge = selected.size > 100 || selectedBytes > 512 * 1024;

  const visibleFiles =
    preview?.files.filter((file) =>
      file.path.toLowerCase().includes(query.toLowerCase()),
    ) ?? [];
  const activeFile = preview?.files.find((file) => file.path === activePath);
  const groups = new Map<string, ScannedFile[]>();
  for (const file of visibleFiles) {
    const directory = file.path.includes("/")
      ? file.path.slice(0, file.path.lastIndexOf("/"))
      : "Root files";
    groups.set(directory, [...(groups.get(directory) ?? []), file]);
  }
  const size = (bytes: number) => `${(bytes / 1024).toFixed(1)} KiB`;
  function selectVisible() {
    if (!preview) return;
    const next = new Set(selected);
    let bytes = selectedBytes;
    for (const file of visibleFiles) {
      if (
        !next.has(file.path) &&
        next.size < 100 &&
        bytes + file.bytes <= 512 * 1024
      ) {
        next.add(file.path);
        bytes += file.bytes;
      }
    }
    setSelected(next);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FolderOpen className="h-4 w-4 text-slate-500" /> Source folders
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Local context for Copilot and Hermes · private to you in this
            project
          </p>
        </div>
        <Button
          variant="outline"
          disabled={!supported || !projectId || !loaded || busy || !!preview}
          onClick={() => choose()}
          className="gap-2"
        >
          <FolderPlus className="h-4 w-4" /> Add folder
        </Button>
      </div>
      <div className="border-t border-slate-100 px-5 py-4">
        {!projectId && (
          <p className="text-sm text-slate-500">
            Select a project to add a source folder.
          </p>
        )}
        {!supported && (
          <p className="mb-3 text-xs text-slate-500">
            Use Chrome or Edge over HTTPS or localhost to connect folders.
            Document uploads remain available below.
          </p>
        )}
        {!preview && error && (
          <p role="alert" className="mb-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mb-3 text-xs text-slate-600">
            {notice}
          </p>
        )}
        {busy && !preview && (
          <p
            role="status"
            className="mb-3 flex items-center gap-2 text-xs text-slate-500"
          >
            <RefreshCw className="h-3 w-3 animate-spin" /> Reading folder…
          </p>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50"
            >
              <div className="flex items-start gap-3 p-4">
                <FolderOpen className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <h3
                    className="truncate text-sm font-semibold"
                    title={folder.name}
                  >
                    {folder.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {folder.files.length} indexed{" "}
                    {folder.files.length === 1 ? "file" : "files"} · Snapshot{" "}
                    {folder.version}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Scanned{" "}
                    {folder.syncedAt
                      ? new Date(folder.syncedAt).toLocaleString()
                      : "never"}
                  </p>
                </div>
              </div>
              <details className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
                <summary className="cursor-pointer">Indexed files</summary>
                <ul className="mt-2 max-h-40 space-y-1 overflow-auto">
                  {folder.files.map((file) => (
                    <li key={file.path} className="break-all">
                      {file.path} · r{file.revision}
                    </li>
                  ))}
                </ul>
              </details>
              <div className="flex items-center gap-1 border-t border-slate-200 px-2 py-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!supported || busy || !!preview}
                  onClick={() => choose(folder)}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" /> Rescan
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  disabled={busy || !!preview}
                  onClick={() => setRemoving(folder.id)}
                >
                  Disconnect
                </Button>
              </div>
              {removing === folder.id && (
                <div className="space-y-3 border-t border-slate-200 p-4">
                  <p className="text-xs leading-relaxed text-slate-600">
                    Remove indexed text? Local files stay unchanged. Existing
                    chat answers and reports remain in history.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => disconnect(folder.id)}
                    >
                      Confirm disconnect
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => setRemoving(undefined)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {!folders.length && loaded && !busy && (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-7 text-center">
            <FolderPlus className="mb-3 h-6 w-6 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">
              Bring your working files into context
            </p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
              Choose a folder on this computer, review its files, and index the
              text you want your copilot to use.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 gap-2"
              disabled={!supported || !projectId || busy || !!preview}
              onClick={() => choose()}
            >
              <FolderPlus className="h-3.5 w-3.5" /> Add folder
            </Button>
          </div>
        )}
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Read-only
          access. Selected text is stored in this workspace’s backend and may be
          sent to the AI provider. Rescan manually to update it.
        </p>
      </div>

      {preview && (
        <dialog
          ref={reviewDialog}
          aria-labelledby="folder-review-title"
          aria-describedby="folder-review-description"
          onCancel={(event) => {
            event.preventDefault();
            if (!busy) setPreview(undefined);
          }}
          className="m-auto w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
        >
          <div className="flex max-h-[90dvh] flex-col">
            <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
              <FolderOpen className="h-5 w-5 shrink-0 text-slate-500" />
              <div className="min-w-0 flex-1">
                <h3
                  id="folder-review-title"
                  className="truncate text-base font-semibold"
                >
                  {preview.directory.name}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Review source files · {preview.files.length} eligible ·{" "}
                  {preview.skipped} excluded
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close folder review"
                disabled={busy}
                onClick={() => setPreview(undefined)}
              >
                <X className="h-4 w-4" />
              </Button>
            </header>
            <p
              id="folder-review-description"
              className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs leading-relaxed text-slate-600"
            >
              Choose files to share with your copilot. Selected text is stored
              in the backend and may be sent to the AI provider. Review for
              sensitive content before indexing.
            </p>
            <div className="grid min-h-0 flex-1 md:grid-cols-[340px_minmax(0,1fr)]">
              <aside className="flex min-h-0 flex-col border-b border-slate-200 md:border-b-0 md:border-r">
                <div className="space-y-2 border-b border-slate-200 p-3">
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                    <input
                      autoFocus
                      aria-label="Filter source files"
                      placeholder="Find a file…"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                    />
                  </label>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {visibleFiles.length} files
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy || !visibleFiles.length}
                        onClick={selectVisible}
                      >
                        Select visible
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy || !selected.size}
                        onClick={() => setSelected(new Set())}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="max-h-[28dvh] min-h-0 overflow-y-auto p-2 md:h-[45dvh] md:max-h-none">
                  {!visibleFiles.length && (
                    <p className="p-4 text-xs text-slate-500">
                      {query
                        ? "No matching files."
                        : "No supported text files found."}
                    </p>
                  )}
                  {Array.from(groups).map(([directory, files]) => (
                    <details key={directory} open className="mb-1">
                      <summary className="cursor-pointer break-all rounded-md px-2 py-2 text-[11px] font-medium text-slate-500">
                        {directory}{" "}
                        <span className="text-slate-400">({files.length})</span>
                      </summary>
                      {files.map((file) => (
                        <div
                          key={file.path}
                          className={`flex items-center gap-2 rounded-lg px-2 ${activePath === file.path ? "bg-slate-100" : "hover:bg-slate-50"}`}
                        >
                          <input
                            aria-label={`Include ${file.path}`}
                            type="checkbox"
                            checked={selected.has(file.path)}
                            disabled={busy}
                            className="h-3.5 w-3.5 shrink-0 accent-blue-600"
                            onChange={(event) =>
                              setSelected((old) => {
                                const next = new Set(old);
                                if (event.target.checked) next.add(file.path);
                                else next.delete(file.path);
                                return next;
                              })
                            }
                          />
                          <button
                            type="button"
                            aria-pressed={activePath === file.path}
                            title={file.path}
                            onClick={() => setActivePath(file.path)}
                            className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-xs focus-visible:outline-blue-600"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">
                              {file.path.split("/").pop()}
                            </span>
                            <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                              {size(file.bytes)}
                            </span>
                          </button>
                        </div>
                      ))}
                    </details>
                  ))}
                </div>
              </aside>
              <div className="flex min-h-0 flex-col bg-slate-50/50">
                <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-xs">
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <span
                    className="min-w-0 flex-1 truncate font-mono"
                    title={activeFile?.path}
                  >
                    {activeFile?.path ?? "File preview"}
                  </span>
                  {activeFile && (
                    <span className="shrink-0 text-slate-400">
                      {selected.has(activeFile.path)
                        ? "Included"
                        : "Not included"}
                    </span>
                  )}
                </div>
                <pre
                  tabIndex={0}
                  aria-label="File text preview"
                  className="max-h-[25dvh] min-h-0 flex-1 overflow-auto whitespace-pre p-4 font-mono text-xs leading-6 text-slate-600 md:h-[45dvh] md:max-h-none"
                >
                  {activeFile?.text ?? "Select a file to preview its text."}
                </pre>
              </div>
            </div>
            <footer className="space-y-3 border-t border-slate-200 px-5 py-4">
              {error && (
                <p role="alert" className="text-xs text-red-700">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p
                    className={`text-xs font-medium ${selectionTooLarge ? "text-red-700" : "text-slate-700"}`}
                    aria-live="polite"
                  >
                    {selected.size} / 100 files · {size(selectedBytes)} / 512
                    KiB
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {selectionTooLarge
                      ? "Reduce your selection to continue."
                      : "Select visible adds files that fit within the limits."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setPreview(undefined)}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={
                      busy ||
                      selectionTooLarge ||
                      (preview.version === 0 && !selected.size)
                    }
                    onClick={indexPreview}
                  >
                    {busy
                      ? "Indexing…"
                      : `Index ${selected.size} ${selected.size === 1 ? "file" : "files"}`}
                  </Button>
                </div>
              </div>
              <details className="text-[11px] leading-relaxed text-slate-500">
                <summary className="cursor-pointer">What gets indexed?</summary>
                <p className="mt-2">
                  Supported text and code files only, up to 128 KiB each. Hidden
                  files, common credential filenames, dependencies and binaries
                  are excluded. Indexing replaces the previous snapshot;
                  unselected or removed files leave the index. New files require
                  selection. The saved snapshot stays available after this page
                  closes.
                </p>
              </details>
            </footer>
          </div>
        </dialog>
      )}
    </section>
  );
}
