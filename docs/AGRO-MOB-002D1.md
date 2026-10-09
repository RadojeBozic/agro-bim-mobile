# AGRO-MOB-002D1 — STIPS search and Home header

Verified 2026-10-09. Status: IMPLEMENTED — READY FOR DEVICE QA.
No commits, deployment or physical-device QA performed. Backend unchanged.

## Root cause and current production state

Confirmed mobile defect: STIPS list used the generic ErrorState directly, so a parsed API 404/not_found displayed “Traženi sadržaj nije pronađen.” A collection endpoint failure does not establish an empty search or missing product.

The reported systematic failure is not reproducible against current production: list, Paprika search and Paprika detail all return HTTP 200. No current route mismatch, query-name/encoding defect, authorization requirement or response-schema mismatch was found. Historical endpoint availability and the precise original on-device HTTP response cannot be reconstructed from the QA description alone. Missing deployment at that time is plausible but not proven; this report does not claim that historical cause as fact.

Production deployment is not currently missing. Existing backend commit 970a0d327a6da7ae8f13f16622c987d1edb83035 (“Add STIPS product location mobile API”) contains the endpoint. Neither repository needed a backend change or new deployment for this fix.

## Contract and exact live checks

Native config enforces https://agrobim.digital, adds /api/v1 once, and the screen requests /market/stips/products?limit=20&offset=0&q=<encoded trimmed text>.
Backend dispatch uses the same route and parameter q. Its search uses Serbian Latin case folding, accent removal and đ→dj. Mobile uses encodeURIComponent and trims submitted outer spaces.

Run in C:\xampp\htdocs\agro-bim-mobile:
    npx tsx tests/live-stips.ts

This uses the actual ApiClient and mobile Zod page(stipsProductSchema)/stipsDetailSchema contracts against production, with no login or fabricated live records. Actual checks:
- q=Paprika → 200, code paprika, 41 observations, requestId 4de8c5fb-de02-4ba6-8761-6b6d0c056031.
- submitted “ PAPRIKA ” → q=PAPRIKA → 200, paprika, 41 observations.
- q=Krastavac → 200, krastavac, 28 observations.
- q=Gro%C5%BE%C4%91e → 200, grozdje, 45 observations.
- q=grozdje → 200, grozdje, 45 observations.
- q=zzz-no-results → 200, items [], pagination {limit:20,offset:0,nextOffset:null}, requestId b12db777-f76a-4f03-8607-c56d5bd91d03.
- /market/stips/products/paprika?limit=1 → 200, matchingCount 41, actual source https://www.stips.minpolj.gov.rs/sites/default/files/2026-09/BiltenVP2339.pdf.

HTTP smoke URLs/commands for deployment or future diagnosis:
    curl.exe -i "https://agrobim.digital/api/v1/market/stips/products?limit=20&offset=0&q=Paprika"
    curl.exe -i "https://agrobim.digital/api/v1/market/stips/products?limit=20&offset=0&q=zzz-no-results"
    curl.exe -i "https://agrobim.digital/api/v1/market/stips/products/paprika?limit=1"

Expected: HTTP 200 with schemaVersion "1"; Paprika product present; empty search items []; detail prices and real source. The script also validates envelope server time, timezone, requestId and all DTO fields.

## Behavior changes

STIPS list API/server/contract failures now show “Podaci trenutno nisu dostupni. Pokušajte ponovo.” with the existing retry action. Network/timeout messages remain unchanged. Successful searches still render real products; genuine empty searches show “Za ovu pretragu trenutno nema rezultata.” Existing cached data and retry/refetch behavior are retained. Detail 404s remain valid missing-product states rather than being globally remapped.

Home root index suppresses its compact header through the existing TabStack's child Stack.Screen options. Full HomeBrand remains. The shared TabStack defaults stay intact for internal screens and any future non-root Home routes. Home opts into top safe-area content padding because its header is hidden; bottom safe-area handling is unchanged.

## Files changed

- src/screens/stips.tsx
- src/app/(tabs)/home/_layout.tsx
- src/screens/home.tsx
- src/components/ui.tsx (optional message, optional top inset, stack children)
- tests/content.test.tsx
- tests/live-stips.ts
- docs/AGRO-MOB-002D1.md

## Verification and remaining QA

Full mobile suite: 107 tests passed in 8 files; TypeScript and Expo lint passed; Expo Doctor 21/21; environment/EAS profiles and Android export passed. Git diff/status checked in mobile and backend; diff --check passed. Backend remained clean and was not modified.

Tests cover real-code navigation/success behavior, encoded/trimmed search, genuine empty results, endpoint 404/500/503 versus network feedback and suppression of false cached-empty messages, Home-only header suppression and retained internal compact header. The production smoke script proves actual contract and data normalization with real records.

An updated mobile build still needs physical Android QA: Paprika search, keyboard submit, network/retry, Home status-bar safe area and single brand identity, plus internal headers. Current server-side success does not prove the original installed APK issue is fixed on-device. If it persists in the updated build, capture that build's actual request URL/status/requestId for comparison; historical deployment cause remains unverified.

Browser preview additionally verified: Home has no compact header; Cenoteka retains its compact header; submitting Paprika renders the actual production product and its local price sample. No physical-device QA was performed.

