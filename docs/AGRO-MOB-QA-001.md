# AGRO-MOB-QA-001 acceptance record

Date: 2026-10-06. Foundation: af992c9. Repository: C:\xampp\htdocs\agro-bim-mobile. Backend: https://agrobim.digital. Acceptance remains **incomplete**.

## Live evidence and limits

The operator signed in using the app's normal Supabase flow. No credentials or tokens were read, copied, displayed or supplied to a standalone HTTP client. The observed surface was the Expo web app at localhost:18081, with its existing fixed-upstream development proxy. This proves genuine-session API integration in the shared application client; it does not prove native login, SecureStore or physical-device behavior.

| Operation | Outcome | Request ID |
|---|---|---|
| GET /api/v1/me | 200; DTO schema valid | 2cc0b4a4-5bf7-40e6-a632-6ae32046360d |
| GET /api/v1/me/farm-profile | 200; DTO schema valid | eb651ab8-2468-4f10-a9e8-5f26d4db13d0 |
| GET /api/v1/me/today | 200; DTO schema valid | 92818452-f3e3-4548-b4ec-5e909c002552 |
| GET /api/v1/me/feed | 200; DTO schema valid | 357da918-94da-4da1-9bdf-9c4308b47e7c |
| PATCH /api/v1/me/farm-profile | 200; current version and identical basic values submitted; returned basic values unchanged | 63837d90-27f8-4e2a-8d60-0838aeec037c |
| GET /api/v1/me/financing-analysis | 200; account has active advanced trial; denial not tested | c2d97e49-841c-4ab3-9f6a-7ca8433f4412 |

Required DTO fields are present because validation succeeded. Ordinary response schemas strip unknown fields, so absence of forbidden fields in the **raw live payload** is not proved by this smoke. Existing backend tests verify safe projections and no internal error details. The browser proxy sets Cache-Control: no-store; upstream security/cache headers are not exposed by the current harness. Do not label the proxy's headers as observed backend headers.

PATCH submitted only existing basicProfile fields and the version fetched immediately before the request. Activities, capacities and intent were omitted. No second PATCH was sent. Successful current-version handling is proved; stale-version rejection, full unrelated-field equality and database record cardinality were not independently measured live. Existing isolated backend tests cover concurrency and ownership. The account's active trial means this PATCH alone does not establish trial-independent edit access.

The account screen confirmed an active financing trial, basic eligibility enabled and financing analysis enabled. Exactly **zero** eligibility rows were created. The QA guard correctly refuses this account for the no-trial acceptance check. An existing non-entitled account, using normal logout/login, is needed before the one allowed POST. No production entitlements were changed.

Logout was exercised through the app. Public Today remained available; the farm tab showed the guest login/registration prompt and no previous farm content. A second-account login, native storage deletion and process-restart restore remain unverified. Web auth storage is deliberately memory-only; web reload cannot prove SecureStore persistence. Foreground/background and 401 recovery were verified by automated tests, not physical-device observation.

## Completion matrix

| Required report item | Status |
|---|---|
| 1. Account/auth method | Operator-provided registered test account; normal app Supabase login; active financing trial |
| 2. Genuine login | Operator confirmed; signed-in farm context and genuine-session GETs observed on web; native pending |
| 3. Session restore | Automated coverage passes; physical cold restart pending |
| 4. GET /me | 200, valid safe DTO contract |
| 5. GET /me/farm-profile | 200, valid DTO |
| 6. Identical PATCH | 200, identical basic fields confirmed; further live concurrency/cardinality evidence pending |
| 7. GET /me/today | 200, valid DTO |
| 8. GET /me/feed | 200, valid DTO |
| 9. Registered-free eligibility | Pending existing no-trial account; zero rows created |
| 10. Advanced denial | Pending non-entitled account; current account correctly receives 200 |
| 11. Trial expiry | Live pending; existing backend isolated tests passed |
| 12. Logout/account switch | Web logout observed; automated cleanup/isolation passes; second live account/native pending |
| 13. Android QA | Samsung, Android 16, One UI 8.0 supplied by operator; exact model and installed build/device observations pending |
| 14. Native host | Hardened to canonical HTTPS host in every stage; automated regression passes; device traffic observation pending |
| 15. Dependency triage | Four root advisories; all 29 affected packages classified in DEPENDENCY-TRIAGE.md |
| 16. Dependency fixes | None; no compatible safe resolution identified; no forced changes |
| 17. Open findings | 18 high / 11 moderate remain; detailed paths and fix constraints documented |
| 18. Expo Doctor | 21/21 passed |
| 19. Mobile tests | 48/48, four files; existing backend focused tests 42/42, three files |
| 20. TS/lint/config/build | TS and lint passed; development/preview/production configs passed; preview/production Android Hermes exports passed (1394 modules, 3.7 MB) |
| 21. Security/logging | Source review found only sanitized logger; private-only bearer, redirect:error, cache isolation and guest separation covered; raw live field audit pending |
| 22. Files changed | src/config/environment.ts, tests/environment.test.ts, tests/ui.test.tsx, docs/AGRO-MOB-QA-001.md, docs/DEPENDENCY-TRIAGE.md, docs/ANDROID-DEVICE-QA.md |
| 23. Git | main; normal QA commit recorded in final handoff; no push while acceptance remains pending |
| 24. Fully accepted? | No |
| 25. Blockers | No-trial account; physical build/install/lifecycle evidence; absent local Java/SDK/ADB; EAS project ownership/link/signing not finalized |
| 26. Next step | Finish controlled no-trial smoke, then development APK and Samsung acceptance; defer product expansion |

## Hardening and native review

Native API configuration now rejects localhost, emulator loopback and any alternate origin in development, preview and production. The web QA proxy remains available only to the web surface. Requests use redirect:error. No dependency versions or backend files were changed.

Generated Android project: package com.agrobim.digital, min SDK 24, compile/target SDK 36, build tools 36.0.0, NDK 27.1.12297006. Matches SDK 57/RN 0.86.3. No native compile was possible without Java/SDK.

Development manifest includes INTERNET, SYSTEM_ALERT_WINDOW, VIBRATE and legacy READ/WRITE_EXTERNAL_STORAGE limited to API <=32. No permissions were added in this task. Legacy storage is ineffective on Android 16; overlay is development-tooling related. Review final merged release permissions before distribution and remove unused permissions through Expo config, not generated files.

Main application has allowBackup=true and SecureStore backup/data-extraction exclusions supplied by the native module, including Android 12+ cloud backup and device transfer. Debug/debugOptimized manifests permit cleartext for Metro; release main manifest does not enable it. Native API host hardening prevents use of that permission for the QA browser proxy.

Development deep links are agrobim-dev and exp+agro-bim-mobile. Verified HTTPS App Links remain pending. Generated release signing uses the template debug configuration: this is not Play signing readiness. No signing credentials were read or finalized. The dev-client network inspector is enabled; do not capture/export headers or private payloads while testing. Reviewed app source does not log access/refresh tokens, passwords, authorization, farm payloads, answers or financial data.

Automated coverage includes restored-session validation, logout cleanup, private/public cache separation, user-switch generation isolation, late response/refresh races, one refresh/retry on 401, repeated 401 signed-out fallback, paused background refresh and foreground resume. Two new regressions cover native host invariance and advanced gating while free farm content remains usable. No live 401 was fabricated.

Native generation recheck: expo prebuild --platform android --no-install succeeded with no package.json changes. Gradle --version could not start: JAVA_HOME is unset and java is absent from PATH. No APK compile was claimed.
