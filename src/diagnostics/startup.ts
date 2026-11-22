// No React Native, Router, runtime, storage or network imports here.
export type Report = {
  code: string;
  phase: string;
  message: string;
  stack: string;
};
type Handler = (error: unknown, fatal?: boolean) => void;
type Globals = typeof globalThis & {
  ErrorUtils?: {
    getGlobalHandler(): Handler;
    setGlobalHandler(handler: Handler): void;
  };
  RN$registerExceptionListener?: (
    listener: (event: {
      isFatal?: boolean;
      message?: string;
      originalMessage?: string;
      stack?: unknown;
      preventDefault?: () => void;
    }) => void,
  ) => void;
};
let report: Report | null = null;
let registered = false;
let handling = false;
let nativeListenerInstalled = false;
let handler: Handler | undefined;
const listeners = new Set<() => void>();

export function redact(input: string): string {
  let value = input;
  // Exact public config values as well as credential-shaped material are never shown.
  for (const secret of [
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.EXPO_PUBLIC_SUPABASE_URL,
  ]) {
    if (secret) value = value.split(secret).join("[redacted]");
  }
  return value
    .replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, "[redacted]")
    .replace(/(?:Bearer|Basic)\s+[^\s,;]+/gi, "[redacted]")
    .replace(/(?:https?|wss?):\/\/[^\s)]+/gi, "[url]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(
      /(?:["']?(?:[a-z_]*(?:token|password|secret|key|authorization))["']?\s*[:=]\s*)(?:["'][^"']*["']|[^\s,;}]+)/gi,
      "[credential redacted]",
    )
    .replace(
      /\b(?:sb_(?:publishable|secret)_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+)\b/g,
      "[redacted]",
    )
    .replace(/[A-Za-z0-9_+\/=-]{32,}/g, "[redacted]")
    .replace(/[\x00-\x08\x0b-\x1f]/g, "");
}
export function makeReport(error: unknown, phase: string): Report {
  // Do not stringify arbitrary objects: these may contain sessions/request bodies.
  let message = "Unknown JavaScript exception";
  let stack = "JS stack unavailable";
  try {
    if (typeof error === "string") message = error;
    else if (error && typeof error === "object") {
      const e = error as { name?: unknown; message?: unknown; stack?: unknown };
      if (typeof e.message === "string")
        message = `${typeof e.name === "string" ? e.name + ": " : ""}${e.message}`;
      if (typeof e.stack === "string") stack = e.stack;
      else if (Array.isArray(e.stack))
        stack = e.stack
          .slice(0, 8)
          .map((frame) => {
            const f = frame as {
              methodName?: string;
              lineNumber?: number;
              column?: number;
            };
            return `${f.methodName ?? "anonymous"}@${f.lineNumber ?? "?"}:${f.column ?? "?"}`;
          })
          .join("\n");
    }
  } catch {
    /* Untrusted error getters must not break diagnostics. */
  }
  return {
    code: "AGRO-IOS-CRASH-004 / 1.0.0 (2)",
    phase,
    message: redact(message).slice(0, 600),
    stack: redact(stack).split("\n").slice(0, 9).join("\n").slice(0, 1600),
  };
}
export function capture(error: unknown, phase: string): boolean {
  if (handling || report) return false;
  handling = true;
  try {
    if (!report) {
      report = makeReport(error, phase);
      console.log(
        `[${report.code}] ${phase}: ${report.message}\n${report.stack}`,
      );
    }
    for (const listener of listeners) listener();
    return true;
  } catch {
    return false;
  } finally {
    handling = false;
  }
}
export const getReport = () => report;
export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const markRegistered = () => {
  registered = true;
};
export function installHandlers() {
  const globals = globalThis as Globals;
  const utils = globals.ErrorUtils;
  if (utils && utils.getGlobalHandler() !== handler) {
    const previous = utils.getGlobalHandler();
    handler = (error, fatal) => {
      if (fatal && registered && capture(error, "global-fatal")) return;
      previous(error, fatal);
    };
    utils.setGlobalHandler(handler);
  }
  // RN 0.86 also has a C++ exception pipeline; feature-detect its listener.
  if (!nativeListenerInstalled && globals.RN$registerExceptionListener) {
    globals.RN$registerExceptionListener((event) => {
      if (event.isFatal && registered && capture(event, "rn-fatal"))
        event.preventDefault?.();
    });
    nativeListenerInstalled = true;
  }
}
