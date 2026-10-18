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
