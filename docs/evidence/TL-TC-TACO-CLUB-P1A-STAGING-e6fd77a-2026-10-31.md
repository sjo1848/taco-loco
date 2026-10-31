# Taco Club P1a — candidate-bound staging deployment

## Identity

- Technical candidate: `e6fd77a360c298cded9495ab79e9c805310f4487`
- Execution/governance HEAD: `c8347a69612be79cba196ee1f0477510d7252906`
- Worker: `taco-loco-staging-20260913`
- URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`
- Deployment version: `eb1c652f-8e4f-4171-8450-f2c353df7f99`
- D1: `taco-loco-staging-20260913`
- D1 ID: `266d23b2-4056-41c0-82d9-4f063ba48d78`

The execution HEAD differs from the technical candidate only by governance/evidence descendants; no application files changed after the candidate.

## Migration and binding checks

- Binding: `DB` points to the existing staging D1 identity above.
- Applied migrations: `0001_initial.sql`, `0002_order_flow_dimensions.sql`, `0003_order_tracking.sql`, `0004_taco_club_identity.sql`, `0005_google_auth_challenge.sql`.
- `wrangler d1 migrations list --remote`: `No migrations to apply`.
- Direct migration-table query: `0005_google_auth_challenge.sql` present; changes `0`, rows written `0`.
- Worker bindings: `DB`, `ASSETS`, `CF_VERSION_METADATA`; no R2, Images, Hyperdrive, KV or new remote resource.

## Smoke tests

| Check | Result |
|---|---|
| `/api/health` | PASS, HTTP 200 |
| `/menu` | PASS, HTTP 200 |
| `/cuenta` | PASS, HTTP 200 |
| anonymous `/api/customer/auth/session` | PASS, HTTP 401 |
| invalid public tracking token | PASS, generic HTTP 404 with `no-store` and `no-referrer` |
| Google challenge/login flow | DEFERRED until capturable browser is available; config endpoint was not called prematurely |

## Sanitized D1 snapshot

Read-only query after deployment:

- Customers: `3`
- Customer identities: `3`
- Active customer sessions: `5`
- Duplicate `(provider, providerSubject)` groups: `0`
- Orphan customers: `0`

No emails, provider subjects, cookies or tokens were recorded. No D1 data was changed by this validation.

## Concurrency

The isolated local D1 Worker integration harness passed rollback, concurrent order idempotency, order transition race, admin SSE replay, session/logout and guest runtime checks (`D1_LOCAL_INTEGRATION_PROOF=PASS`). This is evidence for the existing D1 runtime and order path, not a claim of real Google identity contention recovery. A provider-backed identity contention run was not claimed: no additional remote database was created and the authenticated browser journey is still pending.

## Classification

`HUMAN_ACTION / AUTHENTICATED_BROWSER_VALIDATION`

The exact candidate is deployed and smoke-tested. Remaining action is to use a capturable browser, generate a fresh challenge at selection time, complete login/logout/relogin and customer/admin isolation, then run the bounded guest checkout/tracking regression. Production remains `NOT_AUTHORIZED`.
