import { z } from "zod";
import { errorSchema, successSchema } from "../api/contracts";
import { ApiError, isSessionRejection, retryDelay } from "./errors";
export interface AuthTransport {
  token(): string | null;
  refresh(): Promise<string | null>;
  clear(): Promise<void>;
  generation(): number;
}
export class ApiClient {
  constructor(
    private base: string,
    private auth: AuthTransport,
    private fetcher: typeof fetch = fetch,
    private timeoutMs = 15000,
  ) {}
  async request<T extends z.ZodTypeAny>(
    route: string,
    schema: T,
    options: {
      private?: boolean;
      method?: "GET" | "PATCH" | "PUT" | "POST";
      body?: unknown;
      signal?: AbortSignal;
    } = {},
  ): Promise<{ data: z.output<T>; requestId: string; status: number }> {
    if (!route.startsWith("/") || route.includes("://") || route.includes(".."))
      throw new ApiError("validation_error");
    const generation = this.auth.generation();
    const method = options.method ?? "GET";
    let refreshed = false;
    let retries = 0;
    while (true) {
      const token = options.private ? this.auth.token() : null;
      if (options.private && !token) throw new ApiError("unauthenticated", 401);
      const controller = new AbortController();
      const abort = () => controller.abort(options.signal?.reason);
      if (options.signal?.aborted) abort();
      options.signal?.addEventListener("abort", abort, { once: true });
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      let response: Response;
      try {
        const fetcher = this.fetcher;
        response = await fetcher(this.base + route, {
          method,
          redirect: "error",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {}),
            ...(options.body !== undefined
              ? { "Content-Type": "application/json" }
              : {}),
          },
          ...(options.body !== undefined
            ? { body: JSON.stringify(options.body) }
            : {}),
        });
        if (options.private && generation !== this.auth.generation())
          throw new ApiError("unauthenticated", 401);
        const raw: unknown = await response.json().catch((e) => {
          if (controller.signal.aborted) throw e;
          return null;
        });
        if (options.private && generation !== this.auth.generation())
          throw new ApiError("unauthenticated", 401);
        if (response.ok) {
          const parsed = successSchema(schema).safeParse(raw);
          if (!parsed.success)
            throw new ApiError("invalid_response", response.status);
          return {
            data: parsed.data.data,
            requestId: parsed.data.requestId,
            status: response.status,
          };
        }
        const parsed = errorSchema.safeParse(raw);
        const error = new ApiError(
          parsed.success ? parsed.data.error.code : "internal_error",
          response.status,
          parsed.success ? parsed.data.error.requestId : undefined,
          retryDelay(response.headers.get("Retry-After")),
        );
        if (options.private && response.status === 401 && !refreshed) {
          refreshed = true;
          const latest = this.auth.token();
          const refreshedToken =
            latest && latest !== token ? latest : await this.auth.refresh();
          if (generation !== this.auth.generation())
            throw new ApiError("unauthenticated", 401);
          if (refreshedToken) continue;
          await this.auth.clear();
          throw error;
        }
        if (
          options.private &&
          (response.status === 401 || isSessionRejection(error))
        ) {
          await this.auth.clear();
          throw error;
        }
        // Retry GET only. Never replay profile PATCH or saved checks automatically.
        if (
          method === "GET" &&
          retries < 1 &&
          [429, 502, 503, 504].includes(response.status) &&
          (error.retryAfterMs ?? 1000) <= 30000
        ) {
          retries++;
          await this.wait(error.retryAfterMs ?? 1000, options.signal);
          continue;
        }
        throw error;
      } catch (e) {
        if (e instanceof ApiError) throw e;
        if (options.signal?.aborted) throw e;
        if (controller.signal.aborted) throw new ApiError("timeout");
        throw new ApiError("network");
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", abort);
      }
    }
  }
  private wait(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted)
        return reject(new DOMException("Aborted", "AbortError"));
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve();
      }, ms);
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      signal?.addEventListener("abort", abort, { once: true });
    });
  }
}
