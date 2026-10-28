# Taco Loco — Current Authoritative Project State
Updated: 2026-10-27
Mode: DELIVERY
Phase: IMPLEMENT / VALIDATE
Status: REWORK_STAGING_VALIDATION / HUMAN_INPUT_REAL_GOOGLE_ACCOUNT
Active contract: TL-TC-TACO-CLUB-P1A (`REMOTE_VALIDATION_PARTIAL / HUMAN_INPUT_REAL_GOOGLE_ACCOUNT`)
Brand visual candidate: `23c1a6622f0b91d3a0ca2a95b0585a01acaef27c` (historical validated baseline)
Execution HEAD: resolve dynamically with `git rev-parse HEAD`; current checkpoint is `f6a6faa9a54e73b1bb09cdfab07031f74a3ccb11`.
Application candidate: `c9dc733d9dd6fdd12655c36786aae1c783ff53de`
Frozen source: `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`
Production: `NOT_AUTHORIZED`

## Objective

Execute `TL-TC-ORDER-FLOW-01` only in staging: separate pending intent from kitchen operation, add RETIRO/DELIVERY branching, manual transfer verification for DELIVERY, a low-friction operator console, end-of-day pending closure, no-show evidence and manual refund tracking. Do not reopen production eligibility.

## Active architecture

```text
Client
  -> Cloudflare Workers + vinext
       -> Cloudflare D1
       -> Workers Static Assets
```

R2, Cloudflare Images, Hyperdrive, external PostgreSQL, KV, Durable Objects, queues and VPS are not part of the initial target.

## Proven staging checkpoint

Candidate `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3` remains the proven remote integration baseline. The later technical candidate recorded above includes the current staging asset/review work. Catalog parity remains PASS with 7 active categories and 31 canonical published products.

Existing staging resources remain the only validation environment:
- Worker: `taco-loco-staging-20260913`
- D1: `taco-loco-staging-20260913`

## Human decisions — 2026-09-14

- `TL-xxxx` is assigned when the customer sends/submits the order.
- Do not request general customer name or phone in v1.
- `TL-xxxx` is the primary correlation reference with WhatsApp.
- RETIRO does not require prepayment; operator confirms after matching the WhatsApp message.
- DELIVERY requires minimal address data, optional reference, fixed configurable delivery fee and transfer before approval.
- DELIVERY customer provides only the transfer account holder name needed for manual reconciliation.
- `TL-xxxx` and transfer-holder name must be visible in both WhatsApp and admin.
- DELIVERY is admitted to operation only after the owner confirms the transfer impacted.
- No receipt upload, customer account, registration or OTP in the normal flow.
- Progressive friction is the governing UX principle.
- Normal operator transitions should be one-action transitions.
- Unconfirmed PENDING stays outside kitchen; no short timeout. Remaining PENDING closes at end of service day.
- NO_SHOW is recorded per order without automatic identity tracking or penalties in v1.
- A paid cancelled delivery can be tracked as `REFUND_REQUIRED -> REFUNDED`; money movement remains manual in v1.
- Production remains explicitly deferred until a future direct instruction from the human.

## Design authority

- HLD: `docs/product/TL-HIGH-LEVEL-WORKFLOWS.md`
- Active Task Contract: `docs/contracts/TL-TC-ORDER-FLOW-01.md`

The HLD Human Review is closed and the Task Contract is ready for staging execution.

## Media review posture

The frozen prior repository contains the Taco Loco logo; the target repository already contains the same bytes as the proven Static Asset `/products/taco-carne.jpg`.

For staging manual review only, products without a dedicated asset may temporarily reuse that proven Static Asset. This is not a final product-photo decision.

## Source precedence
1. FALDEO Project Method v1.0 + Harness v1.
2. This file.
3. Active Task Contract / latest validated staging evidence.
4. `STATUS.json`.
5. Repo SHA + `docs/evidence/`.
6. Frozen source SHA.
7. Conversation is cache only.

## Current classifications
- Existing local implementation: PROVEN.
- Existing remote integration: PROVEN PASS.
- Catalog parity: PROVEN PASS.
- Manual staging review readiness of current baseline: PROVEN PASS.
- Staging WhatsApp number: PROVEN PASS; `MenuSettings.whatsappPhone = 5492615956912`.
- Static product assets in staging: PROVEN PASS; 26 real WebP assets, 5 staging placeholders.
- Order-flow HLD: HUMAN_REVIEW_CLOSED.
- Order-flow Stage A implementation: TECHNICAL_PASS; exact candidate `d8d98f7196284ffe0464a562033241aebbaf4c3c`.
- Stage A Independent Critic: PASS; evidence `docs/reviews/TL-TC-ORDER-FLOW-STAGE-A-independent-critic-d8d98f7.md`.
- Stage A Integration Review: PASS; evidence `docs/reviews/TL-TC-ORDER-FLOW-STAGE-A-integration-review-d8d98f7.md`.
- Order-flow Stages B–D implementation: REWORKED to make the D1 generic delivery guard unconditional when required; local 38-test/typecheck/lint/build evidence passes. Exact candidate `e6f2465d827f853690ebc96d65db7030de5c484e`.
- Order-flow Stages B–D Independent Critic: PASS; evidence `docs/reviews/TL-TC-ORDER-FLOW-STAGES-BCD-independent-critic-e6f2465.md`.
- Order-flow Stages B–D Integration Review: PASS; evidence `docs/reviews/TL-TC-ORDER-FLOW-STAGES-BCD-integration-review-e6f2465.md`.
- Remote staging validation: STAGING_ORDER_FLOW_PASS; DELIVERY and PICKUP bounded journeys, server-side fee, payment gating, idempotency, events/replay, admin/session and runtime PASS. Evidence `docs/evidence/TL-TC-ORDER-FLOW-STAGING-e6f2465-delivery-2026-09-15.md`.
- Corrective workflow review: STAGING_MANUAL_REVIEW_PASS; authenticated `/admin` opens the operational order board, product CRUD remains at `/admin/products`, and pending PICKUP/DELIVERY orders arrive through SSE without refresh. Exact candidate `ea99ca83d7e6831833a97a11e21d5585c0903273`; evidence `docs/evidence/TL-STAGING-MANUAL-REVIEW-WORKFLOW-94719f8-2026-09-15.md`.
- Corrective workflow Independent Critic: PASS; evidence `docs/reviews/TL-STAGING-MANUAL-REVIEW-independent-critic-ea99ca8.md`.
- Corrective workflow Integration Review: PASS; evidence `docs/reviews/TL-STAGING-MANUAL-REVIEW-integration-review-ea99ca8.md`.
- Active Task Contract: STAGES_BCD_IMPLEMENTED / STAGING_ONLY.
- Production: NOT_AUTHORIZED_BY_EXPLICIT_HUMAN_HOLD.

## Next action

Stop at `HUMAN_INPUT_REAL_GOOGLE_ACCOUNT`: complete the Google chooser with a disposable test account so customer creation, cookie session, logout, repeat login and admin/customer isolation can be verified. Production remains unauthorized.

## Taco Club P1a UX correction — 2026-10-28

- Root cause confirmed: remote D1 had prior customer/identity/session rows, while `/cuenta` always rendered the login button and never queried the customer session after a successful POST.
- Candidate `c9dc733d9dd6fdd12655c36786aae1c783ff53de` adds explicit visitor/authenticating/authenticated/error UI states, welcome/logout, response validation and bounded customer-auth attempt limiting.
- Local validation: 23 test files/66 tests, typecheck, lint and `build:vinext` PASS; lint warnings remain pre-existing.
- Staging deployment: `360a1217-1a8f-4495-9c1a-b0cf364e6e18` on the existing Worker/D1 only.
- Real Google account journey remains pending human interaction; no staging PASS or critic PASS is claimed for this corrective candidate yet.

## Taco Club P1a — optional Google identity foundation — 2026-10-27

- Contract: `docs/contracts/TL-TC-TACO-CLUB-P1A.md`.
- Branch: `feature/tl-taco-club-p1a`.
- Substantive candidate: `2beb582f80c1326736fc95164ebdb1f8b807db99`; governance checkpoint: `4c5dffb` (`4c5dffb` is the current execution HEAD).
- Local implementation: `TECHNICAL_PASS`; evidence `docs/evidence/TL-TC-TACO-CLUB-P1A-LOCAL-2026-10-27.md`.
- Independent Critic: `PASS`; Integration Review: `PASS`.
- Added additive Customer, CustomerIdentity, CustomerSession and nullable Order.customerId structures for future optional identity. Added separate hashed-token customer sessions and server-side Google ID-token verification keyed by Google `sub`.
- Google Identity Services is disabled by default and does not load without an explicitly valid OAuth Client ID. Guest checkout, public tracking, WhatsApp-return recovery and admin authentication remain separate and unchanged.
- OAuth Client ID is configured only as a public staging variable. No client secret was used or uploaded. Remote migration and deployment are complete for the bounded staging checkpoint; real Google account validation remains pending. The next gate is `HUMAN_INPUT_REAL_GOOGLE_ACCOUNT`, not production authorization.
- Issue #6 history/claim, loyalty, promotions, guest-order claiming and account recovery are not implemented.

## Customer tracking return P0 — 2026-10-27

- Contract: `TL-TC-ORDER-TRACKING-RETURN-P0`.
- Root cause: the previous handoff existed only in the success-dialog session record; return events did not persist a pending tracking capability or navigate back to it.
- Candidate: `de368359ea18ced8571b8a36e20cd8f73f2f8d7a`.
- Local assurance: 53 tests PASS, typecheck PASS, lint PASS with three pre-existing warnings, `build:vinext` PASS. Conventional Next build retains the known Worker-only `cloudflare:workers` limitation.
- Staging deployment: `1a27db08-8753-4e17-8ded-238ad99a0a8c` on existing Worker/D1 only.
- Technical behavior: bounded 24-hour localStorage handoff, strict opaque path validation, return/reload recovery, desktop handoff initialization before popup, synchronous submitted-cart cleanup and stale/new-cart protection.
- Existing order creation, idempotency, D1, events, auth, payment, admin SSE and tracking polling were not changed.
- Independent Critic: PASS — `docs/reviews/TL-TC-ORDER-TRACKING-RETURN-P0-independent-critic-2026-10-27.md`.
- Integration Review: PASS — `docs/reviews/TL-TC-ORDER-TRACKING-RETURN-P0-integration-review-2026-10-27.md`.
- Browser staging simulation: PASS at 390×844 and 1440×900. Actual WhatsApp app/Web return remains human validation pending; message delivery is not claimed.
- Evidence: `docs/evidence/TL-TC-ORDER-TRACKING-RETURN-P0-2026-10-27.md`.
- Production: `NOT_AUTHORIZED`.

## Taco Club design checkpoint — 2026-10-27

- Planning authority: GitHub Epic #3 — `https://github.com/sjo1848/taco-loco/issues/3`.
- Independent issues: P0 #4, P1a #5, P1b #6, P1c #7, P2 #8.
- Design status: `HUMAN_GATE_PENDING`; no customer-account code, schema migration, external email provider or loyalty implementation authorized.
- Proposed P1 base: optional email/password identity with a separate hashed-token customer session, nullable `Order.customerId`, explicit claim from the existing tracking capability, and the existing `Order` + `OrderEvent` history as the only order history.
- Guest checkout and public tracking remain first-class and unchanged.
- Recovery email/provider, retention/erasure policy, guest-claim policy and commercial loyalty rules require explicit approval before implementation.
- Production remains `NOT_AUTHORIZED`.

## Brand visual checkpoint — 2026-09-19

- Source: supplied `manual tacoloco.pdf`; primary pattern is the approved green skull pattern.
- Asset: `public/brand/taco-loco-pattern-green.webp`; 302×336 WebP, extracted from the clean green pattern swatch without manual text or attribution.
- Tokens/docs: `docs/brand/TL-BRAND-SOURCE.md` and `docs/brand/TL-BRAND-TOKENS.md`.
- Local assurance: tests 50/50 PASS, typecheck PASS, lint PASS with three pre-existing warnings, `build:vinext` PASS; conventional `pnpm build` retains the known Worker-only `cloudflare:workers` health-route limitation.
- Critic: PASS — `docs/reviews/TL-TC-BRAND-VISUAL-01-independent-critic.md`.
- Integration: PASS — `docs/reviews/TL-TC-BRAND-VISUAL-01-integration-review.md`.
- Staging: PASS — existing Worker deployment `989ad8ef-48aa-4c57-a3c7-f94fff7ffd5d`; existing D1 and Static Assets only; no R2/Images/new resource.
- Evidence: `docs/evidence/TL-TC-BRAND-VISUAL-01-STAGING-2026-09-19.md`.
- Production: `NOT_AUTHORIZED`.
- Drive synchronization: `PASS_2026-09-19`; canonical brand contract, source/tokens, QA, reviews, evidence index and staging evidence synchronized to the existing Taco Loco Drive package.

## Customer tracking checkpoint — 2026-09-16

- Contract: `TL-TC-ORDER-TRACKING-01`.
- Candidate: `1d96410c5b10d5275beaf61943ddde10732ea171`.
- Stage A/B/C/D: PASS locally; 50 tests, typecheck, affected lint and `build:vinext` PASS.
- Independent Critic: PASS — `docs/reviews/TL-TC-ORDER-TRACKING-independent-critic-1d96410.md`.
- Integration Review: PASS — `docs/reviews/TL-TC-ORDER-TRACKING-integration-review-1d96410.md`.
- Public cursor is opaque; raw D1 sequence is not exposed. D1 safe-integer boundary is explicit and unsafe values fail safely.
- Remote staging: `REMOTE_INTEGRATION_PASS`; deployment `ef5cad20-2dbe-4e79-ba44-6a9e110f1143`, D1 migration `0003_order_tracking.sql`, bounded PICKUP/DELIVERY journeys and privacy/cursor/idempotency checks passed. Evidence: `docs/evidence/TL-TC-ORDER-TRACKING-STAGING-2026-09-16.md`.
- Production: `NOT_AUTHORIZED`.
- Drive snapshot: `PASS` — canonical state/evidence files and tracking artifacts synchronized to `Taco Loco — Codex / Cloudflare D1 — 2026-09-13`.
