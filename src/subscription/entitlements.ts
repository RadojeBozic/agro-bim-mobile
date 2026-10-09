import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/provider";
import { api } from "../runtime";
import { entitlementsSchema } from "../api/contracts";

/** Backend-owned policy. No local tier rules; logout clears the private query cache. */
export function useEntitlements() {
  const auth = useAuth();
  return useQuery({
    queryKey: ["private", "entitlements", auth.me?.user.id],
    enabled: auth.status === "signedIn",
    queryFn: ({ signal }) =>
      api.request("/me/entitlements", entitlementsSchema, {
        private: true,
        signal,
      }),
  });
}
