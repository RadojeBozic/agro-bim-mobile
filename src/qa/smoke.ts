import { api, session } from "../runtime";
import {
  analysisSchema,
  checkContextSchema,
  checkRequestSchema,
  checkSchema,
  questionSchema,
  feedPageSchema,
  idSchema,
  meSchema,
  profilePatchSchema,
  profileSchema,
  todaySchema,
} from "../api/contracts";
import { config } from "../config/environment";
import { ApiError } from "../core/errors";
export type SmokeResult = {
  endpoint: string;
  status: number;
  requestId?: string;
  result: string;
};
function guard() {
  if (!config.qaEnabled || !session.token())
    throw new ApiError("unauthenticated", 401);
}
export async function reads(): Promise<SmokeResult[]> {
  guard();
  const results: SmokeResult[] = [];
  for (const [route, schema] of [
    ["/me", meSchema],
    ["/me/farm-profile", profileSchema],
    ["/me/today", todaySchema],
    ["/me/feed", feedPageSchema],
  ] as const) {
    const result = await api.request(route, schema, { private: true });
    results.push({
      endpoint: route,
      status: result.status,
      requestId: result.requestId,
      result: "schema_valid",
    });
  }
  try {
    const result = await api.request("/me/financing-analysis", analysisSchema, {
      private: true,
    });
    results.push({
      endpoint: "/me/financing-analysis",
      status: result.status,
      requestId: result.requestId,
      result: "entitled_account: denial_not_tested",
    });
  } catch (e) {
    if (
      !(e instanceof ApiError) ||
      !["capability_required", "trial_expired"].includes(e.code) ||
      e.status !== 403
    )
      throw e;
    results.push({
      endpoint: "/me/financing-analysis",
      status: e.status,
      requestId: e.requestId,
      result: e.code,
    });
  }
  return results;
}
export async function unchangedProfile(): Promise<SmokeResult> {
  guard();
  const existing = await api.request("/me/farm-profile", profileSchema, {
    private: true,
  });
  if (!existing.data.id || !existing.data.basicProfile)
    throw new ApiError("validation_error");
  // Only repeat existing basic fields. Omitted activities/capacities/intent remain unchanged.
  const body = profilePatchSchema.parse({
    version: existing.data.version,
    basicProfile: existing.data.basicProfile,
  });
  if (
    JSON.stringify(body.basicProfile) !==
    JSON.stringify(existing.data.basicProfile)
  )
    throw new ApiError("validation_error");
  const result = await api.request("/me/farm-profile", profileSchema, {
    private: true,
    method: "PATCH",
    body,
  });
  if (
    JSON.stringify(existing.data.basicProfile) !==
    JSON.stringify(result.data.basicProfile)
  )
    throw new ApiError("conflict", 409);
  return {
    endpoint: "/me/farm-profile PATCH",
    status: result.status,
    requestId: result.requestId,
    result: "identical_basic_values_confirmed",
  };
}
let saved = false;
export async function eligibility(programmeId: string): Promise<SmokeResult> {
  guard();
  if (saved) throw new ApiError("conflict", 409);
  const id = idSchema.parse(programmeId.trim());
  const me = await api.request("/me", meSchema, { private: true });
  if (
    !me.data.access.capabilities.runBasicEligibility ||
    me.data.access.capabilities.runFinancingAnalysis ||
    me.data.access.financingState === "trial_active"
  )
    throw new ApiError("validation_error");
  await api.request(
    "/programmes/" + id + "/check-context",
    checkContextSchema,
    { private: true },
  );
  const body = checkRequestSchema.parse({ answers: {} }); // Do not invent private facts; missing facts are a valid server result.
  saved = true; // At most one POST per app process, including an ambiguous network outcome.
  const result = await api.request(
    "/programmes/" + id + "/checks",
    checkSchema.strict().extend({
      conditions: checkSchema.shape.conditions.element.strict().array(),
      missingFacts: questionSchema.strict().array(),
    }),
    { private: true, method: "POST", body },
  );
  if (!result.data.serverAuthoritative) throw new ApiError("invalid_response");
  return {
    endpoint: "/programmes/:id/checks",
    status: result.status,
    requestId: result.requestId,
    result: "registered_free_server_authoritative_safe_DTO",
  };
}
