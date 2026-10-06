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
