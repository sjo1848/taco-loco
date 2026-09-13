# Taco Loco — Current Authoritative Project State
Updated: 2026-09-13
Mode: DELIVERY
Phase: RELEASE_PREPARATION
Status: HUMAN_GATE / PRODUCTION_RELEASE_AUTHORIZATION
Active contract: TL-CF-PRODUCTION-ELIGIBILITY-01
Production candidate: `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`
Frozen source: `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`

## Objective

Decide whether to release the proven Cloudflare-native candidate to a separate production environment. No production provisioning, deployment or cutover is authorized until the Human Gate resolves.

## Active architecture

```text
Client
  -> Cloudflare Workers + vinext
       -> Cloudflare D1
       -> Workers Static Assets
```

Active decisions:
- Workers/vinext is the application/API runtime.
- D1 is the structured/transactional store.
- `MEDIA_STATIC_ASSETS_INITIAL`: product images are Workers Static Assets versioned with application deployment.
- `MEDIA_SELF_SERVICE_UPLOAD_DEFERRED`: no admin/customer self-service image upload in the initial release.
- R2 is `SUPERSEDED_NOT_REQUIRED_INITIAL`.
- Cloudflare Images is `DEFERRED_NOT_REQUIRED_INITIAL`.
- Hyperdrive, external PostgreSQL, KV, Durable Objects, queues and VPS are not part of the initial target.
- Production release requires the current Human Gate.

## Proven release evidence

Exact candidate `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3` reached `REMOTE_INTEGRATION_PASS` with:
- real Cloudflare Worker + D1 + Static Assets validation;
- D1 migration PASS;
- Static Assets PASS;
- auth/session/logout PASS;
- orders/idempotency/transitions PASS;
- persisted events/SSE replay PASS;
- logs/runtime PASS;
- Independent Critic PASS;
- Integration Review PASS.

Two staging defects were corrected before the final candidate:
- D1-compatible health probing;
- BigInt-safe `OrderEvent.sequence` serialization.

The final candidate was revalidated locally and remotely after those corrections.

## Current infrastructure

Bounded staging remains provisioned and proven:
- Worker: `taco-loco-staging-20260913`;
- D1: `taco-loco-staging-20260913`.

R2, Images, Hyperdrive and KV were not provisioned.

## Production eligibility recommendation

If authorized, use a separate production Worker and separate production D1 while preserving staging. Initial public URL should default to `workers.dev` to preserve COST-0 unless a later decision chooses a custom domain.

Production data must be classified before release as either:
- `FRESH_PRODUCTION_BOOTSTRAP`; or
- `EXISTING_DATA_MIGRATION_REQUIRED`.

Staging test data is not production data.

## COST-0 posture

The initial production target remains Workers Free + D1 Free + Workers Static Assets. A future capacity/paid-plan change requires a separate Human Gate.

## Human Gate pending

Resolve explicitly:
1. authorize or reject production release of exact candidate `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`;
2. accept `workers.dev` as the initial zero-cost production URL or defer for another URL decision;
3. choose fresh production bootstrap or declare that existing live data must be migrated;
4. accept keeping staging available during the initial production period.

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
- Production eligibility: PREPARED.
- Production: NOT_AUTHORIZED.

## Next action

Stop at `HUMAN_GATE / PRODUCTION_RELEASE_AUTHORIZATION` and obtain the explicit release decisions. Do not deploy or cut over production before approval.