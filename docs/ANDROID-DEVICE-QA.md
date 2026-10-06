# Samsung Android 16 / One UI 8.0 acceptance handoff

Target supplied by operator: Samsung, Android 16, One UI 8.0. Exact model is still to be recorded. No physical-device actions, installation or cold launch have been observed. Java, Android SDK and adb were not found on this computer. Bundle export is not an APK/native compile.

## Development build preparation

expo-dev-client and the EAS development/internal APK profile already exist. SDK 57 stays unchanged. The existing EAS login was confirmed without reading its token. There is no owner/projectId in app config yet; the developer must select the intended Expo owner/project and development signing ownership rather than reuse unspecified production/Play signing. No cloud build has been submitted.

Run from PowerShell in C:\xampp\htdocs\agro-bim-mobile:

```powershell
npx eas-cli@latest project:init
```

Select the approved owner and existing project, or create the named mobile project if authorized by its owner. EAS project initialization links extra.eas.projectId; review that local change. Verify the development environment has the **public** Supabase URL/publishable key from the existing app config. Never supply service-role keys or session tokens. The ignored local .env must not be assumed to be uploaded to EAS.

Then build with the intended development signing credentials:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = 'https://agrobim.digital'
$env:EXPO_PUBLIC_APP_ENV = 'development'
$env:EXPO_PUBLIC_ENABLE_QA = 'true'
$env:EXPO_PUBLIC_AUTH_CALLBACK_URL = 'agrobim-dev://auth/callback'
npx eas-cli@latest build --platform android --profile development
```

EAS cloud compilation does not require local Java/Android SDK/ADB. On the Samsung, open the completed build's installation URL/QR and install its APK through the operator's normal device prompts. No Play Store publication. Start the development server with the same environment variables above, plus the existing public Supabase config:

```powershell
npx expo start --dev-client --lan
```

Connect phone and computer to the same Wi-Fi and open this Metro project from the development client. If Wi-Fi routing is blocked, use the USB/ADB alternative below. Metro traffic can be local HTTP; **business API traffic must remain https://agrobim.digital/api/v1 directly**. Do not use npm run web:qa or localhost:18081 as the native API origin. Native host hardening rejects such a configuration.

## Exact ADB/local compile setup

1. Install [Android SDK Platform-Tools for Windows](https://developer.android.com/tools/releases/platform-tools), or Android Studio → SDK Manager → SDK Tools → Android SDK Platform-Tools. Accept vendor licenses yourself. Standalone platform-tools is enough for USB install/debug; it is not enough for native compilation.
2. For local compilation, install Android Studio with JDK 17, Android SDK Platform 36, Build-Tools 36.0.0 and NDK 27.1.12297006. Set ANDROID_HOME to the actual SDK directory and JAVA_HOME to the installed JDK. Keep the app's Gradle wrapper.
3. On the Samsung, enable Developer options and USB debugging yourself, connect a data-capable USB cable, and approve the computer's RSA prompt yourself. Windows may require the official Samsung USB driver. Do not disable device security protections to work around installation restrictions.
4. Verify connectivity with the actual platform-tools path; default Android Studio install uses:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" version
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices -l
```

The phone must show device, not unauthorized/offline. Do not export device identifiers unnecessarily. For USB Metro use:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:8081 tcp:8081
npx expo start --dev-client --localhost
```

For local build/install after full SDK/JDK setup:

```powershell
npx expo run:android --device
```

This is a development build, not production signing. No global force upgrades are needed. [Android device setup reference](https://developer.android.com/studio/run/device) and [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/) explain both paths.

## Device acceptance record

Record model, Android/One UI version, installed APK/build ID and commit. Mark each item only after observing it on the phone:

- Install; cold launch; guest home; all five bottom tabs; public Today.
- Normal Supabase login; signed-in home and farm placeholder; private /me, /me/farm-profile, /me/today and /me/feed QA reads.
- Force-close via Android app controls, reopen and confirm restored session/farm context. Do not clear app storage to simulate a normal restart.
- Background for several minutes; foreground; repeat after the normal token expiry interval. Verify no refresh loop or crash. Automated 401 tests cover fallback; do not paste/fabricate tokens to force a live failure.
- Toggle airplane mode offline → online; verify clear offline/retry state and recovery.
- Increase Android font size; inspect tab labels/buttons/content, then restore the original setting.
- Android Back through detail/QA/account stacks and tabs; verify predictable navigation.
- Use an existing trial-not-started or expired account for exactly one eligibility POST and advanced denial. Do not change production entitlements. Record the saved result/request ID privately to prevent repeats across app restarts. If a prior POST had ambiguous success, verify before any retry.
- Logout; confirm account and farm data disappear, public content remains usable and private QA is inaccessible. Restart and confirm no restored account. Sign in normally again; if switching accounts, confirm no old farm/feed content flashes.
- Verify native request destination is https://agrobim.digital with no redirect or web proxy. Inspect only safe method/path/status/header metadata; do not export network logs containing authorization or payloads.

PATCH already succeeded once during browser smoke. Do not repeat it solely to collect another screenshot. Exactly zero eligibility rows have been created at this handoff. Native SecureStore restart/removal, physical lifecycle/font/Back/network and account-switch results remain pending.
