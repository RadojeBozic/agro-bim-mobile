# AGRO-MOB-002D — STIPS / Cenoteka detail exploration

Status: IMPLEMENTED — READY FOR DEVICE QA.
The backend addition must be deployed together with the mobile client before QA against the production API. No deployment, commit, push, EAS build, or physical-device QA was performed.

## 1. Architecture discovered

Both actual repositories were confirmed on clean main branches before changes:
- Backend: C:\xampp\htdocs\agro-bim-next
- Mobile: C:\xampp\htdocs\agro-bim-mobile

STIPS is a regional market-price domain: published market_reports and verified market_regional_observations joined to market_commodities. Cenoteka is a supplier-offer catalogue (Product → Variant → Package → Supplier offer → Revision). These prices have different meanings and are kept separate. The optional catalogue benchmark relationship is not exposed by the existing supplier product DTO; no name-based supplier/STIPS association was invented.

## 2. Real available granularity

Public RPC reads confirmed stored commodity codes/names, categories, city or district, optional named market, market type, variety/quality, packaging/weight/breed/form attributes, minimum/dominant/maximum/single fields, original currency/unit, verified timestamp, and report period/week/year/source/PDF URL.

Some verified observations have null dates. Published bulletin dates supply the reporting period; verification time is displayed separately. No average exists in this regional model. Missing source values stay absent.

The live local API returned Banana with 22 observations and 3 Beograd observations. Krastavac returned 28 observations and 3 Beograd records (Kvantaška pijaca, Kalenić, Skadarlija). These are smoke-test evidence, not hard-coded app records.

## 3. Reused endpoints and rules

Supplier list/detail remain /api/v1/cenoteka/products and /api/v1/cenoteka/products/:id. Existing /market/summary remains unchanged: its 12 representative STIPS rows cannot supply complete product-level exploration. Existing public_stips_reports/public_stips_observations RPCs and publication/verification rules are reused.

## 4. Additive backend API

- GET /api/v1/market/stips/products?limit=20&offset=0&q=...&category=...
- GET /api/v1/market/stips/products/:code?limit=20&offset=0&q=...

Public, no login requirement. Existing /api/v1 envelopes, rate limits, response validation, cache headers and sanitized errors apply. Identifiers and strict query objects are validated. Limit 1–50; offset 0–10000; search up to 120 characters. Product association uses exact commodity_code.

The service considers the 20 newest published bulletins and chooses the latest available reporting period per commodity in that window, retaining all public locations/variants in that period. Report membership is used instead of observation-date filtering, which would incorrectly drop real null-date rows. Reads are bounded to 20,000 rows and fail explicitly rather than silently truncating.

An active public commodity with no observations returns metadata and an empty array. Unknown codes return 404; bad identifiers/parameters return 400; database failures remain errors. Only explicit DTO fields leave the API; no evidence, staff notes, source quotes, user or farm data is returned. No schema, scraper, ingestion or monitoring change.

## 5. Mobile routes/screens

- /cenoteka: native STIPS product list and search, local sample price/context/period/category/freshness/count.
- /cenoteka/stips/[code]: native product and location-price detail.
- /cenoteka/suppliers: preserved supplier catalogue.
- /cenoteka/[id]: preserved supplier product detail.

All are in the existing Cenoteka tab stack with its index anchor. There is no new tab or competing stack.

## 6. Native flow

Cenoteka → choose real STIPS commodity → native detail → price cards by location/market → optional official source. Normal stack back returns to the list. Supplier offers remain accessible through “Ponude dobavljača”; existing Home and feed supplier links still reach the existing product detail.

## 7. Search/filter behavior

Submitted product search filters names. Detail search filters city/district, named market and market-type text for the selected commodity only. Case/Latin diacritic-insensitive matching; no city options are fabricated. A search resets the page offset. Lists and observations page 20 at a time. Detail search appears only when more than one real observation exists. No period selector or charts.

## 8. Price semantics

Minimum, dominant, maximum and single source prices remain separate nullable fields and labels. Original currency/unit, variants, quality, market type and attributes accompany each observation. No averages, conversions, national prices, cheapest-offer ranking or inferred missing observations. A list price is a single actual location sample, with its market/location and variant context shown.

## 9. Attribution

Each observation includes STIPS, reporting period, bulletin number/year, actual publication/verification dates where available, freshness and the report's real PDF/source URL. The existing ExternalLink abstraction renders “Otvori zvanični izvor” after native price content. Missing/unsafe links are omitted.

## 10. Verification

- Mobile full suite: 102 tests passed across 8 files, including all prior 94 tests.
- Mobile TypeScript and Expo lint: passed.
- Expo Doctor via npx expo-doctor@latest: 21/21 checks passed. The existing npm doctor script cannot resolve its bare expo-doctor executable; no dependency/config changes were made.
- Environment/identity/EAS profile checks: development, preview, production passed; com.agrobim.digital remains unchanged.
- Android export: passed.
- Backend mobile API + STIPS suites: 83 tests passed across 5 files.
- Backend TypeScript and production build: passed (existing deprecation warnings).
- Backend changed-file lint: passed. Repository-wide lint fails on existing widespread CRLF/formatting and other unrelated issues; no broad formatting rewrite.
- Real database-backed local HTTP smoke: list/detail, city search, pagination, empty search, 404 and 400 passed; verified real source PDF and published report dates.
- Browser preview: real Krastavac cards/search and supplier catalogue; back navigation; 320×800 and 360×800 without horizontal overflow. Existing Screen safe-area padding, vertical cards, wrapping text and minimum 48px actions retained.
- Git diff/status and diff --check inspected in both repositories; no commits.

New tests cover correct commodity association, latest period, null-date rows, original price roles, missing fields, search/paging, input validation, public access, no staff/private leaks, existing empty commodity versus missing/error, actual source opening, cached content/retry and routing. Development-proxy tests cover fixed upstream selection and route/origin rejection.

## 11. Remaining gaps and device QA

- Deploy the additive backend endpoints before using this mobile implementation against production.
- Data availability is limited to publicly verified observations in the 20-bulletin window. Unpublished/unverified/missing locations are intentionally absent.
- No universal supplier-product-to-STIPS association is exposed; supplier offers and STIPS products remain separately identified.
- Some source quality descriptions retain parser shorthand; it is shown verbatim rather than reinterpreted.
- Physical Android QA remains: increased system font scale, keyboard/search usability, long location names, bottom navigation/safe areas, offline/retry and source-browser return.
- No physical-device QA was claimed.

For local browser QA: run the backend on 127.0.0.1:18082, set AGROBIM_STIPS_LOCAL_QA=true in the shell running npm run web:qa. Only the restricted STIPS public routes use that fixed loopback backend; other allowed routes retain the official upstream. Native/production API configuration is unchanged.

## 12. Repositories modified

Backend: dispatch.server.ts plus stips-contracts.ts, stips.server.ts and stips.test.ts under src/lib/mobile-api.
Mobile: Cenoteka index/new nested routes, src/screens/stips.tsx, src/stips.ts, copied portable STIPS contracts, content/proxy tests, test-file discovery and local QA proxy. This report is saved in both repos.

## 13. Final status

IMPLEMENTED — READY FOR DEVICE QA, following deployment of the paired backend endpoint addition. No commits.
