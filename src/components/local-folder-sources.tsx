"use client";

import { useEffect, useRef, useState } from "react";

import { FolderOpen } from "lucide-react";

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

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
            <FolderOpen className="h-5 w-5 text-blue-600" />
            Local folder sources
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Private to your account in the selected project. Files stay on your
            computer.
          </p>
        </div>

        <Button
          variant="outline"
          disabled={!supported || !projectId || !loaded || busy || !!preview}
          onClick={() => choose()}
        >
          Connect local folder
        </Button>
      </div>

      <p className="text-sm text-slate-600">
        Review files before indexing. Selected text is sent to this workspace’s
        backend and may be sent to the AI provider when used by Copilot or
        Hermes. Access is read-only.
      </p>

      {!projectId && (
        <p className="text-sm text-slate-500">
          Select a project to connect a folder.
        </p>
      )}

      {!supported && (
        <p className="text-sm text-slate-500">
          Folder access requires a supporting browser such as Chrome or Edge,
          over HTTPS or localhost. You can still upload documents below.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="text-sm text-slate-600">
          {notice}
        </p>
      )}

      {busy && (
        <p role="status" className="text-sm text-blue-700">
          Working…
        </p>
      )}

      {preview && (
        <div className="space-y-3 rounded-xl border border-blue-200 p-4">
          <h3 className="font-semibold">Review {preview.directory.name}</h3>

          <p className="text-sm text-slate-600">
            {preview.files.length} eligible text files; {preview.skipped}{" "}
            excluded files or folders. Hidden files, common credential
            filenames, dependencies, binaries, and files over 128 KiB are
            excluded. Review for sensitive content before sending.
          </p>

          <p className="text-sm text-slate-600">
            Select up to 100 files and 512 KiB per source. Indexing replaces this source’s previous snapshot. Unselected or
            removed files stop being available to the copilot. New files require
            selection.
          </p>

          <div className="max-h-64 space-y-2 overflow-auto">
            {preview.files.map((file) => (
              <div key={file.path}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(file.path)}
                    disabled={busy}
                    onChange={(event) =>
                      setSelected((old) => {
                        const next = new Set(old);
                        if (event.target.checked) next.add(file.path);
                        else next.delete(file.path);
                        return next;
                      })
                    }
                  />
                  <span className="break-all">{file.path}</span>
                  <span className="ml-auto shrink-0 text-xs text-slate-500">
                    {file.bytes} B
                  </span>
                </label>
                <details className="ml-6">
                  <summary className="cursor-pointer text-xs text-blue-700">
                    Preview text
                  </summary>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all bg-slate-50 p-2 text-xs">
                    {file.text}
                  </pre>
                </details>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            {selected.size} selected · {selectedBytes} bytes
            {selectionTooLarge
              ? " — reduce selection to 100 files and 512 KiB."
              : ""}
          </p>

          <div className="flex gap-2">
            <Button
              disabled={
                busy ||
                selectionTooLarge ||
                (preview.version === 0 && !selected.size)
              }
              onClick={indexPreview}
            >
              Index {selected.size} selected files
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setPreview(undefined)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {folders.map((folder) => (
        <div
          key={folder.id}
          className="space-y-2 rounded-xl border border-slate-200 p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">{folder.name}</h3>
              <p className="text-xs text-slate-500">
                {folder.files.length} indexed files · Snapshot {folder.version}{" "}
                · Last scanned{" "}
                {folder.syncedAt
                  ? new Date(folder.syncedAt).toLocaleString()
                  : "Never"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!supported || busy || !!preview}
                onClick={() => choose(folder)}
              >
                Rescan folder
              </Button>
              <Button
                variant="outline"
                disabled={busy || !!preview}
                onClick={() => setRemoving(folder.id)}
              >
                Disconnect
              </Button>
            </div>
          </div>

          <details>
            <summary className="cursor-pointer text-sm text-blue-700">
              Indexed paths and revisions
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {folder.files.map((file) => (
                <li key={file.path}>
                  {file.path} · revision {file.revision}
                </li>
              ))}
            </ul>
          </details>

          {removing === folder.id && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                Remove this source and its indexed text? Your local files stay
                unchanged. Existing chat answers and saved reports remain in
                history.
              </p>
              <Button disabled={busy} onClick={() => disconnect(folder.id)}>
                Confirm disconnect
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setRemoving(undefined)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      ))}

      {!folders.length && loaded && !preview && (
        <p className="text-sm text-slate-500">No local folders connected.</p>
      )}

      <p className="text-xs text-slate-500">
        Rescan to review changes. Scanning runs only while this page is open;
        the last indexed snapshot remains available afterward.
      </p>
    </section>
  );
}
