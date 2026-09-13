# Taco Loco — Current Authoritative Project State
Updated: 2026-09-13
Mode: DELIVERY
Phase: VALIDATE
Status: STAGING_MANUAL_REVIEW_PREPARATION
Active contract: TL-STAGING-CATALOG-PARITY-01 (PASS; follow-up manual review preparation)
Application candidate: `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`
Frozen source: `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`
Production: `NOT_AUTHORIZED`

## Objective

Keep Taco Loco in the existing staging environment for human review. Do not reopen production eligibility until the human explicitly asks to do so.

## Active architecture

```text
Client
  -> Cloudflare Workers + vinext
       -> Cloudflare D1
       -> Workers Static Assets
```

R2, Cloudflare Images, Hyperdrive, external PostgreSQL, KV, Durable Objects, queues and VPS are not part of the initial target.

## Proven staging checkpoint

Candidate `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3` is proven in remote staging. Catalog parity is PASS with 7 active categories, 31 canonical published products, exact source values/modifiers, realistic order flow, auth/session/admin and event replay.

Existing staging resources remain the validation environment:
- Worker: `taco-loco-staging-20260913`
- D1: `taco-loco-staging-20260913`

## Human decisions 2026-09-13

- Production remains explicitly deferred until a future direct instruction from the human.
- Continue reviewing flows in staging.
- Before production reconsideration, make product images visible for manual review; temporary reuse of the existing Taco Loco Static Asset is acceptable where dedicated product photos are not available.
- Provide the human with known staging-only admin access for manual review without persisting credential secrets in repository/Drive evidence.
- `workers.dev` remains accepted as the preferred future initial zero-cost production URL, but this does not authorize production.

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
- Local implementation: PROVEN.
- Remote integration: PROVEN PASS.
- Catalog parity: PROVEN PASS.
- Manual staging review readiness: IN_PROGRESS.
- Production: NOT_AUTHORIZED_BY_EXPLICIT_HUMAN_HOLD.

## Next action

Prepare the existing staging environment for human manual review: temporary image coverage plus a known staging-only admin access path, then validate public/admin flows. Do not create, deploy or modify production resources. Production may be reconsidered only after a future explicit human instruction.
