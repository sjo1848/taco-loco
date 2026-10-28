# Evidence Index — Taco Loco
As of: 2026-10-27

Latest durable checkpoint: 2026-10-27 — P0 tracking return correction on `rework/tl-order-tracking-return-p0`, candidate `de368359ea18ced8571b8a36e20cd8f73f2f8d7a`, staging deployment `1a27db08-8753-4e17-8ded-238ad99a0a8c`; technical staging PASS, stopped at `HUMAN_TRACKING_WORKFLOW_REVIEW`, production unauthorized.

- Problem: PROVEN — Cloudflare-native/USD-0 objective and current product baseline.
- Design: PROVEN for D1 target; initial media strategy updated by explicit Human Decision `MEDIA_STATIC_ASSETS_INITIAL`.
- Prior D1 implementation: PROVEN — candidate `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`, Independent Critic PASS and Integration Review PASS.
- Static Assets media implementation: PROVEN — candidate `4007a5810c998a7c4478dfb4b054c9c612860a1a`; `docs/evidence/TL-CF-STATIC-ASSETS-4007a58.md`.
- Validation: PROVEN — local adaptation and bounded remote provider journey passed with Independent Critic and Integration Review.
- Release/Deployment: PARTIAL — bounded non-production Worker/D1 deployment proven; production remains unauthorized.
- Maintenance/Operations: UNKNOWN — not operated in production.
- Judgment/Decisions: PROVEN — D1 decision, COST-0 constraint, `R2_FREE_TIER_ACCEPTED` historical decision, and later `MEDIA_STATIC_ASSETS_INITIAL` supersession for initial media.
- Orchestration/Resume: PROVEN — `docs/orchestration/RESUME.md`.
- Static Assets decision: PROVEN — `docs/evidence/TL-MEDIA-STATIC-ASSETS-DECISION-2026-09-13.md`.
- Self-service upload: DEFERRED by Human Decision for the initial release.
- R2 enablement: NOT_REQUIRED_INITIAL; previous API 10042/account evidence remains historical and inspectable.
- Remote D1 staging contract: REMOTE_INTEGRATION_PASS — `docs/contracts/TL-CF-D1-REMOTE-STAGING-01.md`; exact final candidate `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`.
- Remote staging evidence: PROVEN — `docs/evidence/TL-CF-D1-REMOTE-STAGING-6eccc3a.md`.
- Remote staging effective bindings: PROVEN — `docs/evidence/TL-CF-D1-REMOTE-STAGING-bindings-6eccc3.json`.
- Remote staging Independent Critic: PROVEN PASS — `docs/reviews/TL-CF-D1-REMOTE-STAGING-independent-critic-6eccc3a.md`.
- Remote staging Integration Review: PROVEN PASS — `docs/reviews/TL-CF-D1-REMOTE-STAGING-integration-review-6eccc3a.md`.
- Staging catalog parity: PROVEN PASS — `docs/evidence/TL-STAGING-CATALOG-PARITY-2026-09-13.md`; frozen source `a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`, 7 active categories, 31 published products, zero missing/mismatched/duplicate public canonical products, realistic order and modifier journey PASS.
- Staging manual review preparation: PROVEN PASS — `docs/evidence/TL-STAGING-MANUAL-REVIEW-READY-2026-09-13.md`; 31/31 temporary image coverage, staging admin access, public/menu/image/session/order/idempotency/event regression PASS. Production remains explicitly unauthorized.
- Staging WhatsApp number: PROVEN PASS — `docs/evidence/TL-STAGING-WHATSAPP-NUMBER-FIXED-2026-09-13.md`; staging-only `MenuSettings.whatsappPhone` corrected from sanitized `5491112345678` to `5492615956912`, web/mobile handoff, order number and admin settings verified. Production untouched.
- Staging static product assets: PROVEN PASS — `docs/evidence/TL-STAGING-STATIC-PRODUCT-ASSETS-2026-09-13.md`; candidate `f896b6b`, 26 real WebP assets deployed and linked in D1, 5 documented placeholders, Worker/D1/Static Assets runtime PASS.
- Static Assets Independent Critic: PROVEN PASS — `docs/reviews/TL-CF-STATIC-ASSETS-independent-critic-4007a58.md`; exact candidate and fresh independent context.
- Static Assets Integration Review: PROVEN PASS — `docs/reviews/TL-CF-STATIC-ASSETS-integration-review-4007a58.md`; exact candidate and fresh independent context.
- Order-flow Stage A implementation: PROVEN TECHNICAL_PASS — substantive candidate `d8d98f7196284ffe0464a562033241aebbaf4c3c`; `docs/evidence/TL-TC-ORDER-FLOW-STAGE-A-d8d98f7.md`. PostgreSQL/D1 order-flow dimensions, safe legacy defaults and D1 `DELIVERY` binding coverage are validated locally.
- Order-flow Stage A Independent Critic: PROVEN PASS — `docs/reviews/TL-TC-ORDER-FLOW-STAGE-A-independent-critic-d8d98f7.md`; fresh independent context, exact candidate, prior binding-test gap reworked and closed.
- Order-flow Stage A Integration Review: PROVEN PASS — `docs/reviews/TL-TC-ORDER-FLOW-STAGE-A-integration-review-d8d98f7.md`; exact candidate and synchronized governance state.
- Order-flow Stages B–D: TECHNICAL_PASS — exact candidate `e6f2465d827f853690ebc96d65db7030de5c484e`; checkout, exception actions, empty-table-safe D1/PostgreSQL guards, SSE queue snapshots and tests pass. Evidence: `docs/evidence/TL-TC-ORDER-FLOW-STAGES-BCD-e6f2465.md`.
- Order-flow staging validation: PARTIAL / HUMAN_INPUT — exact candidate `e6f2465d827f853690ebc96d65db7030de5c484e`; health/assets/auth/session, pickup modifiers/idempotency, admin transitions and runtime pass. DELIVERY awaits fixed staging fee. Evidence: `docs/evidence/TL-TC-ORDER-FLOW-STAGING-e6f2465.md`.
- Order-flow Stages B–D Independent Critic: PROVEN PASS — exact candidate `e6f2465d827f853690ebc96d65db7030de5c484e`; evidence `docs/reviews/TL-TC-ORDER-FLOW-STAGES-BCD-independent-critic-e6f2465.md`.
- Order-flow Stages B–D Integration Review: PROVEN PASS — exact candidate `e6f2465d827f853690ebc96d65db7030de5c484e`; evidence `docs/reviews/TL-TC-ORDER-FLOW-STAGES-BCD-integration-review-e6f2465.md`.
- Order-flow staging DELIVERY/PICKUP validation: PROVEN PASS — exact candidate `e6f2465d827f853690ebc96d65db7030de5c484e`; staging-only fee ARS 3,000, server-side total, address/transfer validation, payment gating, idempotency, events/SSE replay, admin/session and PICKUP regression. Evidence: `docs/evidence/TL-TC-ORDER-FLOW-STAGING-e6f2465-delivery-2026-09-15.md`. Production remains unauthorized.
- Corrective workflow review: PROVEN PASS — exact candidate `ea99ca83d7e6831833a97a11e21d5585c0903273`; `/admin` operational entry, `/admin/products` secondary CRUD, two-client pending PICKUP/DELIVERY SSE arrival and reload persistence. Evidence: `docs/evidence/TL-STAGING-MANUAL-REVIEW-WORKFLOW-94719f8-2026-09-15.md`.
- Corrective workflow Independent Critic: PROVEN PASS — `docs/reviews/TL-STAGING-MANUAL-REVIEW-independent-critic-ea99ca8.md`.
- Corrective workflow Integration Review: PROVEN PASS — `docs/reviews/TL-STAGING-MANUAL-REVIEW-integration-review-ea99ca8.md`.

Coverage is conservative; no historical process or PASS state is fabricated.

## Customer tracking — 2026-09-16

- Contract: PROVEN local assurance — `docs/contracts/TL-TC-ORDER-TRACKING-01.md`.
- Stage A: PROVEN PASS — `docs/evidence/TL-TC-ORDER-TRACKING-STAGE-A-1d96410.md`.
- Stage B: PROVEN PASS — `docs/evidence/TL-TC-ORDER-TRACKING-STAGE-B-1d96410.md`; opaque SHA-256 cursor, safe allow-list, generic 404/no-store/204 behavior.
- Stage C: PROVEN PASS — `docs/evidence/TL-TC-ORDER-TRACKING-STAGE-C-1d96410.md`; bounded cancellable polling.
- Stage D: PROVEN PASS — `docs/evidence/TL-TC-ORDER-TRACKING-STAGE-D-1d96410.md`; intent, success dialog, session UX and WhatsApp integration.
- Independent Critic: PROVEN PASS — `docs/reviews/TL-TC-ORDER-TRACKING-independent-critic-1d96410.md`.
- Integration Review: PROVEN PASS — `docs/reviews/TL-TC-ORDER-TRACKING-integration-review-1d96410.md`.
- Remote staging: UNKNOWN/PENDING for this feature; no remote tracking migration or deployment is claimed yet.
- Remote staging: PROVEN PASS — `docs/evidence/TL-TC-ORDER-TRACKING-STAGING-2026-09-16.md`; deployment `ef5cad20-2dbe-4e79-ba44-6a9e110f1143`, D1 migration, opaque token/cursor, PICKUP/DELIVERY, admin/session, idempotency and privacy checks passed. Production remains unauthorized.
- Production: NOT_AUTHORIZED.

## Taco Club P1a — remote staging checkpoint — 2026-10-28

- Remote validation: PARTIAL — existing Worker `taco-loco-staging-20260913`, deployment `c18694e2-24c9-4144-a342-439ba74ea86a`, existing D1 only.
- D1 migration: PROVEN — `0004_taco_club_identity.sql` applied; `Customer`, `CustomerIdentity` and `CustomerSession` tables verified remotely.
- GIS configuration: PROVEN — exact staging origin accepted by Google; config endpoint returns enabled and expected client ID; no client secret uploaded.
- Runtime: PROVEN — health 200, `/cuenta` 200, GIS chooser opened, unauthenticated customer session returns 401.
- Remaining gate: HUMAN_INPUT — disposable Google account required for real first login, persistent cookie, logout, repeated login without duplication, customer/admin isolation, and guest regression.
- Evidence: `docs/evidence/TL-TC-TACO-CLUB-P1A-STAGING-2026-10-28.md`.
- Production: NOT_AUTHORIZED.

## Brand visual system — 2026-09-19

- Contract: PROVEN staging-only visual implementation — `docs/contracts/TL-TC-BRAND-VISUAL-01.md`.
- Brand source: PROVEN — `docs/brand/TL-BRAND-SOURCE.md`; supplied `manual tacoloco.pdf`, green skull pattern selected as primary.
- Brand tokens: PROVEN — `docs/brand/TL-BRAND-TOKENS.md`; approved manual-derived digital values documented.
- Local visual QA: PROVEN — `docs/evidence/TL-TC-BRAND-VISUAL-01-local-qa.md`; 17 test files/50 tests, typecheck, lint and vinext build pass; conventional Next build remains blocked by the pre-existing Worker-only `cloudflare:workers` health route.
- Independent Critic: PROVEN PASS — `docs/reviews/TL-TC-BRAND-VISUAL-01-independent-critic.md`.
- Integration Review: PROVEN PASS — `docs/reviews/TL-TC-BRAND-VISUAL-01-integration-review.md`.
- Staging visual validation: PROVEN PASS — `docs/evidence/TL-TC-BRAND-VISUAL-01-STAGING-2026-09-19.md`; exact candidate `23c1a6622f0b91d3a0ca2a95b0585a01acaef27c`, existing Worker/D1, static asset HTTP 200, no new infrastructure.
- Production: NOT_AUTHORIZED; stop at `HUMAN_BRAND_WORKFLOW_REVIEW`.

## Customer tracking return P0 — 2026-10-27

- Contract: PROVEN — `docs/contracts/TL-TC-ORDER-TRACKING-RETURN-P0.md`.
- Root cause: post-WhatsApp return had no durable pending handoff/resume path; the prior success-dialog session record was insufficient.
- Implementation: PROVEN — candidate `de368359ea18ced8571b8a36e20cd8f73f2f8d7a`; bounded browser handoff state, strict opaque-path validation, expiry, return/reload recovery, desktop pre-popup initialization, stale/new-cart protection and synchronous submitted-cart cleanup.
- Local QA: PROVEN — 53 tests, typecheck, lint and `build:vinext` PASS; conventional Next build remains limited by the known Worker-only `cloudflare:workers` health-route issue.
- Staging: PROVEN technical validation — existing Worker/D1, deployment `1a27db08-8753-4e17-8ded-238ad99a0a8c`, Chrome simulations at 390×844 and 1440×900, existing idempotency/tracking checks PASS.
- Independent Critic: PROVEN PASS — `docs/reviews/TL-TC-ORDER-TRACKING-RETURN-P0-independent-critic-2026-10-27.md`.
- Integration Review: PROVEN PASS — `docs/reviews/TL-TC-ORDER-TRACKING-RETURN-P0-integration-review-2026-10-27.md`.
- Human boundary: actual WhatsApp mobile-app/deep-link, WhatsApp Web and no-app behavior remain `HUMAN_TRACKING_WORKFLOW_REVIEW`; no message delivery is asserted.
- Production: NOT_AUTHORIZED.

## Taco Club P1a — optional Google identity foundation — 2026-10-27

- Contract: PROVEN local implementation — `docs/contracts/TL-TC-TACO-CLUB-P1A.md`.
- Candidate: `2beb582f80c1326736fc95164ebdb1f8b807db99`; execution/governance checkpoint: `2e5a14f06e8f54a5b289432f9de8125ed3ce8831`.
- Design/Implementation: PROVEN locally — additive Customer, CustomerIdentity, CustomerSession and nullable Order.customerId schema/migrations; separate hashed-token customer sessions; Google ID-token verification keyed by `sub`; GIS disabled by default.
- Validation: PROVEN locally — 22 test files/64 tests, typecheck, lint and `build:vinext` PASS. Lint has three pre-existing warnings; conventional Next build retains the known Worker-only `cloudflare:workers` limitation.
- Independent Critic: PROVEN PASS — `docs/reviews/TL-TC-TACO-CLUB-P1A-independent-critic-2026-10-27.md`.
- Integration Review: PROVEN PASS — `docs/reviews/TL-TC-TACO-CLUB-P1A-integration-review-2026-10-27.md`.
- Remote/provider validation: HUMAN_INPUT — no OAuth Client ID, authorized origin/redirect, consent/domain configuration or staging test account supplied; no remote migration, secret or deployment performed.
- Guest checkout, public tracking, WhatsApp-return recovery and admin authentication remain preserved. Issue #6 history/claim and loyalty are deferred.
- Production: NOT_AUTHORIZED.
