/** Client-safe Supabase configuration; usable by Expo config and runtime alike. */
/** @param {string} url @param {string} key */
function validatePublicAuth(url, key) {
  if (!url || !key) return false;
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  )
    throw new Error("Invalid Auth host");
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  try {
    const role = JSON.parse(
      atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    ).role;
    if (role === "anon") return true;
  } catch {}
  throw new Error("Only public Auth keys are allowed");
}
/** @param {string} environment @param {boolean} easBuild @param {string} url @param {string} key */
function requireBuildAuth(environment, easBuild, url, key) {
  const available = validatePublicAuth(url, key);
  if (easBuild && environment !== "development" && !available)
    throw new Error(
      "EAS auth configuration missing: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the selected EAS environment.",
    );
  return available;
}

module.exports = { validatePublicAuth, requireBuildAuth };
