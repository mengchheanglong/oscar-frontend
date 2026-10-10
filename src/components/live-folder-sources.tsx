"use client";
import { useEffect, useRef, useState } from "react";
import { FolderOpen, FolderPlus, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
interface Folder {
  id: string;
  name: string;
  path: string;
}
export function LiveFolderSources({ projectId }: { projectId?: string }) {
  const [folders, setFolders] = useState<Folder[]>([]),
    [available, setAvailable] = useState(false),
    [nativePicker, setNativePicker] = useState(false),
    [adding, setAdding] = useState(false),
    [path, setPath] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    alive = useRef(true),
    pickerRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    if (projectId)
      apiRequest<{
        available: boolean;
        nativePickerAvailable: boolean;
        folders: Folder[];
      }>(`/projects/${projectId}/local-folders/live`)
        .then((r) => {
          if (alive.current) {
            setAvailable(r.available);
            setNativePicker(r.nativePickerAvailable);
            setFolders(r.folders);
          }
        })
        .catch(() => {
          if (alive.current) setError("Could not load local connections.");
        });
    return () => {
      alive.current = false;
      pickerRequest.current?.abort();
    };
  }, [projectId]);
  useEffect(() => {
    const element = dialog.current;
    if (adding) element?.showModal();
    return () => element?.close();
  }, [adding]);
  async function chooseFolder() {
    if (!projectId || busy) return;
    if (!nativePicker) {
      setAdding(true);
      return;
    }
    setBusy(true);
    setError("");
    const controller = new AbortController();
    pickerRequest.current = controller;
    try {
      const { folder } = await apiRequest<{ folder: Folder | null }>(
        `/projects/${projectId}/local-folders/live/pick`,
        { method: "POST", signal: controller.signal },
      );
      if (alive.current && folder)
        setFolders((old) => [...old.filter((f) => f.id !== folder.id), folder]);
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (pickerRequest.current === controller) pickerRequest.current = null;
      if (alive.current) setBusy(false);
    }
  }
  async function connect(event: React.FormEvent) {
    event.preventDefault();
    if (!projectId || busy) return;
    setBusy(true);
    setError("");
    try {
      const folder = await apiRequest<Folder>(
        `/projects/${projectId}/local-folders/live`,
        { method: "POST", body: JSON.stringify({ path: path.trim() }) },
      );
      if (alive.current) {
        setFolders((old) => [...old.filter((f) => f.id !== folder.id), folder]);
        setAdding(false);
        setPath("");
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function disconnect(id: string) {
    if (!projectId || busy) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/projects/${projectId}/local-folders/live/${id}`, {
        method: "DELETE",
      });
      if (alive.current) setFolders((old) => old.filter((f) => f.id !== id));
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section
      aria-label="Live source folders"
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FolderOpen className="h-4 w-4 text-slate-500" /> Source folders{" "}
            <Info
              className="h-3.5 w-3.5 text-slate-400"
              aria-label="Hermes reads connected files on demand. Relevant excerpts may be sent to the AI provider."
            />
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Read-only with Hermes · relevant content may reach your AI provider
          </p>
        </div>
        <Button
          variant="outline"
          disabled={!projectId || !available || busy}
          onClick={() => {
            setError("");
            void chooseFolder();
          }}
          className="gap-2"
        >
          <FolderPlus className="h-4 w-4" />
          {busy && pickerRequest.current ? "Choosing folder…" : "Add folder"}
        </Button>
      </div>
      {!adding && error && (
        <div className="mt-3 flex items-center gap-3 text-xs">
          <p role="alert" className="text-red-700">
            {error}
          </p>
          {available && (
            <button
              className="shrink-0 underline"
              onClick={() => setAdding(true)}
            >
              Enter path
            </button>
          )}
        </div>
      )}
      {!available && projectId && (
        <p className="mt-3 text-xs text-slate-500">
          Local file access must be enabled on the local backend. Saved
          snapshots remain available below.
        </p>
      )}
      {available && !folders.length && (
        <p className="mt-4 text-xs text-slate-500">
          Connect a folder once. Hermes searches and reads relevant files
          without indexing the whole folder.
        </p>
      )}
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        {folders.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3"
          >
            <FolderOpen className="h-4 w-4 shrink-0 text-slate-500" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium">{f.name}</h3>
              <p
                title={f.path}
                className="mt-1 truncate text-xs text-slate-500"
              >
                {f.path}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Disconnect ${f.name}`}
              disabled={busy}
              onClick={() => void disconnect(f.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      {adding && (
        <dialog
          ref={dialog}
          aria-labelledby="live-folder-title"
          onCancel={(e) => {
            e.preventDefault();
            if (!busy) setAdding(false);
          }}
          className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl backdrop:bg-slate-950/50"
        >
          <form onSubmit={connect}>
            <div className="flex items-center justify-between">
              <h3 id="live-folder-title" className="text-base font-semibold">
                Connect folder
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close connect folder"
                disabled={busy}
                onClick={() => setAdding(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <label className="mt-4 block text-xs text-slate-500">
              Folder path on this computer
              <input
                autoFocus
                required
                maxLength={1000}
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="C:\\Users\\User\\projects\\my-project"
                className="mt-2 w-full rounded-lg border border-slate-200 p-3 font-mono text-xs text-slate-900"
              />
            </label>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Grant read-only access inside this folder. Relevant file contents
              may be sent to the AI provider when Hermes works. Files stay on
              this computer.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-xs text-red-700">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
              <Button disabled={busy || !path.trim()}>
                {busy ? "Connecting…" : "Connect"}
              </Button>
            </div>
          </form>
        </dialog>
      )}
    </section>
  );
}
