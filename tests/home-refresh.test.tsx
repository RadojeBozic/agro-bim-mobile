import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import {
  QueryClient,
  QueryClientProvider,
  notifyManager,
} from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  request: vi.fn(),
  focus: null as any,
  result: null as any,
}));
vi.mock("../src/runtime", () => ({ api: { request: mock.request } }));
vi.mock("expo-router", async () => {
  const { useEffect } = await import("react");
  return {
    useFocusEffect: (callback: any) =>
      useEffect(() => {
        mock.focus = callback;
        return callback();
      }, [callback]),
  };
});
import { useHomeQuery } from "../src/screens/use-home-query";
let root: ReactTestRenderer;
let client: QueryClient;
let now: number;
function Probe({
  signed = false,
  userId,
}: {
  signed?: boolean;
  userId?: string;
}) {
  mock.result = useHomeQuery(signed, userId);
  const query = mock.result.query;
  return (
    <span>
      {query.dataUpdatedAt}:{query.isFetching ? "fetching" : "idle"}:
      {query.error ? "error" : "ok"}:{query.data ? "data" : "empty"}
    </span>
  );
}
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}
async function mount(signed = false, userId?: string) {
  await act(async () => {
    root = create(
      <QueryClientProvider client={client}>
        <Probe signed={signed} userId={userId} />
      </QueryClientProvider>,
    );
  });
  await settle();
}
beforeEach(() => {
  notifyManager.setScheduler((callback) => queueMicrotask(callback));
  now = 1000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  mock.request.mockReset();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  client.clear();
  notifyManager.setScheduler((callback) => setTimeout(callback, 0));
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("initial/focus/pull refreshes join the same in-flight request", async () => {
  let finish!: (value: any) => void;
  mock.request.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await mount();
  expect(mock.request).toHaveBeenCalledOnce();
  await act(async () => {
    void mock.result.refresh();
    void mock.result.refresh();
    mock.focus();
  });
  expect(mock.request).toHaveBeenCalledOnce();
  expect(mock.result.query.isFetching).toBe(true);
  await act(async () =>
    finish({ data: { title: "Current" }, status: 200, requestId: "test" }),
  );
  await settle();
  expect(mock.result.query.isFetching).toBe(false);
});
it("returning to Home fetches again and success advances the timestamp", async () => {
  mock.request.mockResolvedValue({ data: { title: "First" }, status: 200 });
  await mount();
  expect(mock.request).toHaveBeenCalledOnce();
  expect(mock.result.query.dataUpdatedAt).toBe(1000);
  now = 2000;
  mock.request.mockResolvedValue({ data: { title: "Updated" }, status: 200 });
  await act(async () => mock.focus());
  await settle();
  expect(mock.request).toHaveBeenCalledTimes(2);
  expect(mock.result.query.data.data.title).toBe("Updated");
  expect(mock.result.query.dataUpdatedAt).toBe(2000);
});
it("failed refresh retains valid data and last successful timestamp", async () => {
  mock.request.mockResolvedValue({
    data: { title: "Useful cached content" },
    status: 200,
  });
  await mount();
  const previous = mock.result.query.data;
  now = 3000;
  mock.request.mockRejectedValue(new Error("offline"));
  await act(async () => {
    await mock.result.refresh();
  });
  await settle();
  expect(mock.result.query.error).toBeTruthy();
  expect(mock.result.query.data).toBe(previous);
  expect(mock.result.query.dataUpdatedAt).toBe(1000);
  expect(mock.result.query.isFetching).toBe(false);
});
it("initial failure has no data or success timestamp and can retry", async () => {
  mock.request.mockRejectedValue(new Error("offline"));
  await mount();
  expect(mock.result.query.data).toBeUndefined();
  expect(mock.result.query.dataUpdatedAt).toBe(0);
  mock.request.mockResolvedValue({ data: { title: "Recovered" }, status: 200 });
  now = 4000;
  await act(async () => {
    await mock.result.refresh();
  });
  await settle();
  expect(mock.result.query.error).toBeNull();
  expect(mock.result.query.dataUpdatedAt).toBe(4000);
});
it("signed-in refresh keeps private request and account cache separation", async () => {
  mock.request.mockResolvedValue({ data: {}, status: 200 });
  await mount(true, "account-a");
  expect(mock.request).toHaveBeenCalledWith(
    "/me/today",
    expect.anything(),
    expect.objectContaining({ private: true }),
  );
  expect(client.getQueryData(["private", "account-a", "today"])).toBeDefined();
  expect(client.getQueryData(["public", "today"])).toBeUndefined();
  expect(
    client.getQueryData(["private", "account-b", "today"]),
  ).toBeUndefined();
});
