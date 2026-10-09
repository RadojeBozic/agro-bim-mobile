# AGRO-MOB-003A — Native financing calculator

Status: IMPLEMENTED — READY FOR DEVICE QA. No physical-device QA performed.

## Authoritative source

Inspected the read-only backend at commit 970a0d327a6da7ae8f13f16622c987d1edb83035:

- src/lib/financing/calculator.ts: validateLoanInput, annuityPayment, calculateLoan, limits and result/schedule types.
- src/lib/financing/calculator.test.ts: approved representative examples.
- src/routes/kalkulator-finansiranja.tsx: public fields, defaults, years/months conversion, summary, schedule, grace notice and disclaimer.

The pure calculator was copied into src/financing/calculator.ts without business-logic changes; only Prettier formatting differs. Future source changes need an explicit parity review of this mobile copy. There is no backend import/dependency at runtime.

## Calculation rules

Principal is investment minus own funds. RSD/EUR are labels, with no currency conversion.
Monthly rate is annual nominal percentage / 100 / 12.
Annuity is P*r/(1-(1+r)^-n); zero interest uses P/n.
Total term includes grace. Grace installments pay interest only, followed by annuity repayments over the remaining months.
Balances and totals accumulate unrounded, with displayed values rounded to two decimals. The final non-grace installment uses the entire remaining unrounded principal to absorb floating-point drift.
This is not a ledger of rounded displayed cents: for principal 1 over 3 zero-interest months, displayed installments are 0.33 each while total repayment is 1, exactly as on the web.
No fees, insurance, effective-interest calculation, capitalized grace interest or other model was added.

## Native experience

Route /more/calculator uses the existing compact header, Screen, safe-area and theme components.
Fields: investment, own funds, annual nominal rate, term in years/months, grace months, RSD/EUR. All editable. Defaults are the web example, clearly described as example values.
Outputs: investment, principal, own-funds and financing shares, monthly payment, total installment count, grace payment when applicable, total interest and total repayment.
Schedule: 12 vertically stacked installments per page, with number/grace marker, opening principal, interest, principal component, payment and remaining principal.
The approved web disclaimer and grace explanation are reused. The keyboard dismisses on calculation and edits clear old results.

## Validation and availability

The same numeric bounds apply: amount <=10 billion, annual rate 0–100%, whole-month term 1–360, whole-month grace >=0 and strictly shorter than term; own funds nonnegative and less than investment.
Years convert to months using the web's Math.round(years*12).
Empty investment/rate/term are invalid; blank own funds/grace mean zero as on the web.
A single comma or point is a decimal separator; spaces may group thousands. Dot thousands grouping is deliberately not accepted, and input instructions explain this to avoid confusing decimal points with grouping.
Malformed values, negative values, out-of-range inputs and non-finite calculation results show Serbian messages. Extremely small positive rates below floating-point resolution fail safely without changing the authoritative formula.
Arithmetic runs entirely locally. No API call, authentication requirement, trial requirement, capability check or paid entitlement was added.
Financing list and product detail open the calculator without product prefill or inferred bank terms. Product data stays unchanged.

## Navigation / QA / build

Više replaces the external calculator link with native navigation. Production/parcels remains labelled web-only; existing account, market, farm and legal/support links remain.
The QA entry is absent from Više even with QA enabled and a signed-in user. /more/qa code remains unchanged, requiring both EXPO_PUBLIC_ENABLE_QA and a signed-in user; existing production environment restrictions remain.
The Expo floating development gear is supplied by the development client. No application hack was added. Existing preview and production EAS profiles are not development-client builds, so the development gear is absent there. This remains a device-build QA item.
Android identity com.agrobim.digital, dependencies, EAS configuration and backend contracts are unchanged.
No package, monetization, billing, subscription or entitlement work was performed; those remain separate tasks.
No commits were created.

## Verification

- Full mobile suite: 153 tests passed (9 files), including copied authoritative examples, exact web fixtures, decimal parsing, invalid bounds, zero interest, grace, final balance/correction, guest local calculation, stale-result clearing, pagination, native navigation and hidden QA menu/direct route gating.
- Direct runtime comparison against the read-only backend: exact result and every schedule row matched across 128 combinations of amount, rate, term and grace.
- TypeScript: passed.
- Lint: passed.
- Expo Doctor: 21/21 checks passed.
- Environment/EAS checks: development, preview and production passed.
- Android export: passed (1415 modules; output in ignored dist).
- Browser preview: guest calculator, standard and grace results, schedule pagination and Više cleanup checked. No horizontal overflow at 320px/360px.
- git diff reviewed; git diff --check passed. Mobile changes only; backend git status clean.

## Changed files

- src/financing/calculator.ts
- src/financing/form.ts
- src/screens/financing-calculator.tsx
- src/app/(tabs)/more/calculator.tsx
- src/app/(tabs)/more/index.tsx
- src/screens/catalog.tsx
- tests/calculator.test.ts
- tests/content.test.tsx
- docs/AGRO-MOB-003A.md

## Remaining device QA

Use an Android preview build to check decimal-comma/dot keyboard entry, keyboard dismissal and reachability, increased system font size, TalkBack choice announcements, long schedule navigation, airplane-mode arithmetic after launch, safe areas/back navigation, and the absence of Expo development gear.
Physical-device QA and an EAS binary build were not performed.
