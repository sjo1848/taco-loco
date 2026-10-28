# Taco Club P1a — identity validation checkpoint

Date: 2026-10-28  
Branch: `feature/tl-taco-club-p1a`  
Technical candidate: `fb4fbd4ac2d9dd25b07b98839fb7a7fdde2ffb7f`  
Staging Worker: `taco-loco-staging-20260913`  
Staging deployment: `abd27dc9-c1b6-4b48-8314-b3fb54ad7916`  
Staging D1: `taco-loco-staging-20260913` (`266d23b2-4056-41c0-82d9-4f063ba48d78`)

## D1 aggregate snapshot

Read-only provider queries before and after the human login/logout/relogin checkpoint report:

| Metric | Baseline | Current | Result |
|---|---:|---:|---|
| Customer rows | 2 | 2 | PASS |
| CustomerIdentity rows | 2 | 2 | PASS |
| CustomerSession rows | 4 | 4 | PASS for no unexpected growth |
| Duplicate `(provider, providerSubject)` keys | 0 | 0 | PASS |
| Customers without an identity | 0 | 0 | PASS |
| Google identities | 2 | 2 | PASS |
| Customers backed by Google identity | 2 | 2 | PASS |

No PII, provider subjects, emails, cookies, tokens or raw identifiers are persisted here.

The aggregate proves current uniqueness and absence of orphan customers. It does not, by itself, prove that the human's three logins returned the same raw `Customer.id`; that detail was not persisted in sanitized evidence.

## Human-reported journey

The owner reports completing login, logout, second login and third login with the same Google test account in staging. This is recorded as `HUMAN_REPORTED`, not as an independently reproduced authenticated browser trace.

The available Codex browser context has no customer cookie: `GET /api/customer/auth/session` returned `401`. Therefore cookie persistence, logout invalidation and authenticated `/cuenta` rendering are not claimed as runtime-observed in this context.

## Automated/local assurance

- Vitest: 25 files / 70 tests PASS.
- Typecheck: PASS.
- Lint: PASS with three pre-existing warnings; zero errors.
- `build:vinext`: PASS.
- Identity uniqueness/idempotency unit coverage: PASS.
- Concurrent same-identity test: PASS against the deterministic shared fake-D1 race harness; this is not a real provider-concurrency proof.
- Admin/customer session cookie namespace isolation test: PASS.
- Google nonce binding was tightened in the follow-up candidate: the request nonce is now required and the signed token must contain the matching nonce.

## Candidate-bound remote smoke

- `/api/health`: HTTP 200 on deployment `abd27dc9-c1b6-4b48-8314-b3fb54ad7916`.
- `/menu`: HTTP 200.
- `/cuenta`: HTTP 200.
- Unauthenticated customer session: HTTP 401.
- Existing guest checkout/idempotency/tracking and safe projection smoke remained available on the staging Worker; no production resources were touched.

The current evidence does not independently prove an authenticated Google browser journey or real D1 concurrent provider requests. P1a therefore remains below integration-ready status.

## Classification

`REWORK / HUMAN_GATE` — local nonce rework is complete and deployed, but candidate-bound authenticated staging evidence and real provider concurrency evidence remain incomplete. Keep PR #9 draft and production `NOT_AUTHORIZED`.
