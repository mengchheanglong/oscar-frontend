import { apiRequest } from "./api";

export interface LocalDirectory {
  kind: "directory";
  name: string;
  values(): AsyncIterable<LocalDirectory | LocalFileHandle>;
  queryPermission(options: { mode: "read" }): Promise<PermissionState>;
  requestPermission(options: { mode: "read" }): Promise<PermissionState>;
  isSameEntry(other: LocalDirectory): Promise<boolean>;
}
interface LocalFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
}
export interface FolderSource {
  id: string;
  name: string;
  version: number;
  syncedAt: string | null;
  files: Array<{ path: string; revision: number; hash: string | null }>;
}
export interface ScannedFile {
  path: string;
  text: string;
  bytes: number;
}
export const localFolders = {
  list: (projectId: string) =>
    apiRequest<FolderSource[]>(`/projects/${projectId}/local-folders`),
  sync: (
    projectId: string,
    id: string,
    name: string,
    expectedVersion: number,
    files: ScannedFile[],
  ) =>
    apiRequest<{ id: string; version: number }>(
      `/projects/${projectId}/local-folders/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          name,
          expectedVersion,
          files: files.map(({ path, text }) => ({ path, text })),
        }),
      },
    ),
  disconnect: (projectId: string, id: string) =>
    apiRequest<void>(`/projects/${projectId}/local-folders/${id}`, {
      method: "DELETE",
    }),
};

const extensions = new Set([
  "md",
  "txt",
  "rst",
  "csv",
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "json",
  "yaml",
  "yml",
  "toml",
  "py",
  "sql",
  "html",
  "css",
  "scss",
  "go",
  "rs",
  "java",
  "cs",
  "c",
  "cpp",
  "h",
  "rb",
  "php",
]);
const excludedDirectories = new Set([
  "node_modules",
  "vendor",
  "dist",
  "build",
  "coverage",
  "__pycache__",
  "venv",
  "target",
]);
export function allowedLocalPath(path: string): boolean {
  if (
    !path ||
    path.length > 450 ||
    path.includes("\\") ||
    Array.from(path).some(
      (char) =>
        char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || char === ":",
    )
  )
    return false;
  const parts = path.split("/");
  if (
    parts.some(
      (part) =>
        !part ||
        part.startsWith(".") ||
        excludedDirectories.has(part.toLowerCase()),
    )
  )
    return false;
  const name = parts[parts.length - 1].toLowerCase();
  if (
    /(^|[._-])(secret|secrets|credential|credentials|token|tokens|password|passwords|private)([._-]|$)/.test(
      name,
    )
  )
    return false;
  if (
    [
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      "composer.lock",
    ].includes(name)
  )
    return false;
  return extensions.has(name.split(".").pop() ?? "");
}

export async function scanFolder(
  root: LocalDirectory,
): Promise<{ files: ScannedFile[]; skipped: number }> {
  const files: ScannedFile[] = [];
  let skipped = 0,
    visited = 0,
    total = 0;
  async function walk(
    directory: LocalDirectory,
    prefix: string,
    depth: number,
  ): Promise<void> {
    if (depth > 12)
      throw new Error("Folder is too deep. Select a smaller subfolder.");
    for await (const entry of directory.values()) {
      if (++visited > 10000)
        throw new Error("Folder is too large. Select a smaller subfolder.");
      const path = prefix + entry.name;
      if (entry.kind === "directory") {
        if (
          entry.name.startsWith(".") ||
          excludedDirectories.has(entry.name.toLowerCase())
        ) {
          skipped++;
          continue;
        }
        await walk(entry, path + "/", depth + 1);
      } else {
        if (!allowedLocalPath(path)) {
          skipped++;
          continue;
        }
        const file = await entry.getFile();
        if (file.size > 128 * 1024) {
          skipped++;
          continue;
        }
        const buffer = await file.arrayBuffer();
        let text: string;
        try {
          text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
        } catch {
          skipped++;
          continue;
        }
        if (text.includes("\0")) {
          skipped++;
          continue;
        }
        total += new TextEncoder().encode(text).length;
        if (files.length >= 2000 || total > 16 * 1024 * 1024)
          throw new Error(
            "Folder scan exceeds 2,000 text files or 16 MiB. Select a smaller subfolder.",
          );
        files.push({ path, text, bytes: file.size });
      }
    }
  }
  await walk(root, "", 0);
  return { files: files.sort((a, b) => a.path.localeCompare(b.path)), skipped };
}

// The directory capability stays in this browser, scoped to account/project/source.
export async function folderHandle(
  key: string,
  action: "get" | "put" | "delete",
  handle?: LocalDirectory,
): Promise<LocalDirectory | undefined> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("aiw-local-folders", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("handles");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Browser could not remember folder access."));
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
        "handles",
        action === "get" ? "readonly" : "readwrite",
      );
      const store = tx.objectStore("handles");
      const request =
        action === "get"
          ? store.get(key)
          : action === "put"
            ? store.put(handle, key)
            : store.delete(key);
      tx.oncomplete = () =>
        resolve(action === "get" ? request.result : undefined);
      tx.onabort = tx.onerror = () =>
        reject(new Error("Browser could not remember folder access."));
    });
  } finally {
    db.close();
  }
}

export function directoryPicker():
  ((options: { mode: "read" }) => Promise<LocalDirectory>) | undefined {
  return (
    window as unknown as {
      showDirectoryPicker?: (options: {
        mode: "read";
      }) => Promise<LocalDirectory>;
    }
  ).showDirectoryPicker?.bind(window);
}
