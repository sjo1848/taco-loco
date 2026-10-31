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
| Google challenge/login flow | PASS in capturable Playwright browser; fresh challenge was generated at selection time |

## Sanitized D1 snapshot

Read-only query after deployment:

- Customers: `3`
- Customer identities: `3`
- Active customer sessions: `5`
- Duplicate `(provider, providerSubject)` groups: `0`
- Orphan customers: `0`

No emails, provider subjects, cookies or tokens were recorded. No D1 data was changed by this validation.

## Capturable browser validation

The in-app browser connector could not initialize because its node-repl module loader rejected the runtime import of `node:process`. The repository Playwright CLI was available through `npx`; its shell wrapper is not executable as a file but runs correctly through `bash`, with the default persistent session.

Candidate-bound staging observations, sanitized:

- `/cuenta` initially showed the visitor state and the Google Sign-In control.
- Google selection returned to `/cuenta` with the authenticated state and welcome/logout controls.
- Reload preserved the authenticated UI.
- Logout returned the account session endpoint to HTTP `401`.
- A second Google login succeeded and produced the same anonymized `Customer.id` fingerprint as the prior authenticated cycle: `540b52674ceace53`. The raw identifier, email, cookie and token were not recorded.
- With the customer session active, `/admin/orders` redirected to `/admin/login`, and the customer session did not authorize `/api/auth/session` (HTTP `401`). This proves customer-to-admin isolation. A fresh admin-authenticated session was not independently exercised in this run, so the reverse direction remains covered only by existing admin-auth evidence.

## Guest checkout and tracking validation

- From the public menu, a guest PICKUP checkout completed without Google authentication and created a bounded staging order `TL-0039`.
- The WhatsApp handoff page opened with the order reference and a tracking link. Message delivery to WhatsApp itself is not claimed.
- The tracking URL opened in the staging browser and rendered the persisted order projection: `Esperando confirmación`, `Pedido enviado`, one Burrito line and the expected total. The opaque token was not persisted in evidence.
- No Google customer authentication was required for the guest order/tracking path.

## D1 snapshot interpretation

The current sanitized read-only aggregate remains `3 customers / 3 identities / 0 duplicate identity groups / 0 orphan customers`. The previously expected `2 / 2` value is stale relative to the snapshot already taken before this controlled re-login. The current login/logout/re-login cycle did not increase the counts. Without exposing identity subjects or customer IDs, the exact historical action that changed the aggregate from `2` to `3` cannot be attributed; no duplicate or orphan is observed.

## Concurrency

The isolated local D1 Worker integration harness passed rollback, concurrent order idempotency, order transition race, admin SSE replay, session/logout and guest runtime checks (`D1_LOCAL_INTEGRATION_PROOF=PASS`). This is evidence for the existing D1 runtime and order path, not a claim of real Google identity contention recovery. No parallel synthetic identity write was run against the shared remote D1, so provider-backed identity contention and recovery from real D1 `UNIQUE`/`SQLITE_BUSY` races remain unproven.

The minimum safe next test is an isolated local D1 database seeded with synthetic Google subjects, invoking the actual identity transaction concurrently and asserting one identity/customer outcome plus bounded recovery. A real-provider contention test would require an explicitly authorized isolated remote write environment; it must not use the shared staging database merely for convenience.

## Classification

`HUMAN_GATE / REAL_D1_IDENTITY_CONCURRENCY`

The exact candidate is deployed and smoke-tested. Candidate-bound browser evidence now proves Google login, reload, logout-to-401, same-customer re-login, customer-to-admin isolation, guest checkout and tracking. The remaining gate is real D1 identity contention/recovery; it is not proven by the local harness or by the sequential browser journey. Production remains `NOT_AUTHORIZED`.
