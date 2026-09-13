# Taco Loco — Current Authoritative Project State
Updated: 2026-09-13
Mode: DELIVERY
Phase: VALIDATE / RELEASE_PREPARATION
Status: STAGING_CATALOG_PARITY_PASS
Active contract: TL-STAGING-CATALOG-PARITY-01
Application candidate: `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`
Frozen source: `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`
Production: `NOT_AUTHORIZED`

## Objective

Keep the proven Cloudflare-native system in staging, restore the established Taco Loco catalog from the frozen source, validate the realistic menu/business journey, and only then reopen production authorization.

## Active architecture

```text
Client
  -> Cloudflare Workers + vinext
       -> Cloudflare D1
       -> Workers Static Assets
```

R2, Cloudflare Images, Hyperdrive, external PostgreSQL, KV, Durable Objects, queues and VPS are not part of the initial target.

## Proven technical checkpoint

Exact candidate `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3` reached `REMOTE_INTEGRATION_PASS` with Worker + D1 + Static Assets, auth/session/logout, orders/idempotency/transitions, events/SSE, logs/runtime, Independent Critic PASS and Integration Review PASS.

The existing staging resources remain the validation environment:
- Worker: `taco-loco-staging-20260913`
- D1: `taco-loco-staging-20260913`

## Human decisions 2026-09-13

- Production release is deferred; no production provisioning/deployment/cutover is authorized.
- Continue in staging.
- Before production, load and validate the established catalog from the former Taco Loco implementation.
- `workers.dev` is accepted as the preferred initial zero-cost URL when production is eventually authorized.
- Staging should remain available through this validation period and future initial release evaluation.

## Canonical catalog baseline

Source: `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48/prisma/seed.ts`

It defines 7 categories and 31 products plus modifier groups/options/associations. Catalog values must be copied from that source rather than invented.

This block changes staging data, not application code. Candidate `6eccc3a` remains the application candidate unless a real code/config defect requires REWORK.

## Source precedence
1. FALDEO Project Method v1.0 + Harness v1.
2. This file.
3. Active Task Contract.
4. `STATUS.json`.
5. Repo SHA + `docs/evidence/`.
6. Frozen source SHA.
7. Conversation is cache only.

## Current classifications
- Local implementation: PROVEN.
- Static Assets assurance: PROVEN.
- Remote integration: PROVEN PASS.
- Catalog parity in realistic staging: PROVEN PASS.
- Production eligibility: READY_TO_REOPEN_SEPARATE_HUMAN_GATE.
- Production: NOT_AUTHORIZED.

## Next action

`TL-STAGING-CATALOG-PARITY-01` passed against the existing staging environment. Reopen production eligibility as a separate Human Gate; do not deploy production during this contract.
