# TL-TC-TACO-CLUB-P1A — Local evidence

Date: 2026-10-27  
Branch: `feature/tl-taco-club-p1a`  
Candidate: `2beb582f80c1326736fc95164ebdb1f8b807db99`  
Production: `NOT_AUTHORIZED`

## Candidate surfaces

- Additive schemas: `prisma/schema.prisma`, `prisma/schema.d1.prisma`.
- PostgreSQL migration: `20261027000000_taco_club_identity`.
- D1 migration: `0004_taco_club_identity.sql`.
- Customer auth/session modules and disabled-by-default GIS routes.
- Optional `/cuenta` UI; no order flow or tracking changes.

## Validation

- Prisma PostgreSQL schema validation: PASS.
- Prisma D1 schema validation: PASS.
- D1 local migration `0004_taco_club_identity.sql`: PASS; 11 commands applied.
- D1 local schema inspection: `Customer`, `CustomerIdentity`, `CustomerSession` present; `Order.customerId` present and nullable.
- Tests: PASS — 21 files, 63 tests.
- Typecheck: PASS.
- Lint: PASS with three pre-existing warnings only.
- `build:vinext`: PASS.
- Conventional `pnpm build`: not rerun; existing Worker-only `cloudflare:workers` limitation remains documented from prior checkpoints.

## Google integration posture

- `GOOGLE_SIGN_IN_ENABLED` must explicitly equal `true`.
- `GOOGLE_CLIENT_ID` must match the Web Client ID suffix.
- Without both values, config returns disabled and the browser does not load `accounts.google.com/gsi/client`.
- Server verification checks RS256 signature against Google JWKs, issuer, audience, expiry, verified email and `sub`.
- No Client ID, OAuth secret, Google token, access token or refresh token was created, stored or logged.
- D1 customer/identity creation is covered by a batch writer test; PostgreSQL provisioning uses a transaction and uniqueness conflicts recover the winner.
- GIS CSRF refresh behavior is covered by the client implementation; a real browser/provider flow remains pending OAuth configuration.

## Compatibility

- Guest checkout remains unauthenticated.
- Public tracking token and WhatsApp-return storage remain unchanged.
- Admin cookie/table/routes remain separate.
- No remote D1 migration, staging secret, OAuth configuration or Worker deployment performed.

## Classification

`LOCAL_TECHNICAL_PASS / STAGING_BLOCKED_HUMAN_INPUT`

The first candidate received Independent Critic and Integration Review `REWORK`; the findings were corrected locally: atomic customer/identity provisioning, truthful account copy, negative token checks, disabled-customer conflict handling and CSRF refresh. Final candidate `2beb582f80c1326736fc95164ebdb1f8b807db99` was then revalidated with 22 test files / 64 tests, typecheck and lint. Human Input is required before real Google staging validation.
