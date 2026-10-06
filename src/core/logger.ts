// Only fixed event names and explicitly safe transport metadata are accepted.
export function safeLog(
  event: "request_failed" | "session_cleared" | "storage_failed",
  metadata: { status?: number; requestId?: string } = {},
) {
  if (typeof __DEV__ !== "undefined" && __DEV__)
    console.info(event, {
      status: metadata.status,
      requestId: metadata.requestId?.match(/^[a-f0-9-]{36}$/i)?.[0],
    });
}
