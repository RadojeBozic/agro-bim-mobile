# AGRO-MOB-001 delivery report

2026-10-06. The separate mobile foundation is implemented and locally validated. **The requested genuine authenticated production smoke and physical Android QA are not yet completed.** No test account was signed in, no profile PATCH was sent, and no eligibility row was created. This is not a claim of complete production/device acceptance.

| # | Requested item | Delivery/evidence |
| --- | --- | --- |
| 1 | Repository | C:/xampp/htdocs/agro-bim-mobile, separate Git repository, main branch. agro-bim-next was read only for contracts/assets/public Auth config; no backend edits. |
| 2 | Versions | Expo 57.0.27, RN 0.86.3, React 19.2.3, TypeScript 6.0.3. SDK-compatible installs and Expo Doctor passed. |
| 3 | Structure | src/app Router layouts; auth; api contracts; core client/session/storage/errors/logger; components; config; QA; screens; theme/i18n/navigation; tests; scripts; docs; brand asset. |
| 4 | Identity | AgroBIM Digital, com.agrobim.digital candidate, version 1.0.0/versionCode 1, centralized identity JSON. No Play registration. |
| 5 | Environments | development, preview, production; production API fixed to https://agrobim.digital/api/v1. Ignored local public Auth config; example has no key. |
| 6 | Auth/session | Guest-first login/register/resend/recovery/reset; restore; deduplicated /me validation; one refresh coordinator; foreground-only timer; local-device logout; definitive rejection signs out; transient validation keeps public mode and retry. |
| 7 | Secure storage | Expo SecureStore device-only native adapter; explicit failure state. No AsyncStorage tokens, no persisted query cache. Web uses memory only. Native persistence still needs device QA. |
| 8 | API client | Portable runtime schemas, private-only bearer, response request IDs, stable errors, redirect rejection, abort/15s timeout, bounded GET retry/Retry-After, one 401 refresh/retry, late-account-response protection. |
| 9 | TanStack Query | 60s stale time/5m memory GC; bounded retry; app focus and NetInfo online state; pull-refresh and signals; private query cancel/removal on logout/account switch; public cache retained. |
| 10 | Navigation | Exactly five approved tabs, each with its stack, history Back behavior and home/root deep-link anchors. Typed target mapping includes programme, product/offer, financing, market and feed item; domain detail routes are honest placeholders. |
| 11 | Guest shell | Native-style semantic green/light surfaces, approved brand mark, loading/empty/error/offline states; Početna real Today sections; farm-tab exact login/register CTA. Guest launch/navigation/form visually checked at 412×915 web viewport. |
| 12 | Signed-in shell | /me/today personalized home, /me/feed farm placeholder and safe account UI; enabled only after active-account validation. Mocked renderer/lifecycle coverage; genuine session pending. |
| 13 | Account/capabilities | Safe /me name/verification/farm/access and capability booleans; reusable capability hook/GatedAction; no screen-local trial logic, subscription flow or deletion. |
| 14 | Public Today live smoke | 200, schema valid, requestId db38dfb1-1f99-4dfd-b94c-563b36d4f66f. Counts: information 12/programmes 6/Cenoteka 6/financing 5. Live source content rendered through same-origin fixed-upstream localhost web QA middleware. Native direct production path still needs device test. |
| 15 | Authenticated live smoke | Pending real test-account login through app. Harness ready for /me, /me/farm-profile, /me/today and /me/feed, retaining status/requestId without logging payloads. |
| 16 | Profile PATCH smoke | Pending; no mutation. Harness fetches existing values/version, refuses missing/incompatible/normalizing changes, repeats identical basic values once, compares returned values. |
| 17 | Registered-free eligibility | Pending; no row created. Harness requires free capability and non-advanced account, fetches approved context, submits one empty-answer server check, requires server-authoritative strict safe DTO. No invented facts or client calculation. |
| 18 | Financing denial | Pending non-entitled account. Harness records expected 403 capability_required/trial_expired as valid gate; does not pretend an entitled 200 is denial proof. |
| 19 | Deep links | Dev custom/generated schemes only. PKCE/token-hash callback handlers and production HTTPS callback route; strips Router token params and never logs links. Final Android verified association/fingerprints and Supabase allowlist remain pending owner setup. |
| 20 | Accessibility | Roles/labels, default text scaling, 48-point buttons, wrapping tab labels and font-scale-adjusted bar height, text status indicators, reduced-motion stack setting. Real Android large-system-font and screen-reader QA pending. |
| 21 | Tests | 46 passed across four suites: API, storage/session, logger, contracts; mocked auth lifecycle/rendering; environment/secret-key rejection. Browser fetch receiver regression added from live QA. Tests do not claim genuine authentication or native storage evidence. |
| 22 | Type/lint/build | TypeScript and lint pass; Expo Doctor 21/21; development/preview/production config and EAS profile validator pass; Android development export/native prebuild and preview/production Hermes exports pass. No signed binary/store build. |
| 23 | Physical device | Not performed: adb/JDK/Android SDK unavailable and no device/test-account handoff received. Cold start/restore/background/offline/font/device login checklist in QA.md. |
| 24 | EAS readiness | development internal dev-client APK, preview internal APK, production AAB profiles. Owner login/project linkage, public environment values and signing ownership required before cloud build. No EAS cloud resources, keys or submissions created. |
| 25 | Files | See FILES.md for repository inventory. Approved asset provenance/contracts hash in CONTRACTS.md; setup/build/limits in README and QA procedure in QA.md. |
| 26 | Git | Normal foundation commit on main: AGRO-MOB-001: Expo foundation, auth, navigation and mobile API client. Final delivery message records commit hash/status; no remote push/history rewrite. Local .env, native output and bundles are ignored. |
| 27 | Backend issues | No concrete backend defect found in the read-only public API smoke. Browser CORS is handled only for supplemental localhost QA. The discovered browser fetch binding and text-node issues were fixed in mobile code. Backend remains unchanged by this task. |
| 28 | Next step | First close native Android/genuine-account GET/PATCH/one-check/denial QA; then build public programmes list/detail and registered-free eligibility UI against existing contracts. |

The npm dependency audit retains 29 findings (18 high/11 moderate) after compatible fixes, through Expo/RN tooling and Router dependencies. Forced fixes suggest incompatible SDK changes. This remains a release risk requiring supported upstream remediation/review; it is not hidden by the successful build checks.

Public read-only validation and UI preview used no GitHub credential. No business Supabase Data API calls, production profile changes, saved checks, pushes, Play publishing or backend patches occurred.
