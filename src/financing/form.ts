import {
  calculateLoan,
  type CalculatorCurrency,
  type LoanResult,
  type LoanValidationError,
} from "./calculator";

export type CalculatorForm = {
  investment: string;
  own: string;
  rate: string;
  term: string;
  grace: string;
  currency: CalculatorCurrency;
  termUnit: "months" | "years";
};
export const initialForm: CalculatorForm = {
  investment: "5000000",
  own: "1000000",
  rate: "6",
  term: "5",
  grace: "0",
  currency: "RSD",
  termUnit: "years",
};
const messages: Record<LoanValidationError, string> = {
  investment_required: "Unesite vrednost investicije veću od nule.",
  negative_amount: "Unesite ispravne nenegativne iznose.",
  own_funds_exceed_investment:
    "Sopstvena sredstva ne mogu biti veća od vrednosti investicije.",
  amount_too_large:
    "Iznos je prevelik za ovaj kalkulator (najviše 10 milijardi).",
  principal_required: "Potrebno finansiranje mora biti veće od nule.",
  invalid_rate: "Kamatna stopa mora biti između 0 i 100%.",
  invalid_term: "Rok otplate mora biti od 1 do 360 meseci (30 godina).",
  invalid_grace:
    "Grejs period mora biti ceo broj meseci, od nule do roka otplate umanjenog za jedan mesec.",
};
/** A single comma or point is decimal; spaces may group thousands. No ambiguous dot grouping. */
export function parseDecimal(value: string): number {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)
    ? Number(normalized)
    : Number.NaN;
}
export type FormCalculation =
  | {
      ok: true;
      result: LoanResult;
      investment: number;
      currency: CalculatorCurrency;
      grace: number;
    }
  | { ok: false; messages: string[] };
export function calculateForm(form: CalculatorForm): FormCalculation {
  const investment = parseDecimal(form.investment);
  const term = parseDecimal(form.term);
  const grace = form.grace.trim() ? parseDecimal(form.grace) : 0;
  const calculation = calculateLoan({
    investmentAmount: investment,
    ownFunds: form.own.trim() ? parseDecimal(form.own) : 0,
    annualInterestRate: parseDecimal(form.rate),
    termMonths: form.termUnit === "years" ? Math.round(term * 12) : term,
    graceMonths: grace,
    currency: form.currency,
    repaymentFrequency: "monthly",
  });
  if (!calculation.ok)
    return {
      ok: false,
      messages: calculation.errors.map((error) => messages[error]),
    };
  // Preserve the source math; fail safely when extreme precision exceeds floating-point resolution.
  const { schedule, ...summary } = calculation.result;
  if (
    !Object.values(summary).every(Number.isFinite) ||
    schedule.some((row) =>
      Object.values(row).some(
        (value) => typeof value === "number" && !Number.isFinite(value),
      ),
    )
  ) {
    return {
      ok: false,
      messages: [
        "Obračun nije moguć za ove vrednosti. Proverite iznose i preciznost kamatne stope.",
      ],
    };
  }
  return {
    ok: true,
    result: calculation.result,
    investment,
    currency: form.currency,
    grace,
  };
}
export const calculatorDisclaimer =
  "Obračun je informativan i nije ponuda banke. Stvarni uslovi zavise od davaoca kredita. Naknade, osiguranje, valutna klauzula i drugi troškovi mogu promeniti stvarnu cenu kredita.";
export const graceDisclaimer =
  "Grejs period: u tim mesecima plaća se samo kamata, a glavnica se vraća jednakim ratama u preostalom delu roka. Banke grejs period obračunavaju na različite načine (npr. pripisivanje kamate glavnici).";
