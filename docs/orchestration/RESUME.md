# Taco Loco — Resume / Orchestration State

Updated: 2026-10-27

- Repository: `sjo1848/taco-loco`
- Branch: `feature/tl-taco-club-p1a`
- Application candidate: `2beb582f80c1326736fc95164ebdb1f8b807db99`
- Execution HEAD: resolve dynamically with `git rev-parse HEAD`
- Mode: `DELIVERY`
- Phase: `VALIDATE / RELEASE_PREPARATION`
- State: `REWORK_STAGING_VALIDATION / HUMAN_INPUT_REAL_GOOGLE_ACCOUNT`
- Active contract: `docs/contracts/TL-TC-TACO-CLUB-P1A.md`
- Production: `NOT_AUTHORIZED`

## Proven checkpoint

The existing remote staging baseline remains historical evidence for the prior application candidate. Candidate `e6f2465` separates the explicit atomic payment-and-order confirmation action, enforces the generic confirmed-payment guard in both runtimes, and passes local validation, Independent Critic and Integration Review. Production remains `NOT_AUTHORIZED`.

## Current human decision

Do not release production yet. Continue in the existing staging environment, restore the established Taco Loco catalog from the frozen former implementation, validate realistic behavior, then reopen the production gate.

`workers.dev` is accepted as the preferred future initial zero-cost public URL. Staging remains available.

## Order-flow Stage A checkpoint

Stages B–D are reworked locally on exact candidate `e6f2465d827f853690ebc96d65db7030de5c484e`; local evidence, Independent Critic and Integration Review are PASS. Production remains `NOT_AUTHORIZED`.

## Catalog source

Canonical source:
`sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48/prisma/seed.ts`

Expected public catalog:
- 7 categories;
- 31 products;
- exact source names/descriptions/prices/sort order;
- source modifier groups/options/associations.

Do not recreate the old demo order or default admin credential as part of catalog parity.

## Manual review readiness

The existing staging environment is ready for human review. Temporary `/products/taco-carne.jpg` coverage is present for all 31 published canonical products, staging-only admin access is verified, and public/admin/order/session/event regression remains healthy. Evidence: `docs/evidence/TL-STAGING-MANUAL-REVIEW-READY-2026-09-13.md`.

The staging `MenuSettings.whatsappPhone` value is corrected to `5492615956912`; web/mobile order handoff and admin settings were revalidated. Evidence: `docs/evidence/TL-STAGING-WHATSAPP-NUMBER-FIXED-2026-09-13.md`.

The existing staging Worker now serves 26 real product WebP assets through Workers Static Assets. Five canonical products retain the temporary placeholder because no source asset was supplied. Evidence: `docs/evidence/TL-STAGING-STATIC-PRODUCT-ASSETS-2026-09-13.md`.

## Order-flow staging validation

The fixed staging setting `deliveryEnabled=1`, `deliveryFeeAmount=3000`, `currency=ARS` enabled a bounded real DELIVERY journey on candidate `e6f2465`: server-side fee, address/transfer data, idempotency, payment report, atomic payment-and-order confirmation, operation gate, final delivery, events/SSE replay, admin/session and PICKUP regression all passed. Evidence: `docs/evidence/TL-TC-ORDER-FLOW-STAGING-e6f2465-delivery-2026-09-15.md`.

The corrective workflow on exact candidate `ea99ca8` makes `/admin` redirect to `/admin/orders`, preserves product CRUD at `/admin/products`, and proves owner SSE arrival of pending PICKUP/DELIVERY submissions without refresh. Evidence: `docs/evidence/TL-STAGING-MANUAL-REVIEW-WORKFLOW-94719f8-2026-09-15.md`. Independent Critic and Integration Review: PASS.

## Next authorized objective

Remote staging validation passed on the existing Worker/D1: deployment `ef5cad20-2dbe-4e79-ba44-6a9e110f1143`, migration `0003_order_tracking.sql`, PICKUP/DELIVERY tracking, opaque cursor, reload, privacy, idempotency and admin regression. Stop at `HUMAN_TRACKING_WORKFLOW_REVIEW`; production remains `NOT_AUTHORIZED`.

## Tracking local assurance

Candidate `1d96410c5b10d5275beaf61943ddde10732ea171` passed Stages A–D locally. Evidence: `docs/evidence/TL-TC-ORDER-TRACKING-STAGE-A-1d96410.md`, `...STAGE-B...`, `...STAGE-C...`, `...STAGE-D...`. Independent Critic and Integration Review are PASS. The public cursor is an opaque SHA-256 capability-derived value; no raw `OrderEvent.sequence` is exposed.

Remote evidence: `docs/evidence/TL-TC-ORDER-TRACKING-STAGING-2026-09-16.md`; classification `REMOTE_INTEGRATION_PASS`. Production is not authorized.

Drive snapshot synchronization: PASS; GitHub remains canonical authority.

## Brand visual checkpoint — 2026-09-19

Candidate `23c1a6622f0b91d3a0ca2a95b0585a01acaef27c` adds the approved green Taco Loco pattern as a reusable visual layer, brand tokens and public-facing menu/success/tracking treatment while keeping admin restrained. No business logic, database schema, payment/auth behavior or infrastructure architecture changed.

Local visual QA, Independent Critic and Integration Review are PASS. The existing staging Worker was deployed as version `989ad8ef-48aa-4c57-a3c7-f94fff7ffd5d`; the Static Asset returned HTTP 200 as WebP and the deployment exposed only existing D1/Static Assets/version metadata bindings. Evidence: `docs/evidence/TL-TC-BRAND-VISUAL-01-STAGING-2026-09-19.md`.

Drive synchronization: `PASS_2026-09-19`; canonical brand contract, source/tokens, QA, reviews, evidence index and staging evidence synchronized to the existing Taco Loco Drive package.

Next action: stop at `HUMAN_TRACKING_WORKFLOW_REVIEW` for real WhatsApp mobile/desktop return validation. Production remains `NOT_AUTHORIZED`.

## Taco Club P1a implementation checkpoint — 2026-10-27

The optional customer identity/fidelity design is recorded as GitHub planning authority, not duplicated in a competing implementation contract:

- Epic: https://github.com/sjo1848/taco-loco/issues/3
- P0 WhatsApp review: #4
- P1a accounts/sessions/recovery: #5
- P1b history/guest claim: #6
- P1c repeat/favorites/addresses: #7
- P2 commercial rules: #8

P1a corrective candidate `c9dc733d9dd6fdd12655c36786aae1c783ff53de` is implemented on `feature/tl-taco-club-p1a`; current governance checkpoint is this follow-up state commit.

- Local evidence: `docs/evidence/TL-TC-TACO-CLUB-P1A-LOCAL-2026-10-27.md`.
- Independent Critic: `PASS` — `docs/reviews/TL-TC-TACO-CLUB-P1A-independent-critic-2026-10-27.md`.
- Integration Review: `PASS` — `docs/reviews/TL-TC-TACO-CLUB-P1A-integration-review-2026-10-27.md`.
- Added additive customer identity/session persistence and Google ID-token verification; GIS remains disabled by default.
- Guest checkout, tracking, WhatsApp-return recovery and admin auth remain preserved. Issue #6 history/claim and loyalty remain deferred.
- No remote migration, secret, OAuth credential or deployment was performed.

Root cause: D1 contained prior customer/identity/session rows, but `/cuenta` always rendered the login button and did not query the session after the POST. Candidate `c9dc733` adds explicit account states, welcome/logout, response validation and bounded auth-attempt limiting. Deployment: `360a1217-1a8f-4495-9c1a-b0cf364e6e18`. Evidence: `docs/evidence/TL-TC-TACO-CLUB-P1A-UX-FIX-2026-10-28.md`.

Next action: `HUMAN_INPUT_REAL_GOOGLE_ACCOUNT` — complete the Google chooser with a disposable test account, then validate customer creation/session/logout/repeated login, admin/customer isolation and guest checkout/tracking. No staging PASS is claimed yet. Production remains `NOT_AUTHORIZED`.

## Customer tracking return P0 — 2026-10-27

The prior return flow left the customer on `/menu` after WhatsApp because `trackingHref` lived only in the success-dialog session record and no pending handoff was resumed on return. Candidate `de368359ea18ced8571b8a36e20cd8f73f2f8d7a` adds bounded localStorage handoff state, strict path/expiry checks, return/reload recovery, desktop pre-popup initialization, stale/new-cart protection and synchronous clearing of the submitted cart. Existing tracking/order architecture is unchanged.

Staging deployment: `1a27db08-8753-4e17-8ded-238ad99a0a8c`. Chrome CDP simulations passed at 390×844 and 1440×900. Independent Critic and Integration Review are PASS. Actual WhatsApp app/Web return and no-app fallback remain pending human device review; no message delivery is claimed.

Evidence: `docs/evidence/TL-TC-ORDER-TRACKING-RETURN-P0-2026-10-27.md`.
