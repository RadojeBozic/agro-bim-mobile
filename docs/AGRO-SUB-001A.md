# AGRO-SUB-001A — Mobile integration and rollout

Preview and production EAS environments now contain EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY from the working local environment. Only public publishable/anon keys are accepted; private keys are rejected. Values are not stored in source. Both cloud environments were retrieved and validated; public Supabase auth settings returned HTTP 200.

app.config.ts shares the runtime validator and rejects missing auth configuration during preview/production EAS builds. Guest development behavior and session logic remain unchanged. eas.json selects the existing HTTPS callback for both release profiles. Android identity remains com.agrobim.digital.

The typed entitlementsSchema and useEntitlements hook read GET /api/v1/me/entitlements only for signed-in users. Cache keys use the existing private/user scope. The backend remains the authority; no mobile package rules, pricing, upgrade buttons or subscription screens were added.

Verification: 161 tests passed (10 files), TypeScript and lint passed, Expo Doctor 21/21, development/preview/production environment checks passed, and Android export passed. Git diff/status were reviewed; no commits.

Before device QA:
1. Apply backend migration 0031 through the existing deployment process.
2. Deploy backend code and verify the private endpoint with separate accounts.
3. Build and install a fresh preview APK; verify authentication and public/free flows.

No hosted migration, backend deployment, binary build or physical-device login test was performed. The installed APK cannot acquire new build-time values retroactively.

The full 17-section report is in C:\xampp\htdocs\agro-bim-next\docs\AGRO-SUB-001A.md.
