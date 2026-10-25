// Reconciliation must also handle a response that was saved before a network failure.
export function mergeChatTurn<T extends { id: string }>(
  messages: T[],
  optimisticId: string,
  user: T,
  assistant: T,
): T[] {
  return [
    ...messages.filter(
      (message) => ![optimisticId, user.id, assistant.id].includes(message.id),
    ),
    user,
    assistant,
  ];
}
interface RetryMessage {
  role: string;
  status: string;
  content: string;
  mode: string;
  contextExcluded?: boolean;
  clientRequestId?: string | null;
}

// A reloaded conversation may contain a saved user message without an answer.
export function retryRequestKey(
  messages: RetryMessage[],
  content: string,
  mode: string,
) {
  const last = messages[messages.length - 1];
  const user = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  return (last?.status === "FAILED" || last?.role === "user") &&
    user?.content === content &&
    user.mode === mode &&
    !user.contextExcluded
    ? user.clientRequestId
    : undefined;
}

// Options (including course knowledge) are part of the request signature. A new
// signature must not borrow a failed saved turn's request ID in the same session.
export function chatRequestKey(
  previous: { signature: string; key: string } | null,
  signature: string,
  messages: RetryMessage[],
  content: string,
  mode: string,
  createKey: () => string = () => crypto.randomUUID(),
) {
  if (previous)
    return previous.signature === signature ? previous.key : createKey();
  return retryRequestKey(messages, content, mode) || createKey();
}
