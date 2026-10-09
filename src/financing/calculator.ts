/**
 * FIN-RD-001B — reusable loan calculation (pure, no UI, no I/O).
 *
 * Model (v1):
 * - Standard annuity: A = P·r / (1 − (1 + r)^−n), r = annual% / 100 / periodsPerYear.
 * - Zero interest: A = P / n.
 * - Grace period: the term INCLUDES grace. During grace only interest is paid
 *   (interest-only installments); principal is then repaid as an annuity over
 *   the remaining (term − grace) periods. Real lenders may capitalize interest
 *   instead — this is stated in the UI.
 */

export const REPAYMENT_FREQUENCIES = { monthly: 12 } as const;
export type RepaymentFrequency = keyof typeof REPAYMENT_FREQUENCIES;
export type CalculatorCurrency = "RSD" | "EUR";

export const CALCULATOR_LIMITS = {
  maxAmount: 10_000_000_000,
  maxRate: 100,
  maxTermMonths: 360,
} as const;

export interface LoanInput {
  investmentAmount: number;
  ownFunds: number;
  /** Optional override; defaults to investment − own funds. */
  principal?: number;
  currency: CalculatorCurrency;
  annualInterestRate: number;
  termMonths: number;
  graceMonths: number;
  repaymentFrequency: RepaymentFrequency;
}

export interface ScheduleRow {
  number: number;
  openingPrincipal: number;
  interest: number;
  principalPaid: number;
  payment: number;
  remainingPrincipal: number;
  isGrace: boolean;
}

export interface LoanResult {
  principal: number;
  ownContribution: number;
  ownContributionPercent: number;
  financingPercent: number;
  periodicRate: number;
  gracePayment: number;
  periodicPayment: number;
  totalInterest: number;
  totalRepayment: number;
  schedule: ScheduleRow[];
}

export type LoanValidationError =
  | "investment_required"
  | "negative_amount"
  | "own_funds_exceed_investment"
  | "amount_too_large"
  | "principal_required"
  | "invalid_rate"
  | "invalid_term"
  | "invalid_grace";

export type LoanCalculation =
  | { ok: true; result: LoanResult }
  | { ok: false; errors: LoanValidationError[] };

const finite = (n: number) => typeof n === "number" && Number.isFinite(n);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function validateLoanInput(input: LoanInput): LoanValidationError[] {
  const e: LoanValidationError[] = [];
  const { investmentAmount: inv, ownFunds: own } = input;
  const principal = input.principal ?? inv - own;
  if (!finite(inv) || inv <= 0) e.push("investment_required");
  if (
    !finite(own) ||
    own < 0 ||
    (input.principal !== undefined && (!finite(principal) || principal < 0))
  )
    e.push("negative_amount");
  if (finite(inv) && finite(own) && own > inv)
    e.push("own_funds_exceed_investment");
  if (
    [inv, own, principal].some(
      (v) => finite(v) && v > CALCULATOR_LIMITS.maxAmount,
    )
  )
    e.push("amount_too_large");
  if (!e.length && !(principal > 0)) e.push("principal_required");
  const rate = input.annualInterestRate;
  if (!finite(rate) || rate < 0 || rate > CALCULATOR_LIMITS.maxRate)
    e.push("invalid_rate");
  const term = input.termMonths;
  if (
    !Number.isInteger(term) ||
    term < 1 ||
    term > CALCULATOR_LIMITS.maxTermMonths
  )
    e.push("invalid_term");
  const grace = input.graceMonths;
  if (
    !Number.isInteger(grace) ||
    grace < 0 ||
    (Number.isInteger(term) && grace >= term)
  )
    e.push("invalid_grace");
  if (!(input.repaymentFrequency in REPAYMENT_FREQUENCIES))
    e.push("invalid_term");
  return e;
}

export function annuityPayment(
  principal: number,
  periodicRate: number,
  periods: number,
): number {
  if (periods <= 0) return 0;
  if (periodicRate === 0) return principal / periods;
  return (
    (principal * periodicRate) / (1 - Math.pow(1 + periodicRate, -periods))
  );
}

export function calculateLoan(input: LoanInput): LoanCalculation {
  const errors = validateLoanInput(input);
  if (errors.length) return { ok: false, errors };

  const periodsPerYear = REPAYMENT_FREQUENCIES[input.repaymentFrequency];
  const monthsPerPeriod = 12 / periodsPerYear;
  const principal = input.principal ?? input.investmentAmount - input.ownFunds;
  const r = input.annualInterestRate / 100 / periodsPerYear;
  const gracePeriods = Math.round(input.graceMonths / monthsPerPeriod);
  const repayPeriods =
    Math.round(input.termMonths / monthsPerPeriod) - gracePeriods;

  const gracePayment = principal * r;
  const payment = annuityPayment(principal, r, repayPeriods);

  const schedule: ScheduleRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  for (let i = 1; i <= gracePeriods + repayPeriods; i++) {
    const isGrace = i <= gracePeriods;
    const interest = balance * r;
    let principalPaid = isGrace ? 0 : payment - interest;
    if (!isGrace && i === gracePeriods + repayPeriods) principalPaid = balance; // absorb float drift
    const pay = interest + principalPaid;
    const remaining = Math.max(0, balance - principalPaid);
    schedule.push({
      number: i,
      openingPrincipal: round2(balance),
      interest: round2(interest),
      principalPaid: round2(principalPaid),
      payment: round2(pay),
      remainingPrincipal: round2(remaining),
      isGrace,
    });
    totalInterest += interest;
    balance = remaining;
  }

  const inv = input.investmentAmount;
  return {
    ok: true,
    result: {
      principal: round2(principal),
      ownContribution: round2(input.ownFunds),
      ownContributionPercent: round2((input.ownFunds / inv) * 100),
      financingPercent: round2((principal / inv) * 100),
      periodicRate: r,
      gracePayment: round2(gracePayment),
      periodicPayment: round2(payment),
      totalInterest: round2(totalInterest),
      totalRepayment: round2(principal + totalInterest),
      schedule,
    },
  };
}
