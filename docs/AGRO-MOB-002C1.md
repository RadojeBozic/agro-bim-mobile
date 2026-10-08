# AGRO-MOB-002C1 — Connect Public Legal URLs

Date: 2026-10-08 (Europe/Belgrade)
Repository: C:\xampp\htdocs\agro-bim-mobile
Branch: main; working tree was clean before editing.

## Changes and destinations

All four destinations are centralized in src/config/trust.ts and exposed as compact shared TrustLinks rows on Home, Više and Nalog, for both guests and authenticated users:

| Label                | Exact destination                            | Surfaces          |
| -------------------- | -------------------------------------------- | ----------------- |
| Politika privatnosti | https://agrobim.digital/politika-privatnosti | Home, Više, Nalog |
| Uslovi korišćenja    | https://agrobim.digital/uslovi-koriscenja    | Home, Više, Nalog |
| Brisanje naloga      | https://agrobim.digital/brisanje-naloga      | Home, Više, Nalog |
| Podrška              | https://agrobim.digital/podrska              | Home, Više, Nalog |

The existing ExternalLink abstraction opens each URL using React Native Linking.openURL and retains its existing Serbian failure/retry state. No screen redesign or new route was necessary.

Removed the legacy support destination https://agrobim.digital/#kontakt and replaced hidden/null privacy, terms and deletion entries with the verified official URLs. The old contact anchor remains only as deliberately rejected legal-placeholder validation/test input, never as a configured link.

## Files changed

- src/config/trust.ts — four exact HTTPS URLs and updated provenance comment.
- src/i18n.ts — support label changed to Podrška / Support.
- tests/content.test.tsx — updated existing assertions and added exact configuration, all-surface guest/authenticated opening, accessibility and failed-opening/retry tests.
- docs/AGRO-MOB-002C1.md — this report.

The shared trust-link component and its existing Home/Više/Nalog integration remain unchanged. All implementation changes are mobile-only. No agro-bim-next modifications, backend-contract changes, commits or publication.

## Verification

- Read-only requests without credentials: all four official URLs returned HTTP 200, no redirect and the expected page titles.
- Full repository suite: 94 tests passed across 7 files, including existing Home refresh, navigation, login/session, account and QA-environment tests.
- New tests verify all four rows occur once on each surface, open exact URLs through the existing helper, provide accessible link labels and minimum 48-pixel touch targets, allow text wrapping/scaling, and retain retry behavior if the OS fails to open a URL.
- Deletion-link tests verify no API request or destructive delete/confirmation control is introduced.
- TypeScript: passed.
- Lint: passed.
- Expo Doctor via npx: all 21 checks passed.
- Environment/EAS config checks: development, preview, production and EAS profiles passed; Android package identity remains com.agrobim.digital.
- Android export: passed, 1405 modules, Hermes bundle exported to ignored dist/.
- git diff / git status reviewed; git diff --check passed.
- The existing safe-area padding and navigation/layout code were not modified.

## Remaining account-deletion/store-readiness work

Brisanje naloga is solely navigation to the official public information page. Native deletion/request workflow and any associated API or destructive confirmation remain separate work. This change does not certify full store readiness.

Device QA remains: open each link from Home, Više and Nalog; check external browser behavior, larger Android font scaling, footer reachability above bottom navigation, and login/logout/back behavior. No physical-device QA was performed.

## Final status

IMPLEMENTED — READY FOR DEVICE QA.
