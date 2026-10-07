# AGRO-MOB-002B — Content Linking & Functional Depth

Status: IMPLEMENTED — READY FOR DEVICE QA
Date: 2026-10-07 (Europe/Belgrade)

## Architecture discovered

The active chat workspace is the web checkout. The implementation belongs to the existing mobile repository at C:\xampp\htdocs\agro-bim-mobile; it was clean before editing. No web/backend files were changed, and no commits were made.

Mobile uses Expo SDK 57, Expo Router, five tab navigators and one existing Stack per tab, TanStack Query, a shared ApiClient, Zod API v1 DTOs, and the existing authentication/session coordinator. Programme, Cenoteka, financing, market and feed detail routes existed as placeholders. Existing targetHref mappings already carried validated UUIDs/product references.

Reused the tab stacks and added index anchors for direct detail entry. Non-route implementation lives in src/screens and src/components. Public reads retain public cache keys; authenticated reads use private/user-scoped keys and the existing cancellation/session protections. No new navigation stack or entitlement enforcement was added.

## Existing endpoints reused

All are GET /api/v1 endpoints using the existing unmodified runtime contracts:

- /today and /me/today: Home and current public information.
- /programmes and /programmes/:id: published support programmes.
- /financing/products and /financing/products/:id: public financial products.
- /cenoteka/products and /cenoteka/products/:id: product records with public offer breakdowns.
- /market/summary: exchange and STIPS records.
- /me/farm-profile: owner-scoped basic profile, activities, capacities and investment intent.
- /me/feed: paged owner-scoped personalized information and detail-key lookup.

API dispatch and DTO mapping were inspected in the neighboring web repository. Public programme source verification, publication filtering, financing instruments and public Cenoteka offer shaping remain backend responsibilities. No database imports or changed backend contracts.

## Screens and routes

- Home: actionable real targets, preserved text wrapping, private deadlines section, farm shortcut, source fallback links, market overview access and empty/unavailable states.
- /programmes and /programmes/[id]: paged list, useful detail fields, dates, support/purpose, supplied document labels/notes and official source.
- /cenoteka and /cenoteka/[id]: paged product list with categories; variant/supplier/package/price basis, VAT, availability, comparable normalized prices, public notes and source/check metadata.
- /more/financing: new paged list; existing /more/financing/[id] now shows instruments, providers, amounts, rates, terms, purposes, applicants, collateral, fees, documentation and attribution when supplied.
- /home/information/[key]: new public native detail for currently surfaced information with real summary data.
- /farm/feed/[key]: authenticated native information detail and relevance messages.
- /farm: useful private profile information and linked feed, plus account/programme/financing access.
- /more/market: real exchange/STIPS records, metadata and empty/error states.
- /more: account, financing, market and farm destinations; explicit external links to existing /kalkulator-finansiranja and /proizvodnja web routes. Production may require its own web login.
- /more/account: user-friendly account/profile information and farm access, replacing raw capability lists.
- Existing QA screen remains independently guarded; menu entries require enabled QA and a signed-in session. Production disables QA even if the flag is true.

All catalogs have loading, Serbian empty, retryable request-error and invalid/missing-record states, refresh controls and previous/next pagination. Missing fields are omitted; zero values remain visible.

## What is clickable

Programme, financing, Cenoteka product/offer, market and authenticated feed targets use existing targetHref conventions. Offers open their actual parent product's offer breakdown. Public feed-style entries with useful summary data open the public information detail, avoiding private routes. An available official HTTP(S) source is an external link; invalid targets and items without a useful destination stay plain text.

## Cenoteka result: CONNECTED

Read-only production verification returned HTTP 200 for the product list: 20 records on the first page, nextOffset=20. A real product detail also returned HTTP 200 and validated against productSchema. The Home payload returned six real Cenoteka offers. There is no missing mobile Cenoteka endpoint. No fabricated records were introduced.

## Verification

- npm test: 83 tests passed across 7 files, including existing auth/session/Home-refresh/password/navigation coverage.
- Added coverage: actual Home button presses and UUID routing; inert invalid targets; public/private information destinations; valid detail endpoints; invalid/multiple/missing IDs; 404 and network states; empty/loading states; catalog pagination; feed-key pagination; private route guards; useful real detail/profile fields; safe external URLs; menu/direct-route QA guards; actual environment QA rules.
- npm run typecheck: passed after regenerating typed routes with SDK 57 Expo CLI.
- npm run lint: passed.
- npx expo-doctor: all 21 checks passed. The pre-existing npm run doctor script invokes a non-installed bare expo-doctor binary, so Doctor was executed through npx as specified in AGENTS.md.
- npm run config:check: development, preview, production and EAS profiles passed.
- npm run export:android: passed; Hermes Android bundle exported to ignored dist/.
- Expanded npm run smoke:public: /today HTTP 200 (12 information, 6 programmes, 6 offers, 5 financing); /programmes HTTP 200 (7 records); /financing/products HTTP 200 (5); /cenoteka/products HTTP 200 (20 plus next page). One existing detail from each catalog returned HTTP 200.
- git diff --check: passed.
- No physical-device run, signed-in live API mutation or new EAS build was performed.

## Remaining content limitations

- No individual public information endpoint exists; public detail resolves the key in the current /today information section. Removed/expired/rotated-out records show not-found.
- No individual private feed endpoint exists; detail resolves a real key through paged /me/feed reads. This may require several requests; malformed/non-advancing pagination fails gracefully.
- Calculator and production remain authoritative web experiences. Their backend does not expose an equivalent mobile read contract in the API dispatcher inspected here. The external browser uses its own web session.
- Programme documents currently expose labels/notes rather than downloadable URLs; no URLs or eligibility fields were invented.
- Private profile/feed display is covered by mocked UI and existing transport/session tests; authenticated rendering, safe-area behavior, source-link launching and list/detail/back/tab history still need Android physical-device QA.

## Device QA checklist

1. Open each actionable Home item and check its destination and readable wrapping.
2. Open Podsticaji list/detail, financing through Više, and Cenoteka list/detail; test back and tab history.
3. Test Cenoteka next/previous page, refresh and source links.
4. Sign in, inspect farm/profile fields, open personalized feed items and sign out.
5. Check invalid UUID/deleted record, network failure/retry and true empty responses.
6. Open calculator/production web links and verify the separate web-login behavior.
7. Verify QA is hidden with the flag disabled and direct QA navigation is guarded.
