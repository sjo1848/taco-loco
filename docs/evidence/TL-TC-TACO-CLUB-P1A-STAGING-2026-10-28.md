# TL-TC-TACO-CLUB-P1A — Remote staging checkpoint

Date: 2026-10-28  
Branch: `feature/tl-taco-club-p1a`  
Application candidate: `2beb582f80c1326736fc95164ebdb1f8b807db99`  
Execution HEAD: `f6a6faa9a54e73b1bb09cdfab07031f74a3ccb11`

## Environment

- Worker: `taco-loco-staging-20260913`
- URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`
- Deployment version: `c18694e2-24c9-4144-a342-439ba74ea86a`
- D1: `taco-loco-staging-20260913`
- D1 ID: `266d23b2-4056-41c0-82d9-4f063ba48d78`

## Proven

- `0004_taco_club_identity.sql`: applied remotely with 11 commands.
- Remote D1 contains `Customer`, `CustomerIdentity` and `CustomerSession`.
- `/api/health`: HTTP 200.
- `/api/customer/auth/google/config`: HTTP 200, `enabled=true`, expected Web Client ID returned, CSRF cookie issued.
- `/cuenta`: HTTP 200 and GIS button rendered.
- Google account chooser opened successfully with the exact staging origin. No credential or identity value is persisted in this evidence.
- `/api/customer/auth/session` without a customer cookie: HTTP 401, as expected.
- Admin auth and guest checkout were not changed by this deployment.

## Pending human validation

`HUMAN_INPUT_REAL_GOOGLE_ACCOUNT`: a disposable Google test account must complete the chooser/login flow. The following must then be recorded without storing credentials: first customer creation, persistent customer cookie, logout, repeated login without duplicate identity/customer, customer/admin isolation, and guest checkout/tracking regression.

No client secret was used or uploaded. No production resource or deployment was touched.

Classification: `REMOTE_VALIDATION_PARTIAL / HUMAN_INPUT_REAL_GOOGLE_ACCOUNT`.
