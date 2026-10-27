export function characterCount(text: string): number {
  return Array.from(text).length;
}

interface CitationPreview {
  chunkId: string;
  sourceId: string;
  documentId?: string;
  revision: number;
  snippet?: string;
  fullTextLength?: number;
  isTruncated?: boolean;
}

interface IndexedPassage {
  chunkId: string;
  documentId: string;
  revision: number;
  text: string;
  charCount: number;
}

// Historical previews may only be compared with the same source and revision.
// This never reconstructs a historical model-used excerpt from a current source.
export function citationPreviewState(
  citation: CitationPreview,
  passage?: IndexedPassage | null,
) {
  const matches = Boolean(
    passage &&
    passage.chunkId === citation.chunkId &&
    passage.documentId === (citation.documentId ?? citation.sourceId) &&
    passage.revision === citation.revision &&
    characterCount(passage.text) === passage.charCount,
  );
  const previewLength = characterCount(citation.snippet ?? "");
  const fullLength =
    citation.fullTextLength ?? (matches ? passage!.charCount : undefined);
  const prefixVerified =
    matches &&
    citation.snippet !== undefined &&
    passage!.text.startsWith(citation.snippet);
  return {
    previewLength,
    fullLength,
    isTruncated:
      citation.isTruncated === true ||
      Boolean(
        fullLength !== undefined &&
        fullLength > previewLength &&
        (citation.fullTextLength !== undefined || prefixVerified),
      ),
    passageMatches: matches,
  };
}
