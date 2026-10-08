# AGRO-MOB-002C — Home, Brand & Legal Navigation

Status: IMPLEMENTED — READY FOR DEVICE QA
Date: 2026-10-08 (Europe/Belgrade)

## 1. Architecture inspected

Confirmed mobile root C:\xampp\htdocs\agro-bim-mobile, branch main, with a clean working tree before editing. Inspected AGENTS.md, Home, shared UI and BrandMark, theme, tab/target navigation, app identity, Home query hook, More/Account, tests and current asset inventory.

Reused Expo SDK 57, Expo Router's existing five tab stacks, shared Screen/Card/ErrorState/ContentRow/ExternalLink components and the current theme. Existing refresh/session/query logic and backend contracts were not changed. No new route, navigator, dependency, backend endpoint or branding asset was added. All implementation changes are inside the mobile repository; the web checkout was inspected read-only.

## 2. Home before and after

Before: Početna heading, signed-in farm shortcut, request/loading state, dynamic cards immediately afterward.

After:

1. Existing AgroBIM mark and the configured identity name, AgroBIM Digital.
2. Dobro došli u AgroBIM.
3. Digitalne informacije i alati za vaše poljoprivredno gazdinstvo.
4. Four compact primary cards with route-specific descriptions.
5. Signed-in farm summary and profile-completion label.
6. Successful refresh timestamp and real dynamic summaries: Aktuelno, Podsticaji, authenticated Rokovi, Finansiranje, Cenoteka and Tržište.
7. Compact information/support footer.

Each dynamic section retains up to three real items and its actionable targets. Dedicated catalog sections include lighter “Pogledajte sve” entry points. Unavailable sections show compact retry/error controls without hiding successful sections. The welcome and primary actions remain visible during loading, request failure and empty responses. Cached-content, timestamp, focus and pull-refresh behavior are preserved through the unchanged useHomeQuery implementation.

## 3. Brand assets reused

The existing assets/brand/mark.png remains the sole graphic. Shared BrandMark now accepts fullName for the Home welcome while the normal header keeps its compact 32-pixel icon plus AgroBIM name. Both reuse the same image and component. Static PNG import and a TypeScript asset declaration allow the actual brand component to render in both Metro and the test runner. App name/version come from the existing identity.json, which was not changed.

No full-width logo, generated artwork or duplicate identity system.

## 4. Primary navigation cards

| Card               | Existing route  |
| ------------------ | --------------- |
| Za moje gazdinstvo | /farm           |
| Podsticaji         | /programmes     |
| Cenoteka           | /cenoteka       |
| Finansiranje       | /more/financing |

Cards use the current theme and glyph style, a minimum 48-pixel touch target, accessibility labels/descriptions and flexible text containers. They do not impose fixed card heights or truncated text lines. All four render for guests; the farm route retains the existing guest/login behavior.

## 5. Legal/support discovery and connection

The authoritative web sources inspected were src/routes, src/content/site.ts, Footer.tsx, CallToAction.tsx and the existing public homepage.

- Contact/support exists: CallToAction renders Section id="kontakt" on the public root route. The deployed https://agrobim.digital/ returned HTTP 200 and its HTML contained id="kontakt".
- Connected https://agrobim.digital/#kontakt as Kontakt / Podrška on Home, Više and Nalog, using the existing ExternalLink abstraction and external-browser strategy.
- Privacy: the web footer's “Politika privatnosti” points to /#kontakt, which contains contact/consultation content rather than a privacy policy. No usable dedicated public policy route was discovered.
- Terms: “Uslovi korišćenja” has the same contact placeholder; no usable dedicated public terms route was discovered.
- Account deletion: only an internal editorial/admin deletion operation was found. No public deletion-request/information page or existing native destination was found.
- The main corporate site's privacy link also did not resolve to a distinct public policy URL during discovery; it was not substituted for an app policy.

A single typed src/config/trust.ts configuration holds verified destinations. Missing privacy/deletion/terms destinations are null and hidden. Validation rejects unsafe URLs, non-official origins and homepage/contact placeholders masquerading as legal pages. Shared TrustLinks renders compact rows in all three locations, including signed-out Account. Više additionally displays AgroBIM Digital and version 1.0.0 from current identity configuration.

No legal text or deletion mechanics were authored.

## 6. Files changed

Modified:

- src/screens/home.tsx
- src/components/ui.tsx
- src/i18n.ts
- src/app/(tabs)/more/index.tsx
- src/app/(tabs)/more/account.tsx
- tests/content.test.tsx
- tests/ui.test.tsx

Added:

- src/config/trust.ts
- src/components/trust-links.tsx
- src/types/assets.d.ts
- docs/AGRO-MOB-002C.md

## 7. Tests and checks

- npm test: 90 tests passed across seven files. Existing 002A refresh/session tests and 002B detail/navigation/QA tests pass.
- Added tests cover real Home primary-card presses/routes; always-visible brand/navigation on initial failure; independent failed sections and content order; signed-in farm/deadline/personalized behavior; verified/missing/invalid legal destinations; shared external-link opening on Home/More/Account; touch targets, growing text and footer safe-area padding.
- npm run typecheck: passed.
- npm run lint: passed.
- npx expo-doctor: 21/21 checks passed. Used npx because the existing npm doctor script references a bare executable not installed in this repository.
- npm run config:check: development, preview, production and EAS profile checks passed.
- npm run export:android: passed, 1405 modules; existing mark.png is included in the Hermes Android export.
- npm run smoke:public: public Home returned HTTP 200 and real content. Programme list/detail, financing list/detail and Cenoteka list/detail returned HTTP 200.
- git diff and git status inspected; git diff --check passed. No commits made.

Browser preview:

- Inspected the actual guest Home at 360x800 and 320x800 with live Home data.
- Welcome/actions are readable, long Serbian API titles wrap, and DOM inspection reports no horizontal overflow at 320 pixels.
- Footer and contact link remain above the bottom tab bar.
- Financing primary-card navigation reached the existing /more/financing route, and back returned to Home.
- The existing local web-QA proxy does not allow /api/v1/financing/products, so the financing screen shows an error through that preview proxy. This existing preview-only restriction was not changed; direct canonical API smoke succeeded for its list and detail. Native production-host configuration is unchanged.
- Temporary browser viewport was reset and the preview/browser tab was closed.

No physical-device QA, new EAS build, publishing, backend modification or account-deletion action was performed.

## 8. Missing destinations requiring future web work

Publish usable official public privacy and terms pages and a public account-deletion request/information path, then put their verified URLs into src/config/trust.ts. The shared rows will appear on all three surfaces. Contact placeholders and internal admin operations must not be presented as those destinations.

The optional request for any already-published external legal URLs produced no supplied URLs during implementation, so only the discovered verified contact destination was configured.

## 9. Remaining device QA

- Cold-launch Home as guest and signed in; confirm welcome, all four cards, farm summary and personalized sections.
- At narrow Android width and larger system font size, check card descriptions, long titles and header wrapping.
- Tap all four primary cards and check back/tab state.
- Pull refresh and leave/return to Home; verify timestamp advances on success and cached content remains after failure.
- Check empty and independently unavailable sections.
- Scroll to the footer and check Android bottom insets; verify contact links from Home, Više and Nalog.
- Verify unavailable legal rows are absent, QA stays hidden outside enabled QA environments, and logout/login remain stable.

## 10. Final status

IMPLEMENTED — READY FOR DEVICE QA.

Home/brand/navigation work is complete. Verified support navigation is connected; missing legal destinations are explicitly documented and hidden. Physical-device verification remains for the user.
