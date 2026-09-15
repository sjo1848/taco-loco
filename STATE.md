# Taco Loco — Current Authoritative Project State
Updated: 2026-09-15
Mode: DELIVERY
Phase: IMPLEMENT / VALIDATE
Status: ORDER_FLOW_STAGES_BCD_IMPLEMENTED / STAGING_ORDER_FLOW_PASS
Active contract: TL-TC-ORDER-FLOW-01 (`STAGE_A_PASS / STAGING_ONLY`)
Application candidate: `e6f2465d827f853690ebc96d65db7030de5c484e`
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
- Active Task Contract: STAGES_BCD_IMPLEMENTED / STAGING_ONLY.
- Production: NOT_AUTHORIZED_BY_EXPLICIT_HUMAN_HOLD.

## Next action

Human review of the validated staging order-flow journey. Production remains unauthorized.
