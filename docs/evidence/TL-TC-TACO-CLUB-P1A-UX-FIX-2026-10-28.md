# Taco Club P1a — Google Sign-In UX correction

Date: 2026-10-28  
Branch: `feature/tl-taco-club-p1a`  
Candidate: `c9dc733d9dd6fdd12655c36786aae1c783ff53de`  
Worker deployment: `360a1217-1a8f-4495-9c1a-b0cf364e6e18`

## Root cause

The remote D1 staging database already contained 2 customers, 2 Google identities and 4 customer sessions, proving that prior Google POSTs had created persistent data. The browser still showed the login button because `/cuenta` always rendered `GoogleSignInButton`; after a successful POST the client only refreshed the same page and never queried `/api/customer/auth/session` or rendered an authenticated state.

## Correction

- `/cuenta` now distinguishes loading, visitor, authenticating, authenticated and session-error states.
- Authenticated customers see a welcome message, menu link and logout.
- Google POST response is validated and passed to the account UI without exposing session tokens.
- Customer auth attempts have a bounded per-isolate rate limit with `429`/`Retry-After`; CSRF, same-origin, ID-token validation and email verification remain enforced.
- Admin auth, guest checkout and public tracking remain separate.

## Validation

- Tests: PASS — 23 files / 66 tests.
- Typecheck: PASS.
- Lint: PASS with three pre-existing warnings.
- `build:vinext`: PASS.
- Staging health/config and unauthenticated session checks: PASS.
- Real Google account login, logout, repeated login, isolation and guest regression: pending `HUMAN_INPUT_REAL_GOOGLE_ACCOUNT`.

Production remains `NOT_AUTHORIZED`; PR #9 remains draft.
