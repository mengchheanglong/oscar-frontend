import { apiRequest, apiRequestRaw } from "./api";
export interface ChatAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  promotedDocumentId: string | null;
  processingStatus: string;
}
export const attachmentPath = (projectId: string, conversationId: string) =>
  `/projects/${projectId}/ai/conversations/${conversationId}/attachments`;
export const chatAttachments = {
  list: (p: string, c: string) =>
    apiRequest<ChatAttachment[]>(attachmentPath(p, c)),
  upload: (p: string, c: string, body: FormData) =>
    apiRequest<ChatAttachment>(attachmentPath(p, c), { method: "POST", body }),
  remove: (p: string, c: string, id: string) =>
    apiRequest(attachmentPath(p, c) + `/${id}`, { method: "DELETE" }),
  promote: (p: string, c: string, id: string) =>
    apiRequest(attachmentPath(p, c) + `/${id}/project-knowledge`, {
      method: "POST",
    }),
  draft: (p: string, c: string, id: string) =>
    apiRequest<{ content: string; partial: boolean }>(
      attachmentPath(p, c) + `/${id}/memory-draft`,
      { method: "POST" },
    ),
  download: async (p: string, c: string, a: ChatAttachment) => {
    const response = await apiRequestRaw(
      attachmentPath(p, c) + `/${a.id}/download`,
    );
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = a.filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
export const attachmentsChanged = () =>
  window.dispatchEvent(new Event("oscar:attachments-changed"));
