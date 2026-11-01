# Taco Club P1b-B — staging validation — 2026-11-01

## Identity

- Contract: `TL-TC-TACO-CLUB-P1B`, P1b-B guest-order claim.
- Exact application candidate: `2c15d6f0255fe1df411ef1128d177dc1c8a8206a`.
- Staging Worker: `taco-loco-staging-20260913`.
- Deployment version: `bac79e88-f482-4b8b-9ad6-471e2c73de01`.
- Staging URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`.
- D1: existing `taco-loco-staging-20260913` (`266d23b2-4056-41c0-82d9-4f063ba48d78`).
- Migrations: none applied; P1b-B is data/schema-neutral.
- Production: `NOT_AUTHORIZED`.

## Provider and smoke evidence

| Check | Result | Evidence |
|---|---|---|
| Wrangler dry-run | PASS | Existing DB binding, Static Assets and version metadata bindings resolved; no R2/Images/KV/Hyperdrive binding. |
| Worker deployment | PASS | Exact candidate deployed as the version above. |
| Health | PASS | `GET /api/health` returned 200. |
| Menu | PASS | Public menu returned 200 and rendered the staging catalog. |
| Anonymous customer session | PASS | `GET /api/customer/auth/session` returned 401. |
| Anonymous customer history | PASS | `GET /api/customer/orders` returned 401. |
| Unknown tracking route | PASS | Invalid tracking token returned generic 404. |
| Unauthenticated claim | PASS | Claim request returned 401 without changing ownership. |

The authenticated provider read command `wrangler d1 info` returned Cloudflare API error 10000 during this run. No migration was retried and no data was modified through that failed read. The deployment binding and application behavior were verified through the successful Worker deployment and browser/API journeys.

## Guest claim journey

1. Created one bounded synthetic guest PICKUP order through the public order-intent endpoint. The order received a tracking capability and rendered in the public tracking page.
2. Opened the tracking page without a customer session. The page showed the private-link warning and the Google login path.
3. Completed Google authentication in the controlled browser without recording credentials, cookies, email, subject or token.
4. Returned to the same tracking page and confirmed the explicit two-step claim UI.
5. Confirmed `Guardar en mi cuenta` followed by `Sí, guardarlo`.
6. Observed the sanitized success state `Pedido guardado en tu cuenta`.
7. Opened `/cuenta` and observed the claimed order in `Mis pedidos` with its order code, product, total and pending state.

This proves the real staging path: guest order → private tracking → authenticated customer → explicit claim → customer history. The order remained pending and its public timeline did not gain a synthetic event.

## Security and semantic checks

- Claim authorization remained session-plus-opaque-token; TL number, email and phone were not used.
- Explicit confirmation was required.
- The UI warned that the tracking link is private and should not be shared.
- The response/UI did not expose raw token, customer identity, address, transfer holder, internal reason or raw ownership fields.
- Same-owner idempotency, competing-owner conflict, expiry, malformed-token and modeled parallel-claim behavior remain covered by the exact-candidate local suite: 30 files / 101 tests.
- Real provider-backed parallel claim contention was not re-run against shared staging; it is not claimed as newly proven here.
- Existing customer history, guest tracking and WhatsApp handoff behavior were smoke-checked or reused from the unchanged P1b-A staging evidence. No admin, identity or production data was intentionally modified beyond the bounded synthetic guest order and its explicit claim.

## Classification

`P1B_B_STAGING_VALIDATED / INTEGRATION_AUTHORIZATION_REQUIRED`

The candidate passed the bounded real staging claim journey. This does not authorize merge or production. The known remote D1 CLI read limitation and the absence of a real concurrent-claim stress run remain explicit evidence limitations, not hidden PASS claims.

## Next action

Present PR #11 for protected merge/integration authorization. Keep the PR draft until that authorization is explicit. Do not begin P1b-C or modify production.
