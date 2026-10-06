export type ErrorCode =
  | "unauthenticated"
  | "unauthorized"
  | "not_found"
  | "validation_error"
  | "capability_required"
  | "trial_expired"
  | "conflict"
  | "rate_limited"
  | "internal_error"
  | "method_not_allowed"
  | "network"
  | "timeout"
  | "invalid_response"
  | "storage";
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public status = 0,
    public requestId?: string,
    public retryAfterMs?: number,
  ) {
    super(code);
    this.name = "ApiError";
  }
}
export const isSessionRejection = (e: unknown) =>
  e instanceof ApiError &&
  (e.code === "unauthenticated" || e.code === "unauthorized");
export function retryDelay(value: string | null, now = Date.now()) {
  if (!value) return undefined;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(value) - now;
  return Number.isFinite(delay) ? Math.max(0, delay) : undefined;
}
