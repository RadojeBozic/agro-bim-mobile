import { supabase } from "../runtime";
import { config } from "../config/environment";
export async function completeCallback(rawUrl: string) {
  if (!supabase) throw new Error("auth");
  const url = new URL(rawUrl),
    allowed = new URL(config.callbackUrl);
  if (
    url.protocol !== allowed.protocol ||
    url.host !== allowed.host ||
    url.pathname !== allowed.pathname
  )
    throw new Error("callback");
  const params = new URLSearchParams(url.search || url.hash.replace(/^#/, ""));
  // PKCE code exchange or Supabase email token-hash verification. No arbitrary bearer tokens accepted.
  const code = params.get("code"),
    tokenHash = params.get("token_hash"),
    type = params.get("type");
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    if (result.error) throw result.error;
    return type === "recovery" || params.get("flow") === "recovery";
  }
  if (
    tokenHash &&
    (type === "recovery" || type === "signup" || type === "email")
  ) {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (result.error) throw result.error;
    return type === "recovery";
  }
  throw new Error("callback");
}
