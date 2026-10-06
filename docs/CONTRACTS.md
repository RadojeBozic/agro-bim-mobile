# Mobile API v1 snapshot

Source: agro-bim-next/src/lib/mobile-api/contracts.ts, AGRO-MOB-API-001 with registered-free existing eligibility addendum. Copied read-only on 2026-10-06. Original source SHA-256: 1e85a8a3db5560d9c0082ee1634b4853e14c612b61fc21df6ebacfd44f9bf1b9. Mobile copy has formatting changes only.

The portable source imports Zod only and contains safe DTO/runtime/input schemas. No database types, server modules, business rules or private credentials are imported. SchemaVersion=1 is validated on every success envelope. Known enums retain unknown fallback; nullable source fields stay nullable. Capability booleans and policies are received from the backend.

Update this snapshot deliberately when the backend contract changes; rerun runtime-contract/client/UI tests and production public smoke. Do not introduce imports from the neighboring web checkout. Input and output types remain distinct where runtime transforms apply. Ordinary response schemas remove unexpected fields; the controlled eligibility QA result additionally uses strict object shapes to detect editorial/internal fields.

Approved brand provenance: assets/brand/mark.png is copied from agro-bim-next/public/brand/agro-bim-mark.png. It is a reused app icon/splash/header placeholder. Final store art and legal/release approval remain owner responsibilities.
