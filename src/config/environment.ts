import { Platform } from "react-native";
export type Environment = "development" | "preview" | "production";
export function validateApiHost(
  value: string,
  environment: Environment,
  native = false,
) {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Invalid API host");
  if (url.hostname.includes("lovable"))
    throw new Error("Redirect hosts are not supported");
  if (
    url.protocol !== "https:" &&
    !(
      environment === "development" &&
      ["localhost", "127.0.0.1", "10.0.2.2"].includes(url.hostname)
    )
  )
    throw new Error("HTTPS required");
  if (
    (native || environment === "production") &&
    url.origin !== "https://agrobim.digital"
  )
    throw new Error("Invalid production API host");
  return url.origin;
}
const stage = process.env.EXPO_PUBLIC_APP_ENV ?? "development";
if (!["development", "preview", "production"].includes(stage))
  throw new Error("Invalid app environment");
export const environment = stage as Environment;
const callbackUrl =
  process.env.EXPO_PUBLIC_AUTH_CALLBACK_URL ??
  (environment === "development"
    ? "agrobim-dev://auth/callback"
    : "https://agrobim.digital/mobile/auth/callback");
if (
  environment !== "development" &&
  (new URL(callbackUrl).origin !== "https://agrobim.digital" ||
    new URL(callbackUrl).pathname !== "/mobile/auth/callback")
)
  throw new Error("HTTPS Auth callback required");
export function validatePublicAuth(url: string, key: string) {
  if (!url || !key) return false;
  if (new URL(url).protocol !== "https:") throw new Error("Invalid Auth host");
  if (key.startsWith("sb_publishable_")) return true;
  try {
    const role = JSON.parse(
      atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    ).role;
    if (role === "anon") return true;
  } catch {}
  throw new Error("Only public Auth keys are allowed");
}
export const config = {
  environment,
  apiBase:
    validateApiHost(
      process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://agrobim.digital",
      environment,
      Platform.OS !== "web",
    ) + "/api/v1",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  callbackUrl,
  qaEnabled:
    environment !== "production" &&
    process.env.EXPO_PUBLIC_ENABLE_QA === "true",
  native: Platform.OS !== "web",
};
