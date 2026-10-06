import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { QueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { ApiClient, AuthTransport } from "../src/core/client";
import { ApiError, retryDelay } from "../src/core/errors";
import { secureAdapter } from "../src/core/storage";
import { SessionCoordinator } from "../src/core/session";
import { safeLog } from "../src/core/logger";
import { guestTodaySchema, meSchema } from "../src/api/contracts";
const id = "11111111-1111-4111-8111-111111111111";
const envelope = (data: unknown) => ({
  schemaVersion: "1",
  data,
  serverNow: "2026-10-06T12:00:00.000Z",
  timezone: "Europe/Belgrade",
  requestId: id,
});
const response = (
  data: unknown,
  status = 200,
  headers?: Record<string, string>,
) =>
  new Response(
    JSON.stringify(
      status === 200
        ? envelope(data)
        : {
            error: {
              code: data,
              message: "INTERNAL SECRET MUST NOT DISPLAY",
              requestId: id,
            },
          },
    ),
    { status, headers },
  );
const auth = (): AuthTransport => ({
  token: () => "test-access-secret",
  refresh: vi.fn(async () => "new-access-secret"),
  clear: vi.fn(async () => {}),
  generation: () => 0,
});
const fakeSession = (user = id, token = "secret"): Session =>
  ({
    access_token: token,
    refresh_token: "refresh-secret",
    expires_in: 3600,
    token_type: "bearer",
    user: { id: user },
  }) as Session;
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("HTTP boundary", () => {
  it("guest public Today validates without bearer", async () => {
    const a = auth(),
      fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
        response({
          audience: "guest",
          capabilities: { browsePublicContent: true, useFreeCalculator: true },
          sections: Object.fromEntries(
            ["information", "programmes", "cenoteka", "financing"].map((k) => [
              k,
              { status: "ok", items: [] },
            ]),
          ),
          market: {
            exchange: { status: "ok", items: [] },
            stips: { status: "ok", items: [] },
          },
        }),
      );
    const result = await new ApiClient(
      "https://agrobim.digital/api/v1",
      a,
      fetcher,
    ).request("/today", guestTodaySchema);
    expect(result.data.audience).toBe("guest");
    expect(fetcher.mock.calls[0]?.[1]?.headers).not.toHaveProperty(
      "Authorization",
    );
  });
  it("blocks private requests without auth", async () => {
    const a = auth();
    a.token = () => null;
    const f = vi.fn();
    await expect(
      new ApiClient("https://host", a, f).request("/me", z.object({}), {
        private: true,
      }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
    expect(f).not.toHaveBeenCalled();
  });
  it("attaches bearer to private only and forbids redirects", async () => {
    const f = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      response({}),
    );
    await new ApiClient("https://host", auth(), f).request(
      "/me",
      z.object({}),
      { private: true },
    );
    expect(f.mock.calls[0]?.[1]).toMatchObject({
      redirect: "error",
      headers: { Authorization: "Bearer test-access-secret" },
    });
  });
  it("401 refreshes once and retries once", async () => {
    const a = auth(),
      f = vi
        .fn()
        .mockResolvedValueOnce(response("unauthenticated", 401))
        .mockResolvedValueOnce(response({}));
    await new ApiClient("https://host", a, f).request("/me", z.object({}), {
      private: true,
    });
    expect(a.refresh).toHaveBeenCalledTimes(1);
    expect(f).toHaveBeenCalledTimes(2);
    expect(a.clear).not.toHaveBeenCalled();
  });
  it("repeated 401 clears private state and signs out", async () => {
    const a = auth(),
      f = vi.fn(async () => response("unauthenticated", 401));
    await expect(
      new ApiClient("https://host", a, f).request("/me", z.object({}), {
        private: true,
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect(a.refresh).toHaveBeenCalledTimes(1);
    expect(a.clear).toHaveBeenCalledTimes(1);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("revoked account 403 clears without refreshing", async () => {
    const a = auth();
    await expect(
      new ApiClient(
        "https://host",
        a,
        vi.fn(async () => response("unauthorized", 403)),
      ).request("/me", z.object({}), { private: true }),
    ).rejects.toMatchObject({ code: "unauthorized" });
    expect(a.clear).toHaveBeenCalledOnce();
    expect(a.refresh).not.toHaveBeenCalled();
  });
  it("capability denial is a normal gated state with safe message", async () => {
    const a = auth();
    try {
      await new ApiClient(
        "https://host",
        a,
        vi.fn(async () => response("capability_required", 403)),
      ).request("/me/financing-analysis", z.object({}), { private: true });
    } catch (e) {
      expect(e).toMatchObject({ code: "capability_required", requestId: id });
      expect((e as Error).message).not.toContain("INTERNAL");
    }
    expect(a.clear).not.toHaveBeenCalled();
  });
  it("does not replay a profile PATCH on rate limiting", async () => {
    const f = vi.fn(async () =>
      response("rate_limited", 429, { "Retry-After": "60" }),
    );
    await expect(
      new ApiClient("https://host", auth(), f).request(
        "/me/farm-profile",
        z.object({}),
        { private: true, method: "PATCH", body: { version: "1" } },
      ),
    ).rejects.toMatchObject({ retryAfterMs: 60000 });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("supports bounded GET Retry-After", async () => {
    vi.useFakeTimers();
    const f = vi
      .fn()
      .mockResolvedValueOnce(
        response("rate_limited", 429, { "Retry-After": "1" }),
      )
      .mockResolvedValueOnce(response({}));
    const p = new ApiClient("https://host", auth(), f).request(
      "/today",
      z.object({}),
    );
    await vi.advanceTimersByTimeAsync(1000);
    await p;
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("accepts date Retry-After without ignoring server delay", () => {
    expect(
      retryDelay(
        "Tue, 06 Oct 2026 12:00:01 GMT",
        Date.parse("2026-10-06T12:00:00Z"),
      ),
    ).toBe(1000);
    expect(retryDelay("invalid")).toBeUndefined();
  });
  it("rejects invalid successful DTOs", async () => {
    await expect(
      new ApiClient(
        "https://host",
        auth(),
        vi.fn(async () => response({ x: "wrong" })),
      ).request("/today", z.object({ x: z.number() })),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("offline request returns stable network error", async () => {
    await expect(
      new ApiClient(
        "https://host",
        auth(),
        vi.fn(async () => {
          throw new TypeError("network secret details");
        }),
      ).request("/today", z.object({})),
    ).rejects.toMatchObject({ code: "network", message: "network" });
  });
  it("aborts a stalled transport at timeout", async () => {
    vi.useFakeTimers();
    const f = vi.fn(
      (_url, init) =>
        new Promise<Response>((_r, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("abort")),
          ),
        ),
    );
    const p = new ApiClient("https://host", auth(), f, 100).request(
      "/today",
      z.object({}),
    );
    const assertion = expect(p).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });
  it("cancels an in-flight request", async () => {
    const c = new AbortController();
    const f = vi.fn(
      (_url, init) =>
        new Promise<Response>((_r, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("cancelled")),
          ),
        ),
    );
    const p = new ApiClient("https://host", auth(), f).request(
      "/today",
      z.object({}),
      { signal: c.signal },
    );
    c.abort();
    await expect(p).rejects.toThrow("cancelled");
  });
  it("rejects late private response after account switch", async () => {
    let generation = 0;
    const a = auth();
    a.generation = () => generation;
    const f = vi.fn(async () => {
      generation++;
      return response({});
    });
    await expect(
      new ApiClient("https://host", a, f).request("/me", z.object({}), {
        private: true,
      }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });
});
describe("secure session lifecycle", () => {
  it("stores and restores only through SecureStore adapter", async () => {
    const map = new Map<string, string>();
    const backend = {
      getItemAsync: vi.fn(async (k: string) => map.get(k) ?? null),
      setItemAsync: vi.fn(async (k: string, v: string) => {
        map.set(k, v);
      }),
      deleteItemAsync: vi.fn(async (k: string) => {
        map.delete(k);
      }),
    };
    const storage = secureAdapter(backend, vi.fn());
    await storage.setItem("sb-session", JSON.stringify(fakeSession()));
    expect(JSON.parse((await storage.getItem("sb-session"))!)).toMatchObject({
      access_token: "secret",
    });
    await storage.removeItem("sb-session");
    expect(await storage.getItem("sb-session")).toBeNull();
    expect(backend.setItemAsync).toHaveBeenCalledOnce();
  });
  it("reports secure storage failures without their original details", async () => {
    const failure = vi.fn(),
      backend = {
        getItemAsync: async () => {
          throw new Error("secret");
        },
        setItemAsync: async () => {},
        deleteItemAsync: async () => {},
      };
    await expect(
      secureAdapter(backend, failure).getItem("x"),
    ).rejects.toMatchObject({ code: "storage", message: "storage" });
    expect(failure).toHaveBeenCalledOnce();
  });
  it("shares one active refresh operation", async () => {
    const q = new QueryClient();
    let done!: (s: Session) => void;
    const refresh = vi.fn(
      () =>
        new Promise<Session>((r) => {
          done = r;
        }),
    );
    const c = new SessionCoordinator(q, refresh, vi.fn(), async () => {});
    c.set(fakeSession());
    const one = c.refresh(),
      two = c.refresh();
    done(fakeSession(id, "new"));
    expect(await one).toBe("new");
    expect(await two).toBe("new");
    expect(refresh).toHaveBeenCalledOnce();
  });
  it("logout clears private queries and preserves public queries", async () => {
    const q = new QueryClient(),
      clear = vi.fn();
    const c = new SessionCoordinator(
      q,
      async () => null,
      clear,
      async () => {},
    );
    c.set(fakeSession());
    q.setQueryData(["private", id, "me"], { private: true });
    q.setQueryData(["public", "today"], { public: true });
    await c.clear();
    expect(c.token()).toBeNull();
    expect(q.getQueryData(["private", id, "me"])).toBeUndefined();
    expect(q.getQueryData(["public", "today"])).toEqual({ public: true });
    expect(clear).toHaveBeenCalledOnce();
  });
  it("account switch clears private state", () => {
    const q = new QueryClient();
    const c = new SessionCoordinator(
      q,
      async () => null,
      vi.fn(),
      async () => {},
    );
    c.set(fakeSession());
    q.setQueryData(["private", id, "feed"], {});
    c.set(fakeSession("22222222-2222-4222-8222-222222222222"));
    expect(q.getQueryData(["private", id, "feed"])).toBeUndefined();
  });
  it("late refresh does not resurrect logout", async () => {
    let done!: (s: Session) => void;
    const c = new SessionCoordinator(
      new QueryClient(),
      () =>
        new Promise((r) => {
          done = r;
        }),
      vi.fn(),
      async () => {},
    );
    c.set(fakeSession());
    const p = c.refresh();
    await c.clear();
    done(fakeSession());
    expect(await p).toBeNull();
    expect(c.token()).toBeNull();
  });
  it("logout remains signed out when remote/storage cleanup fails", async () => {
    const c = new SessionCoordinator(
      new QueryClient(),
      async () => null,
      vi.fn(),
      async () => {
        throw Error();
      },
    );
    c.set(fakeSession());
    await expect(c.clear()).rejects.toMatchObject({ code: "storage" });
    expect(c.token()).toBeNull();
  });
});
describe("contracts and logging", () => {
  it("/me capabilities are backend-authoritative, including registered-free eligibility", () => {
    const capabilities = Object.fromEntries(
      [
        "editBasicFarmProfile",
        "usePersonalizedFeed",
        "useFreeCalculator",
        "runBasicEligibility",
        "runEligibilityCheck",
      ].map((k) => [k, true]),
    );
    Object.assign(capabilities, {
      runAdvancedEligibility: false,
      createFinancingScenario: false,
      runFinancingAnalysis: false,
      editAdvancedFinancingData: false,
    });
    const me = meSchema.parse({
      user: { id, emailVerified: true, displayName: null },
      farm: {
        hasProfile: false,
        profileId: null,
        displayName: null,
        completionState: "missing",
      },
      access: {
        financingState: "trial_not_started",
        financingTrialEndsAt: null,
        capabilityPolicies: { runBasicEligibility: "registered_free" },
        capabilities,
      },
    });
    expect(me.access.capabilities.runBasicEligibility).toBe(true);
    expect(me.access.capabilities.runFinancingAnalysis).toBe(false);
  });
  it("logger drops arbitrary token/password/payload fields", () => {
    vi.stubGlobal("__DEV__", true);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    safeLog("request_failed", {
      status: 401,
      requestId: id,
      access_token: "secret",
      password: "secret",
      payload: "private farm",
    } as never);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(
      /secret|private farm|access_token|password/,
    );
  });
  it("production logger is silent", () => {
    vi.stubGlobal("__DEV__", false);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    safeLog("storage_failed");
    expect(log).not.toHaveBeenCalled();
  });
});

it("default fetch is invoked without the ApiClient receiver (browser regression)", async () => {
  vi.stubGlobal("fetch", function (this: unknown) {
    expect(this).not.toBeInstanceOf(ApiClient);
    return Promise.resolve(response({}));
  });
  await new ApiClient("https://host", auth()).request("/today", z.object({}));
});

it("account switch during refresh does not sign out the new account", async () => {
  let generation = 0;
  const a = auth();
  a.generation = () => generation;
  a.refresh = vi.fn(async () => {
    generation++;
    return null;
  });
  const f = vi.fn(async () => response("unauthenticated", 401));
  await expect(
    new ApiClient("https://host", a, f).request("/me", z.object({}), {
      private: true,
    }),
  ).rejects.toMatchObject({ code: "unauthenticated" });
  expect(a.clear).not.toHaveBeenCalled();
});
