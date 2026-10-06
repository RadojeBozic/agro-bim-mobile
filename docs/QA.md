# AGRO-MOB-001 controlled QA

Status: public production GET validated and rendered in supplemental web preview. Genuine test-account and physical Android checks are pending. Never paste session tokens into the app or a terminal.

Use an existing test account without advanced entitlement, an existing farm profile, and one approved existing programme ID. Sign in through the app's Prijava screen. For native QA use an installed development client; configure Auth callback allowlists separately with the project owner. Enable EXPO_PUBLIC_ENABLE_QA=true in development only.

1. Cold start as guest. Confirm the five tabs, live Početna sections, refresh timestamp and farm-tab login/register explanation.
2. Sign in. The app obtains a genuine session and validates GET /me. Confirm account verification/profile/capabilities.
3. Open Više → Interna QA provera. Tap private GET checks once: /me, /me/farm-profile, /me/today, /me/feed. Record each status, requestId and schema_valid result, without copying private data or tokens.
4. The same action tests /me/financing-analysis. For the selected non-entitled account expect 403 capability_required or trial_expired. A 200 is recorded as an entitled-account result, not a false denial pass.
5. Tap the unchanged-profile action once. It reads current version/basic values, rejects missing/incompatible profiles or normalization that would change values, PATCHes only identical existing basic values, then compares the returned values. Activities/capacities/intent are omitted and left unchanged. A version/timestamp advance is expected; meaningful profile values must match. Do not repeat after an ambiguous network outcome.
6. Enter the approved programme UUID. Tap eligibility once. The harness checks registered-free capability and absence of active/advanced financing access, fetches check-context, then POSTs answers={} once. No private facts are invented; missing-data results are valid. It requires serverAuthoritative=true and strict safe result/condition/question DTO shapes. At most one save attempt per process, including ambiguous failure; do not restart to retry without inspecting the outcome.
7. Relaunch natively: verify SecureStore session restoration and /me validation. Verify local logout, another-account switch and public cache retention/private cache clearing. Never use browser restoration as native proof.
8. Background/resume, airplane-mode offline/online, pull refresh, Android Back, each tab stack, maximum system font size and reduced motion. Confirm no clipped main CTA/buttons and offline text. No production push or data-entry editor exists yet.
9. Test registration/confirmation/resend/recovery only with a designated test email controlled by the operator. Password entry/change belongs to the operator. Verify actual email confirmation; do not infer it from a sent message.

For each live action record timestamp, method/path, status, requestId, schema outcome and whether data changed. Do not record credentials, bearer headers, private farm fields, answers or financial values. Stop and report any concrete backend defect; do not patch agro-bim-next from this mobile task.

| Required live check | Current result |
| --- | --- |
| GET /today | 200, requestId db38dfb1-1f99-4dfd-b94c-563b36d4f66f; runtime schema passed |
| Live guest render | Passed in 412×915 web QA preview through fixed same-origin development proxy |
| Genuine app login / GET /me | Pending operator sign-in |
| GET /me/farm-profile, /me/today, /me/feed | Pending operator sign-in |
| Identical-value profile PATCH | Pending; no mutation performed |
| One registered-free eligibility result | Pending; no result row created |
| Advanced finance denial | Pending with non-entitled account |
| Physical Android development build/device | Pending; no SDK/JDK/adb/device available here |

Web QA uses memory-only Auth and a localhost proxy for browser CORS. Its live render is evidence of the client/DTO/UI path, not native hardware or SecureStore behavior. Local tests cover 401 single refresh/retry, repeated rejection, storage failures, private cache invalidation, account switch, foreground timer and safe logging.
