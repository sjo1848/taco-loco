# Taco Loco — Resume / Orchestration State

Updated: 2026-10-28

- Repository: `sjo1848/taco-loco`
- Branch: `feature/tl-taco-club-p1a`
- Application candidate: `48744dd5850ece461f3c2841b401da6797467b0a`
- Execution HEAD: resolve dynamically with `git rev-parse HEAD`
- Mode: `DELIVERY`
- Phase: `VALIDATE / RELEASE_PREPARATION`
- State: `P1A_REWORK / HUMAN_GATE_STAGING_DEPLOY_AND_AUTHENTICATED_EVIDENCE`
- Active contract: `docs/contracts/TL-TC-TACO-CLUB-P1A.md`
- Production: `NOT_AUTHORIZED`

## Current P1a staging checkpoint — 2026-10-28

- `0005_google_auth_challenge.sql` is applied and verified on the existing staging D1.
- Exact application candidate `48744dd5850ece461f3c2841b401da6797467b0a` is deployed as Worker version `2b0a11a7-cb99-45c1-930b-e2240a62419a`.
- Smoke: health/menu/account pass; anonymous customer session is 401; Google config is enabled and emits challenge/cookies with values withheld.
- Browser is prepared at the real Google account chooser. The only immediate human interaction is selecting the authorized Google account and completing the Google consent/return flow.
- Do not call P1a ready: real D1 identity conflict recovery and bounded GoogleAuthChallenge cleanup remain unresolved review gates. No P1b, merge or production.
- Follow-up diagnosis is recorded in `docs/evidence/TL-TC-TACO-CLUB-P1A-CONCURRENCY-CLEANUP-2026-10-29.md`; local tests remain PASS, but no real-provider concurrency PASS is claimed.

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

## Taco Club P1a current HEAD checkpoint — 2026-10-28

Current HEAD/candidate `48744dd5850ece461f3c2841b401da6797467b0a` adds persisted `GoogleAuthChallenge` with atomic conditional consumption. CI `40713513428` is green; local QA is 27 files/75 tests, typecheck, lint and vinext build PASS. Isolated local D1 produced one challenge-consume winner and one loser. Identity uniqueness remains structurally protected, but the local parallel identity run surfaced `UNIQUE`/`SQLITE_BUSY`; real application recovery is not claimed.

Fresh exact reviews are `docs/reviews/TL-TC-TACO-CLUB-P1A-independent-critic-48744dd.md` (`HUMAN_GATE`) and `docs/reviews/TL-TC-TACO-CLUB-P1A-integration-review-48744dd.md` (`HUMAN_GATE`). Migration `0005` and the exact candidate are not deployed to staging. Next action requires explicit authorization for the staging migration/deployment, followed by capturable authenticated login/logout/relogin/isolation evidence. Production remains `NOT_AUTHORIZED`.

## Taco Club P1a identity validation checkpoint — 2026-10-28

Candidate `0160ab3ecde59011b39ade25ead4ab6a2a55589c` is deployed to staging as `3848a5bc-f97c-46ed-b827-aa41167ad93f`. Read-only D1 aggregate evidence is 2 Customer, 2 CustomerIdentity, 5 active CustomerSession, zero duplicate provider/subject keys and zero orphan customers. Human same-account login/logout/relogin is not yet reproduced in the prepared browser.

Nonce binding is now server-issued through an HttpOnly cookie and required at the API/token-verification layers. Local QA is 25 files/70 tests, typecheck, lint and `build:vinext` PASS, with three pre-existing lint warnings. Exact reviews are `docs/reviews/TL-TC-TACO-CLUB-P1A-independent-critic-0160ab3.md` (`HUMAN_GATE`) and `docs/reviews/TL-TC-TACO-CLUB-P1A-integration-review-0160ab3.md` (`HUMAN_GATE`), because authenticated candidate-bound browser evidence and real D1 provider concurrency are not independently available. P1a is not ready for integration. PR #9 remains draft and production remains `NOT_AUTHORIZED`.

The Issue #6/P1b-A contract is prepared at `docs/contracts/TL-TC-TACO-CLUB-P1B.md`, but implementation is blocked until P1a receives integration approval.

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
