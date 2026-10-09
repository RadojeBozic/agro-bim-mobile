import { expect, it } from "vitest";
import { entitlementsSchema } from "../src/api/contracts";
const base = {
  context: {
    kind: "holding",
    holdingId: "11111111-1111-4111-8111-111111111111",
  },
  configuredPlan: "trial",
  effectivePlan: "trial",
  status: "trial",
  trial: {
    startsAt: "2026-10-01T00:00:00Z",
    endsAt: "2026-10-31T00:00:00Z",
    active: true,
    expired: false,
  },
  capabilities: { basic_financing_calculator: true, advanced_scenarios: true },
  limits: { productionProcesses: { mode: "unlimited", enforced: false } },
  serverNow: "2026-10-09T00:00:00Z",
};
it("parses backend policy without inventing client package rules or retaining admin fields", () => {
  const e = entitlementsSchema.parse({
    ...base,
    note: "PRIVATE",
    assigned_by: "PRIVATE",
  });
  expect(e).toEqual(base);
  expect(e.capabilities.advanced_scenarios).toBe(true);
});
it.each([
  { mode: "limited", max: 0, enforced: false },
  { mode: "limited", max: 1, enforced: false },
  { mode: "unlimited", enforced: false },
  { mode: "unconfigured", enforced: false },
])(
  "preserves explicit numeric/unlimited/unconfigured limit semantics %j",
  (limit) => {
    expect(
      entitlementsSchema.parse({
        ...base,
        limits: { productionProcesses: limit },
      }).limits.productionProcesses,
    ).toEqual(limit);
  },
);
it("rejects negative limits and ambiguous missing policy fields", () => {
  expect(
    entitlementsSchema.safeParse({
      ...base,
      limits: {
        productionProcesses: { mode: "limited", max: -1, enforced: false },
      },
    }).success,
  ).toBe(false);
  expect(
    entitlementsSchema.safeParse({
      ...base,
      limits: { productionProcesses: null },
    }).success,
  ).toBe(false);
});
