# AGRO-IOS-CRASH-004 — iOS diagnostic Build 2

## Scope

Local preparation only: version 1.0.0, iOS buildNumber 2. No EAS build or submission was started. Existing Android versionCode 8 and user changes are preserved. No Supabase settings or database changes.

## Startup path

package.json -> index.js -> Metro platform resolution:
- Android/web: src/diagnostics/entry.js -> original expo-router/entry.
- iOS: src/diagnostics/entry.ios.js -> install early handlers -> Expo registration -> DiagnosticRoot -> protected, deferred expo-router/build/qualified-entry import -> existing Router/routes/runtime.

The qualified App and renderRootComponent are the same modules used by installed Expo Router 57 entry-classic. These are internal integration points: recheck this entry when upgrading Expo Router/RN. Diagnostic code imports neither the application runtime nor auth configuration.

The iOS root has a React error boundary and an external report store. ErrorUtils covers the legacy JS exception pipeline; feature-detected RN$registerExceptionListener covers the installed RN C++ exception pipeline. Nonfatal errors and errors before a usable root registration continue to the original handler. Only the first handled fatal is intercepted. A subsequent fatal, including a broken diagnostic renderer, is delegated rather than silently swallowed.

The first report contains a bounded message, phase, diagnostic/build identifier and up to nine stack lines. Known public auth values, credential assignments, bearer/basic credentials, JWT/key-shaped strings, URLs and email addresses are redacted. Arbitrary objects/session/request bodies are not serialized. Reports remain in memory; no network upload, persistent storage or clipboard integration is added. Do not continue application work after a captured fatal.

## Tester procedure

Install the approved diagnostic Build 2 through TestFlight when it becomes available. Open normally. If the diagnostic screen appears, screenshot the identifier, phase, message and first stack lines. Scroll and take another screenshot if needed. Send screenshots with the device/iOS version and whether this was a fresh install or update. Close the app after capturing. The screen attempts to hide the native splash without depending on app initialization.

## Limits and fallback

Cannot intercept syntax/bytecode failures before this entry executes, native crashes, OOM/watchdog termination, unusable JS runtimes/renderers, or all native-direct fatal reports. React Native initialization before this entry's handlers/registration is also outside guaranteed coverage. A blank screen/crash is not proof that no JS exception occurred. This is temporary diagnostic handling, not a recovery mechanism or the root-cause fix.

If no diagnostic screen appears, Miroslav should send TestFlight feedback and the full Apple Analytics crash report for Build 2 with the exact reproduction time. If these still omit the JS message, someone with the phone can record its launch via Windows USB using pymobiledevice3 syslog live (Apple USB driver/service, unlocked phone and Trust required). This needs no Mac/Xcode and no access to the phone by the developer. Without either a renderable error or device logging/previously installed remote telemetry, code running after a native failure cannot retrieve that failure remotely. No telemetry library was added.

For a minified stack, retain matching bundle/source maps from the actual signed Build 2 job if available. The maps from local verification are not automatically valid for a separately generated EAS artifact. Do not use Build 1 maps or assume an export-generated map matches the Xcode archive.

## Local verification

- npm run typecheck: passed.
- npm run lint: passed without lint warnings.
- Targeted Vitest: 7 tests passed (redaction; legacy/native fatal pipelines; first-error retention/delegation; protected startup/fallback; generic platform entry; screenshot UI).
- Production iOS and Android Hermes exports with source maps: passed, in TEMP/agrobim-crash004-ios and TEMP/agrobim-crash004-android. These are local JS exports, not signed/native builds.
- Effective production Expo config: version 1.0.0, iOS com.agrobim.digital / buildNumber 2; Android versionCode 8.
- Native iPhone rendering and the original crash reproduction remain unverified until approved Build 2 is tested.