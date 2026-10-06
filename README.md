# AgroBIM Digital mobile

AGRO-MOB-001 foundation for a separate Android application. Guest content stays available without login. React Native screens consume AgroBIM's versioned API; Supabase is used only for Auth. Full domain screens, push notifications, Moj Agro plan and Evidencija proizvodnje are outside this phase.

Implementation and local validation are complete. Real-account authenticated production smoke and physical-device QA are still pending. See [completion report](docs/AGRO-MOB-001.md) and [QA procedure](docs/QA.md).

## Toolchain and identity

Created using current `create-expo-app` blank TypeScript workflow, then Expo-compatible Router/native dependencies. Expo 57.0.27, React Native 0.86.3, React 19.2.3, TypeScript 6.0.3, TanStack Query 5, Supabase JS 2, Zod 3. Versions are locked in package-lock.json. The [Expo SDK 57 compatibility table](https://docs.expo.dev/versions/v57.0.0/) supports this combination and Node >=22.13.

Validated with Node 22.23.3 and npm 10.9.9. Use npm and commit package-lock.json. Identity is centralized in `src/config/identity.json`: AgroBIM Digital, slug agro-bim-mobile, candidate package com.agrobim.digital, version 1.0.0, versionCode 1. No Play registration or submission has occurred. Development and preview currently use the same candidate package and replace each other when installed; change centrally if parallel installs are needed.

## Install and run

```powershell
npm ci
Copy-Item .env.example .env
# Fill only the existing project's public Supabase URL and publishable/anon key.
npm start
```

`npm start` launches Metro for an installed development build. Expo Go is not the validation target. With Android SDK/JDK and USB debugging available, use `npm run android` to generate/build/install a debug development client. Generated android/ios folders are ignored and should be regenerated from app.config.ts; never edit them as the source of truth.

Web is supplemental UI QA, with memory-only Auth storage and no native session-restoration equivalence:

```powershell
npm run web:qa
# Open http://localhost:18081
```

Production APIs do not provide browser CORS for localhost. The QA command enables same-origin Metro middleware with a fixed https://agrobim.digital upstream and a restricted endpoint allowlist. It forwards no cookies, has a 32 KiB body limit, never logs payloads/tokens, and binds Metro to localhost. Native builds and normal production exports do not enable this middleware. `npm run web` has no proxy and may show a friendly network error when the browser blocks production CORS.

## Environments

All EXPO_PUBLIC values are embedded in the app and must be public. Never supply a Supabase service-role/secret key, GitHub credential, signing password or other secret. .env is ignored; .env.example contains no keys. Runtime config rejects secret/service-role Auth keys.

| Variable | Purpose |
| --- | --- |
| EXPO_PUBLIC_APP_ENV | development / preview / production |
| EXPO_PUBLIC_API_BASE_URL | Origin only; production must be https://agrobim.digital. The client appends /api/v1. |
| EXPO_PUBLIC_SUPABASE_URL | Existing AgroBIM Supabase Auth project URL |
| EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable or legacy anon key only |
| EXPO_PUBLIC_AUTH_CALLBACK_URL | Development: agrobim-dev://auth/callback; preview/production: https://agrobim.digital/mobile/auth/callback |
| EXPO_PUBLIC_ENABLE_QA | true only for controlled non-production QA; production always disables it |

Lovable/redirect hosts are rejected. HTTP is allowed only for explicit development loopback hosts. Preview can target the production API or a genuine configured staging HTTPS API; no staging backend was invented. EAS profile-specific variables override local values, but the owner must provide the public Supabase variables and HTTPS callback in the matching EAS environment before builds.

## Auth and contracts

Login, registration, confirmation resend, recovery request and password-update screens use Supabase Auth. An account is considered signed in for private UI only after GET /api/v1/me validates it. Session/account rejection clears private queries and keeps the public shell usable. Transient validation failure retains the local session and offers retry. Logout uses scope local so other devices remain signed in.

Native session/PKCE state uses an Expo SecureStore adapter (device-only unlocked keychain accessibility). Storage failure clears active private UI and shows a stable message; no AsyncStorage token storage or persisted query cache exists. Web QA deliberately uses memory only. SecureStore failure is not silently downgraded to plaintext storage.

Foreground refresh and a foreground-only interval share one refresh coordinator. Automatic SDK refresh is disabled; backgrounding stops the interval. SDK 2.117.2 provides its own coordination, so the deprecated processLock option is omitted. Private API 401 causes one refresh and one retry; repeat rejection signs out. Responses arriving after an account switch are rejected. GET has one bounded transport retry for 429/502/503/504; Retry-After up to 30s can be honored automatically, longer delays are surfaced. Mutations have no transport retries; only an auth-boundary 401 can be retried once after refresh.

Portable Zod DTO/input schemas are vendored in `src/api/contracts.ts`; provenance is in [contracts](docs/CONTRACTS.md). No database types, Supabase business-table reads, trial business rules or server eligibility calculations are copied. The API validates envelopes and DTOs, preserves request IDs, supports AbortController and 15-second timeouts, and maps errors to Serbian/English friendly copy without internal details.

## Redirect setup still required

The Supabase owner must allowlist development callback and its recovery query variant. PKCE requires the request's verifier to be on the same app/device; token-hash email templates can support cross-device verification when configured. No Auth dashboard settings were changed here.

Custom schemes and the generated Expo dev-client scheme are development only. Preview/production have an HTTPS callback route foundation, but verified App Links are not finished: configure Android intent filters, the public callback landing route/association file and final release-signing SHA-256 fingerprints when signing ownership is decided. No certificate fingerprint is fabricated. Email callback end-to-end behavior remains pending that setup and a real account.

## UI and server state

Five tabs: Početna, Za moje gazdinstvo, Podsticaji, Cenoteka, Više. Each has its own stack; tab back behavior uses history. Guest home renders live Today sections. Signed-in home/feed/account use backend-safe DTOs and capability booleans. Other domain screens honestly show Uskoro. QA controls require a signed-in state and explicit non-production flag; direct production QA routing redirects home.

Semantic light-theme tokens, approved existing AgroBIM mark, splash/icon placeholder, reusable loading/empty/error/offline/session/gated states, 48-point minimum buttons, accessible labels/roles, scalable text/tab labels and reduced-motion stack transitions are provided. Serbian Latin is default; English translations are ready; German can be added to the same catalog. Source-origin DTO content remains unchanged.

TanStack Query has 60s stale time, 5m in-memory garbage collection, bounded network retries, foreground/connectivity integration, cancellation and pull-to-refresh. Public cache survives logout; private queries are cancelled/removed on logout/account switch. Refresh timestamps are visible. Full offline caching is not included.

## Validate and build

```powershell
npm test
npm run typecheck
npm run lint
npm run format:check
npx expo-doctor
npm run config
npm run config:check
npm run smoke:public
npx expo prebuild --platform android --no-install
npm run export:android
npm run build:development
npm run build:preview
npm run build:production
```

The final build command creates an AAB; it does not submit it. For preview/production local sanity, set EXPO_PUBLIC_APP_ENV to the corresponding stage, EXPO_PUBLIC_API_BASE_URL=https://agrobim.digital, EXPO_PUBLIC_AUTH_CALLBACK_URL=https://agrobim.digital/mobile/auth/callback and EXPO_PUBLIC_ENABLE_QA=false before export. Do not reuse a development callback in production.

EAS development uses an internal APK/dev client, preview an internal APK, production an AAB. Before the first cloud build, the AgroBIM owner must log in to its intended Expo organization, link/create its EAS project, set the public environment values and choose managed/local Android signing ownership. No EAS owner/project ID or signing credentials have been invented or committed. Keep the upload keystore and future Play app-signing ownership under AgroBIM's control; never commit keystores/passwords. No cloud build, store submission or signed APK has been produced on this host (no JDK/Android SDK/device).

## Known limits

46 automated tests pass; they validate client, lifecycle and mocked native rendering, not a genuine device/login. Authenticated GET/PATCH/eligibility/financing-denial production smoke remains pending test-account sign-in. The exact procedure avoids meaningful profile edits and limits saved eligibility to one action per process.

Dependency audit still reports 29 findings (18 high, 11 moderate) through the Expo/RN dependency tree after compatible npm audit fixes. Findings include braces, node-forge, decode-uri-component and uuid. Most propagate through build tooling; Router's query-string chain is also included. This is an unresolved dependency risk, not a clean security audit. npm's forced suggestions include an incompatible Expo downgrade/SDK change, so no force fix was applied. Review supported upstream fixes before release.

Next: close real Android/authenticated production QA, then implement the public programmes list/detail and registered-free eligibility UI using the existing contracts.
