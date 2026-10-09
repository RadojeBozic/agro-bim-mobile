import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
import { validateApiHost, validatePublicAuth } from "../src/config/environment";
it("production host is fixed and redirect hosts are rejected", () => {
  expect(validateApiHost("https://agrobim.digital", "production")).toBe(
    "https://agrobim.digital",
  );
  expect(() =>
    validateApiHost("https://agro-bim-next.lovable.app", "development"),
  ).toThrow();
  expect(() => validateApiHost("https://example.com", "production")).toThrow();
});
it("only development permits explicit loopback HTTP", () => {
  expect(validateApiHost("http://127.0.0.1:18081", "development")).toBe(
    "http://127.0.0.1:18081",
  );
  expect(() => validateApiHost("http://127.0.0.1:18081", "preview")).toThrow();
});
it("public config rejects service-role secrets", () => {
  expect(
    validatePublicAuth("https://example.supabase.co", "sb_publishable_public"),
  ).toBe(true);
  expect(() =>
    validatePublicAuth("https://example.supabase.co", "sb_secret_DO_NOT_USE"),
  ).toThrow();
  const encode = (role: string) => "x." + btoa(JSON.stringify({ role })) + ".x";
  expect(
    validatePublicAuth("https://example.supabase.co", encode("anon")),
  ).toBe(true);
  expect(() =>
    validatePublicAuth("https://example.supabase.co", encode("service_role")),
  ).toThrow();
});
it("native API requests always use the canonical HTTPS host in every stage", () => {
  for (const stage of ["development", "preview", "production"] as const) {
    expect(validateApiHost("https://agrobim.digital", stage, true)).toBe(
      "https://agrobim.digital",
    );
    for (const host of [
      "http://localhost:18081",
      "http://10.0.2.2:18081",
      "https://example.com",
    ]) {
      expect(() => validateApiHost(host, stage, true)).toThrow();
    }
  }
});

it.each([
  ["development", "true", true],
  ["preview", "true", true],
  ["development", "false", false],
  ["preview", undefined, false],
  ["production", "true", false],
] as const)(
  "QA environment %s with flag %s resolves to %s",
  async (stage, flag, expected) => {
    vi.resetModules();
    vi.stubEnv("EXPO_PUBLIC_APP_ENV", stage);
    vi.stubEnv("EXPO_PUBLIC_ENABLE_QA", flag);
    try {
      const { config } = await import("../src/config/environment");
      expect(config.qaEnabled).toBe(expected);
    } finally {
      vi.unstubAllEnvs();
    }
  },
);

import { requireBuildAuth } from "../src/config/public-auth";
it("release cloud builds require both public auth variables, local missing auth remains graceful", () => {
  expect(requireBuildAuth("development", true, "", "")).toBe(false);
  expect(requireBuildAuth("preview", false, "", "")).toBe(false);
  for (const stage of ["preview", "production"]) {
    expect(() => requireBuildAuth(stage, true, "", "")).toThrow(
      "EAS auth configuration missing",
    );
    expect(() =>
      requireBuildAuth(stage, true, "https://example.supabase.co", ""),
    ).toThrow("EAS auth configuration missing");
    expect(
      requireBuildAuth(
        stage,
        true,
        "https://example.supabase.co",
        "sb_publishable_test",
      ),
    ).toBe(true);
    expect(() =>
      requireBuildAuth(
        stage,
        true,
        "https://example.supabase.co",
        "sb_secret_private",
      ),
    ).toThrow("Only public Auth");
  }
});
