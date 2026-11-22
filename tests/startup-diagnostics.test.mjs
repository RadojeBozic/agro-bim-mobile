import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});
it("redacts credentials in both message and stack without serializing sessions", async () => {
  const { makeReport } = await import("../src/diagnostics/startup");
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-config-value");
  const sensitive =
    "Bearer abc123 sb_secret_sample eyJabc.def.ghi https://host.test/?token=private person@example.com access_token=short password=hidden public-config-value";
  const report = makeReport(
    {
      message: sensitive,
      stack: sensitive,
      session: { access_token: "never-stringified" },
    },
    "test",
  );
  const text = JSON.stringify(report);
  for (const secret of [
    "abc123",
    "sb_secret_sample",
    "eyJabc",
    "host.test",
    "person@example.com",
    "short",
    "hidden",
    "public-config-value",
    "never-stringified",
  ])
    expect(text).not.toContain(secret);
  expect(
    makeReport(
      new TypeError("Cannot read property 'configure' of null"),
      "test",
    ).message,
  ).toContain("configure");
  expect(
    makeReport(
      {
        get message() {
          throw new Error("getter");
        },
      },
      "test",
    ).message,
  ).toBe("Unknown JavaScript exception");
});
it("delegates before registration and for nonfatal errors, captures the first fatal only", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  const previous = vi.fn();
  let current = previous;
  const set = vi.fn((next) => {
    current = next;
  });
  vi.stubGlobal("ErrorUtils", {
    getGlobalHandler: () => current,
    setGlobalHandler: set,
  });
  const d = await import("../src/diagnostics/startup");
  d.installHandlers();
  d.installHandlers();
  expect(set).toHaveBeenCalledTimes(1);
  current(new Error("too early"), true);
  expect(previous).toHaveBeenCalledTimes(1);
  expect(d.getReport()).toBeNull();
  d.markRegistered();
  current(new Error("soft"), false);
  const notified = vi.fn();
  const unsubscribe = d.subscribe(notified);
  current(new Error("module failed"), true);
  expect(d.getReport()?.message).toContain("module failed");
  expect(notified).toHaveBeenCalledTimes(1);
  expect(previous).toHaveBeenCalledTimes(2);
  // A failing diagnostic renderer must reach the original fatal handler.
  current(new Error("renderer failed"), true);
  expect(previous).toHaveBeenCalledTimes(3);
  expect(d.getReport()?.message).toContain("module failed");
  unsubscribe();
});
it("supports the RN C++ pipeline and sanitized structured stack frames", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  const register = vi.fn();
  vi.stubGlobal("RN$registerExceptionListener", register);
  const d = await import("../src/diagnostics/startup");
  d.installHandlers();
  d.installHandlers();
  d.markRegistered();
  expect(register).toHaveBeenCalledTimes(1);
  const preventDefault = vi.fn();
  register.mock.calls[0][0]({
    isFatal: true,
    message: "startup failure",
    stack: [{ methodName: "init", lineNumber: 1, column: 1234 }],
    preventDefault,
  });
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(d.getReport()?.stack).toBe("init@1:1234");
});
it("registers iOS diagnostics before Router loads and leaves other platforms on the original entry", () => {
  const events = [];
  const diagnosticRoot = () => null;
  const d = {
    installHandlers: () => events.push("install"),
    markRegistered: () => events.push("registered"),
    capture: vi.fn(),
  };
  const requireMock = (name) => {
    events.push(name);
    if (name === "./startup") return d;
    if (name === "./root") return { DiagnosticRoot: diagnosticRoot };
    if (name === "expo-router/build/renderRootComponent")
      return { renderRootComponent: vi.fn() };
    return {};
  };
  runInNewContext(readFileSync("src/diagnostics/entry.ios.js", "utf8"), {
    require: requireMock,
    console,
  });
  expect(events.indexOf("install")).toBeLessThan(
    events.indexOf("expo-router/build/renderRootComponent"),
  );
  expect(events.at(-1)).toBe("registered");
  const genericRequire = vi.fn();
  runInNewContext(readFileSync("src/diagnostics/entry.js", "utf8"), {
    require: genericRequire,
  });
  expect(genericRequire).toHaveBeenCalledExactlyOnceWith("expo-router/entry");
});
it("registers an independent fallback when Expo bootstrap throws", () => {
  const capture = vi.fn();
  const markRegistered = vi.fn();
  const registerComponent = vi.fn();
  const root = () => null;
  runInNewContext(readFileSync("src/diagnostics/entry.ios.js", "utf8"), {
    require: (name) => {
      if (name === "./startup")
        return { installHandlers: vi.fn(), capture, markRegistered };
      if (name === "@expo/metro-runtime")
        throw new Error("module initialization failed");
      if (name === "react-native")
        return { AppRegistry: { registerComponent } };
      if (name === "./root") return { DiagnosticRoot: root };
      throw new Error(name);
    },
    console,
  });
  expect(capture).toHaveBeenCalledWith(expect.any(Error), "bootstrap");
  expect(registerComponent.mock.calls[0][0]).toBe("main");
  expect(registerComponent.mock.calls[0][1]()).toBe(root);
  expect(markRegistered).toHaveBeenCalledOnce();
});
