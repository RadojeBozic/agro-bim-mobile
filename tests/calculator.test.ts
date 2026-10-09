import { describe, expect, it } from "vitest";

import { calculateLoan, type LoanInput } from "../src/financing/calculator";

const base: LoanInput = {
  investmentAmount: 5_000_000,
  ownFunds: 1_000_000,
  currency: "RSD",
  annualInterestRate: 6,
  termMonths: 60,
  graceMonths: 0,
  repaymentFrequency: "monthly",
};

function ok(input: LoanInput) {
  const c = calculateLoan(input);
  if (!c.ok) throw new Error(c.errors.join(","));
  return c.result;
}

describe("loan calculator", () => {
  it("normal interest-bearing loan (annuity)", () => {
    const r = ok(base);
    expect(r.principal).toBe(4_000_000);
    expect(r.periodicPayment).toBeCloseTo(77_331.2, 0);
    expect(r.totalRepayment).toBeCloseTo(77_331.2 * 60, -2);
    expect(r.totalInterest).toBeCloseTo(r.totalRepayment - 4_000_000, 1);
    expect(r.schedule).toHaveLength(60);
  });

  it("zero-interest loan", () => {
    const r = ok({ ...base, annualInterestRate: 0 });
    expect(r.periodicPayment).toBeCloseTo(66_666.67, 2);
    expect(r.totalInterest).toBe(0);
    expect(r.totalRepayment).toBe(4_000_000);
  });

  it("derives financing from own funds", () => {
    const r = ok(base);
    expect(r.ownContribution).toBe(1_000_000);
    expect(r.ownContributionPercent).toBe(20);
    expect(r.financingPercent).toBe(80);
  });

  it("rejects invalid input", () => {
    const bad = (p: Partial<LoanInput>) => {
      const c = calculateLoan({ ...base, ...p });
      return c.ok ? [] : c.errors;
    };
    expect(bad({ investmentAmount: 0 })).toContain("investment_required");
    expect(bad({ ownFunds: -1 })).toContain("negative_amount");
    expect(bad({ ownFunds: 6_000_000 })).toContain(
      "own_funds_exceed_investment",
    );
    expect(bad({ ownFunds: 5_000_000 })).toContain("principal_required");
    expect(bad({ annualInterestRate: -1 })).toContain("invalid_rate");
    expect(bad({ annualInterestRate: 101 })).toContain("invalid_rate");
    expect(bad({ termMonths: 0 })).toContain("invalid_term");
    expect(bad({ termMonths: 361 })).toContain("invalid_term");
    expect(bad({ graceMonths: 60 })).toContain("invalid_grace");
    expect(bad({ investmentAmount: 1e11 })).toContain("amount_too_large");
    expect(bad({ investmentAmount: Number.NaN })).toContain(
      "investment_required",
    );
  });

  it("grace period: interest-only, then annuity over remaining term", () => {
    const r = ok({ ...base, graceMonths: 12 });
    expect(r.schedule).toHaveLength(60);
    expect(r.gracePayment).toBe(20_000);
    for (const row of r.schedule.slice(0, 12)) {
      expect(row.isGrace).toBe(true);
      expect(row.principalPaid).toBe(0);
      expect(row.payment).toBe(20_000);
    }
    expect(r.schedule[12]!.openingPrincipal).toBe(4_000_000);
    expect(r.periodicPayment).toBeCloseTo(93_940.12, 1);
    expect(r.totalInterest).toBeGreaterThan(ok(base).totalInterest);
  });

  it("final balance is ~0 for small, normal and large loans", () => {
    for (const input of [
      { ...base, investmentAmount: 1, ownFunds: 0, termMonths: 1 },
      { ...base, graceMonths: 6 },
      {
        ...base,
        investmentAmount: 9_000_000_000,
        ownFunds: 0,
        termMonths: 360,
        annualInterestRate: 12,
      },
    ]) {
      const r = ok(input);
      expect(r.schedule.at(-1)!.remainingPrincipal).toBeCloseTo(0, 2);
      const paid = r.schedule.reduce((s, row) => s + row.principalPaid, 0);
      expect(paid / r.principal).toBeCloseTo(1, 6);
    }
  });
});

import {
  calculateForm,
  initialForm,
  parseDecimal,
} from "../src/financing/form";
it.each([
  ["6,5", 6.5],
  ["6.5", 6.5],
  ["5 000 000,50", 5000000.5],
  ["0", 0],
  ["-1", -1],
])("normalizes %s", (value, expected) => {
  expect(parseDecimal(value)).toBe(expected);
});
it.each(["", "abc", "Infinity", "NaN", "1e10", "5.000.000", "1,2,3", "1.2,3"])(
  "rejects malformed decimal %s",
  (value) => {
    expect(Number.isNaN(parseDecimal(value))).toBe(true);
  },
);
it.each([
  { investment: "" },
  { investment: "0" },
  { investment: "-1" },
  { own: "-1" },
  { own: "6000000" },
  { own: "5000000" },
  { investment: "10000000001" },
  { rate: "" },
  { rate: "-1" },
  { rate: "101" },
  { term: "" },
  { term: "0" },
  { term: "31" },
  { grace: "-1" },
  { grace: "60" },
  { grace: "0.5" },
  { termUnit: "months" as const, term: "1.5" },
])("validates native form %j", (patch) => {
  const result = calculateForm({ ...initialForm, ...patch });
  expect(result.ok).toBe(false);
  if (!result.ok)
    expect(result.messages.every((message) => message.length > 0)).toBe(true);
});
it("blank optional fields are zero, decimal separators agree, and years follow web rounding", () => {
  const a = calculateForm({
    ...initialForm,
    rate: "6,5",
    own: "",
    grace: "",
    term: "1,5",
  });
  const b = calculateForm({
    ...initialForm,
    rate: "6.5",
    own: "0",
    grace: "0",
    term: "18",
    termUnit: "months",
  });
  expect(a).toEqual(b);
  expect(a.ok && a.result.schedule.length).toBe(18);
});
it("does not expose non-finite outputs for rates below machine precision", () => {
  const result = calculateForm({ ...initialForm, rate: "0.00000000000000001" });
  expect(result.ok).toBe(false);
});
it("final installment preserves web unrounded balance correction", () => {
  const r = ok({
    ...base,
    investmentAmount: 1,
    ownFunds: 0,
    annualInterestRate: 0,
    termMonths: 3,
  });
  expect(r.schedule.map((row) => row.payment)).toEqual([0.33, 0.33, 0.33]);
  expect(r.schedule.at(-1)!.remainingPrincipal).toBe(0);
  expect(r.totalRepayment).toBe(1);
  // Web computes on unrounded balances, not a running balance of displayed cents.
});

it.each([
  [0, 6, 77331.21, 639872.37, 4639872.37, 76946.47, 384.73],
  [12, 6, 93940.12, 749125.58, 4749125.58, 93472.75, 467.36],
  [0, 0, 66666.67, 0, 4000000, 66666.67, 0],
  [12, 0, 83333.33, 0, 4000000, 83333.33, 0],
])(
  "matches exact public web fixture grace=%s rate=%s",
  (
    grace,
    rate,
    payment,
    interest,
    repayment,
    finalPrincipal,
    finalInterest,
  ) => {
    // Fixtures obtained by executing agro-bim-next/src/lib/financing/calculator.ts, 2026-10-09.
    const result = ok({
      ...base,
      graceMonths: grace,
      annualInterestRate: rate,
    });
    expect(result.periodicPayment).toBe(payment);
    expect(result.totalInterest).toBe(interest);
    expect(result.totalRepayment).toBe(repayment);
    expect(result.schedule.at(-1)).toEqual({
      number: 60,
      openingPrincipal: finalPrincipal,
      interest: finalInterest,
      principalPaid: finalPrincipal,
      payment,
      remainingPrincipal: 0,
      isGrace: false,
    });
  },
);
