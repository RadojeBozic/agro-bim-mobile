import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "../src/core/errors";
const mock = vi.hoisted(() => ({
  session: null as any,
  generation: 0,
  request: vi.fn(),
  refresh: vi.fn(),
  getSession: vi.fn(),
  authEvent: null as any,
  storageFailure: null as any,
  sessionCleared: null as any,
  appChange: null as any,
  context: null as any,
  unsubscribe: vi.fn(),
}));
vi.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: (_name: string, fn: any) => {
      mock.appChange = fn;
      return { remove: vi.fn() };
    },
  },
}));
vi.mock("../src/runtime", () => ({
  api: { request: mock.request },
  supabase: {
    auth: {
      getSession: mock.getSession,
      onAuthStateChange: (fn: any) => {
        mock.authEvent = fn;
        return { data: { subscription: { unsubscribe: mock.unsubscribe } } };
      },
    },
  },
  onStorageFailure: (fn: any) => {
    mock.storageFailure = fn;
    return () => {};
  },
  onSessionCleared: (fn: any) => {
    mock.sessionCleared = fn;
    return () => {};
  },
  session: {
    token: () => mock.session?.access_token ?? null,
    generation: () => mock.generation,
    set: (s: any) => {
      if (mock.session?.user.id !== s?.user.id) mock.generation++;
      mock.session = s;
    },
    get session() {
      return mock.session;
    },
    refresh: mock.refresh,
    clear: async (expired = true) => {
      mock.session = null;
      mock.generation++;
      mock.sessionCleared(expired);
    },
  },
}));
import { AuthProvider, useAuth } from "../src/auth/provider";
const session = {
  access_token: "test-only-secret",
  expires_at: 9999999999,
  user: { id: "11111111-1111-4111-8111-111111111111" },
};
const me = {
  user: { id: session.user.id, emailVerified: true, displayName: "Test" },
  farm: {
    hasProfile: false,
    profileId: null,
    displayName: null,
    completionState: "missing",
  },
  access: {
    capabilities: { runBasicEligibility: true, runFinancingAnalysis: false },
  },
};
let root: ReactTestRenderer;
function Probe() {
  mock.context = useAuth();
  return <span>{mock.context.status}</span>;
}
async function mount() {
  await act(async () => {
    root = create(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  mock.session = null;
  mock.generation = 0;
  mock.request.mockReset().mockResolvedValue({ data: me });
  mock.refresh.mockReset().mockResolvedValue("refreshed");
  mock.getSession
    .mockReset()
    .mockResolvedValue({ data: { session: null }, error: null });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("launches as guest without calling private /me", async () => {
  await mount();
  expect(mock.context.status).toBe("guest");
  expect(mock.request).not.toHaveBeenCalled();
});
it("restores session and validates /me before signed-in UI", async () => {
  mock.getSession.mockResolvedValue({ data: { session }, error: null });
  await mount();
  expect(mock.request).toHaveBeenCalledWith("/me", expect.anything(), {
    private: true,
  });
  expect(mock.context.status).toBe("signedIn");
  expect(mock.context.me.user.displayName).toBe("Test");
});
it("deduplicates simultaneous /me validation", async () => {
  let complete!: (v: any) => void;
  mock.getSession.mockResolvedValue({ data: { session }, error: null });
  mock.request.mockImplementation(
    () =>
      new Promise((r) => {
        complete = r;
      }),
  );
  await mount();
  expect(mock.context.status).toBe("checking");
  const one = mock.context.validate(),
    two = mock.context.validate();
  expect(one).toBe(two);
  expect(mock.request).toHaveBeenCalledOnce();
  await act(async () => {
    complete({ data: me });
    await one;
  });
  expect(mock.context.status).toBe("signedIn");
});
it("transient validation failure keeps public mode and retryable local session", async () => {
  mock.getSession.mockResolvedValue({ data: { session }, error: null });
  mock.request.mockRejectedValue(new ApiError("network"));
  await mount();
  expect(mock.context.status).toBe("guest");
  expect(mock.context.message).toBe("internal_error");
  expect(mock.session).toBe(session);
});
it("storage failure removes active private UI", async () => {
  mock.getSession.mockResolvedValue({ data: { session }, error: null });
  await mount();
  await act(async () => mock.storageFailure());
  expect(mock.context.status).toBe("guest");
  expect(mock.context.me).toBeNull();
  expect(mock.context.message).toBe("storage");
  expect(mock.session).toBeNull();
});
it("intentional logout clears account without an expiry message", async () => {
  mock.getSession.mockResolvedValue({ data: { session }, error: null });
  await mount();
  await act(async () => mock.context.logout());
  expect(mock.context.status).toBe("guest");
  expect(mock.context.me).toBeNull();
  expect(mock.context.message).toBeNull();
});
it("stops refresh timer in background and refreshes on foreground", async () => {
  mock.getSession.mockResolvedValue({ data: { session }, error: null });
  await mount();
  expect(vi.getTimerCount()).toBe(1);
  await act(async () => mock.appChange("background"));
  expect(vi.getTimerCount()).toBe(0);
  await act(async () => mock.appChange("active"));
  expect(mock.refresh).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(1);
});
it("ignores token refresh events after logout", async () => {
  await mount();
  await act(async () => {
    mock.authEvent("TOKEN_REFRESHED", session);
  });
  expect(mock.session).toBeNull();
  expect(mock.context.status).toBe("guest");
});

it("queued token refresh cannot resurrect a just-cleared session", async () => {
  mock.getSession.mockResolvedValue({ data: { session }, error: null });
  await mount();
  await act(async () => {
    mock.authEvent("TOKEN_REFRESHED", session);
    mock.session = null;
    mock.generation++;
  });
  expect(mock.session).toBeNull();
});
