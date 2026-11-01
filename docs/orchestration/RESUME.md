# Taco Loco — Resume / Orchestration State

## Customer tracking return P0 — 2026-11-01

The P0 base/merge `fd1ee6be539755b50bb88cf9d118a1019a36bade` is verified on `rework/tl-order-tracking-return-p0-qa`. Application candidate `de368359ea18ced8571b8a36e20cd8f73f2f8d7a` is unchanged. Full QA is green: 30 files/101 tests, P0-specific 11 tests, typecheck, lint and `build:vinext`. Independent Critic and Integration Review remain valid PASS. Classification: `P0_TECHNICAL_PASS / P0_HUMAN_DEVICE_VALIDATION_PENDING`.

Only real-device WhatsApp app, WhatsApp Web and no-app return behavior remain for human review. No production, merge or infrastructure action is authorized. Evidence: `docs/reviews/TL-TC-ORDER-TRACKING-RETURN-P0-closure-review-2026-11-01.md`.

## MVP operational audit — 2026-11-01

Read-only staging smoke passed for health, menu, Static Asset, anonymous auth boundaries and invalid tracking. The operational audit is `docs/evidence/TL-MVP-OPERATIONS-AUDIT-2026-11-01.md`. Pilot blockers remain physical WhatsApp return evidence, account-specific D1 `info`/backup-restore evidence and a controlled tracked staging deployment procedure. No production action is authorized.

Updated: 2026-10-28

- Repository: `sjo1848/taco-loco`
- Branch: `feature/tl-taco-club-p1b-a`
- Application candidate: `4b565f3dec11940bb651518a1f4a786da52661c2`
- Execution HEAD: resolve dynamically with `git rev-parse HEAD`
- Mode: `DELIVERY`
- Phase: `VALIDATE / RELEASE_PREPARATION`
- State: `P1B_A_LOCAL_TECHNICAL_PASS / READY_FOR_PR_REVIEW`
- Active contract: `docs/contracts/TL-TC-TACO-CLUB-P1A.md`
- Production: `NOT_AUTHORIZED`

## Current P1b-A checkpoint

- Base: integrated P1a merge `0a0a9ff370291be04a47d19232954979630fcd01`.
- Authenticated checkout association is server-side and atomic; guest checkout remains unowned (`Order.customerId = NULL`).
- Private `/api/customer/orders` and `/cuenta` history use a bounded stable cursor and safe DTO without tracking capabilities or delivery PII.
- Local QA: 28 test files / 90 tests, typecheck, lint and `build:vinext` PASS; three pre-existing warnings remain.
- Evidence: `docs/evidence/TL-TC-TACO-CLUB-P1B-A-LOCAL-2026-10-31.md`.
- Independent Critic: `PASS`; `docs/reviews/TL-TC-TACO-CLUB-P1B-A-independent-critic-4b565f3.md`.
- Integration Review: `PASS`; `docs/reviews/TL-TC-TACO-CLUB-P1B-A-integration-review-4b565f3.md`.
- Next: create/update the draft PR for review. Do not deploy staging, merge or begin P1b-B.

## Current P1a rework checkpoint — 2026-10-31

- Exact code candidate: `e6fd77a360c298cded9495ab79e9c805310f4487`.
- Local QA: 27 test files / 85 tests, typecheck, lint and `build:vinext` PASS; three pre-existing lint warnings remain.
- The code rework distinguishes definitive identity `UNIQUE` conflicts from transient `SQLITE_BUSY`, uses bounded stable-ID retries, atomically consumes Google challenges, returns 503 after post-consumption persistence failure, cleans at most 100 old challenges best-effort, and recovers GIS configuration/SDK stale callbacks with retryable UI.
- Independent Critic: `PASS_WITH_CONDITIONS`; exact-SHA staging/authenticated evidence passes. Real D1 identity concurrency is explicitly unproven but accepted for P1a integration only.
- Integration Review: `PASS_WITH_CONDITIONS`; same residual-risk boundary.
- PR #9 remains draft pending explicit protected-merge authorization; no production or P1b work.

## Candidate-bound staging deployment — 2026-10-31

- Candidate `e6fd77a360c298cded9495ab79e9c805310f4487` deployed as Worker version `eb1c652f-8e4f-4171-8450-f2c353df7f99`.
- Existing D1 binding and migration state verified; `0005_google_auth_challenge.sql` was already applied and no migration/data write occurred.
- Smoke PASS: health, menu, `/cuenta`, anonymous customer session 401, invalid tracking 404. Sanitized snapshot: 3 customers, 3 identities, 5 active sessions, zero duplicate identity keys, zero orphan customers.
- Capturable Playwright evidence now proves candidate-bound login, reload, logout→401, same-customer re-login, customer-to-admin isolation, guest checkout and tracking. Real D1 identity contention remains unproven.
- Evidence: `docs/evidence/TL-TC-TACO-CLUB-P1A-STAGING-e6fd77a-2026-10-31.md`.

## Next action

Next: obtain explicit authorization for protected merge of PR #9. Do not merge automatically, begin P1b or modify production. Reopen the accepted identity-concurrency risk on its documented triggers.

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

## Taco Club P1b-A staging checkpoint — 2026-11-01

Exact application candidate `4b565f3dec11940bb651518a1f4a786da52661c2` is deployed to the existing staging Worker as `b777951d-247e-4419-adcf-d4d562e0835f`; governance HEAD is `f4e0cccca7dc775fc9c7e39dca8ad2e68243f71a`. Existing D1 binding and migrations were verified with no migration applied. Authenticated `/cuenta` and private `Mis pedidos` passed, including a bounded authenticated PICKUP order that appears as customer-owned history. Health, menu, anonymous authorization boundaries, guest tracking and WhatsApp handoff smoke checks passed. Evidence: `docs/evidence/TL-TC-TACO-CLUB-P1B-A-STAGING-2026-11-01.md`.

Classification: `P1B_A_READY_FOR_INTEGRATION`. The local Independent Critic and Integration Review remain valid PASS for the unchanged candidate. A second authenticated customer remote journey and forced pagination threshold were not repeated; they are covered by local tests/prior evidence and are not claimed as new browser observations. PR #10 remains draft. Next action: obtain explicit protected merge authorization for PR #10. Production remains `NOT_AUTHORIZED`; P1b-B is deferred.

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
## Taco Club P1b-B policy gate — 2026-11-01

P1b-A is integrated at `3197611bd8bf464c29fc1418cd2b5d4b9cefea7d`. Branch `feature/tl-taco-club-p1b-b` was created from the real remote base after fetching origin. No code, migration, remote data or staging resource changed.

The approved guest-claim policy is recorded in `docs/contracts/TL-TC-TACO-CLUB-P1B.md`: authenticated session plus opaque tracking token, 30-day claim window, first atomic claim wins, same-customer idempotent retry, generic conflict for another owner, no self-unclaim, existing retention unchanged, and no synthetic OrderEvent. Candidate `2c15d6f0255fe1df411ef1128d177dc1c8a8206a` is locally validated; current state is `P1B_B_LOCAL_TECHNICAL_PASS / STAGING_AUTHORIZATION_REQUIRED`.

Next action: authorize bounded staging deployment/validation of the exact candidate. Do not merge or touch production.

## Taco Club P1b-B staging checkpoint — 2026-11-01

Exact candidate `2c15d6f0255fe1df411ef1128d177dc1c8a8206a` is deployed to the existing staging Worker as `bac79e88-f482-4b8b-9ad6-471e2c73de01`. The bounded real journey passed: synthetic guest order, private tracking, Google authentication, explicit claim confirmation and customer-history visibility. Health/menu/anonymous-boundary/invalid-token smoke checks also passed. Evidence: `docs/evidence/TL-TC-TACO-CLUB-P1B-B-STAGING-2026-11-01.md`.

Classification: `P1B_B_STAGING_VALIDATED / INTEGRATION_AUTHORIZATION_REQUIRED`. Real D1 concurrent-claim contention is not claimed; `wrangler d1 info` returned provider error 10000 during the read and no migration was retried. PR #11 remains draft. Next action: obtain protected merge/integration authorization. Do not begin P1b-C or modify production.
