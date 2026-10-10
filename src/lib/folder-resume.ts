export async function folderResumeHash(
  file: Blob,
  signal?: AbortSignal,
): Promise<string> {
  const blocks: Uint8Array[] = [];
  for (let offset = 0; offset < file.size; offset += 8 * 1024 * 1024) {
    signal?.throwIfAborted();
    blocks.push(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          await file.slice(offset, offset + 8 * 1024 * 1024).arrayBuffer(),
        ),
      ),
    );
  }
  signal?.throwIfAborted();
  const combined = new Uint8Array(blocks.length * 32);
  blocks.forEach((block, i) => combined.set(block, i * 32));
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", combined));
  return `sha256-blocks-v1:${Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
