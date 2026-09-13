# Taco Loco — Current Authoritative Project State
Updated: 2026-09-13
Mode: DELIVERY
Phase: VALIDATE / RELEASE_PREPARATION
Status: REMOTE_STAGING_ACTIVE / STATIC_ASSETS
Active contract: TL-CF-D1-REMOTE-STAGING-01
Remote staging candidate: `4007a5810c998a7c4478dfb4b054c9c612860a1a`
Current branch HEAD before this governance reactivation: `bf87b1dc968744e969b0687f074f454bb150eacc`
Prior validated D1 candidate: `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`
Frozen source: `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`

## Objective
Complete bounded real-provider staging validation for the Cloudflare-native migration while preserving Taco Loco behavior and the COST-0 initial architecture.

## Active architecture

```text
Client
  -> Cloudflare Workers + vinext
       -> Cloudflare D1
       -> Workers Static Assets
```

Active decisions:
- Workers/vinext is the application/API runtime.
- D1 is the target structured/transactional store.
- `MEDIA_STATIC_ASSETS_INITIAL`: product images are Workers Static Assets versioned with the application deployment.
- `Product.imageKey` stores/resolves a public static asset path.
- `MEDIA_SELF_SERVICE_UPLOAD_DEFERRED`: no admin/customer self-service image upload in the initial release.
- R2 is `SUPERSEDED_NOT_REQUIRED_INITIAL`; no R2 enablement, bucket or binding is required.
- Cloudflare Images is `DEFERRED_NOT_REQUIRED_INITIAL`.
- Hyperdrive, external PostgreSQL, KV, Durable Objects, queues and VPS are not part of the initial target.
- Production cutover requires a future Human Gate.

## Assurance entering remote staging

Exact candidate `4007a5810c998a7c4478dfb4b054c9c612860a1a` has:
- Static Assets local TECHNICAL_PASS;
- tests 31/31 PASS;
- typecheck PASS;
- changed-file ESLint PASS;
- vinext build PASS;
- Wrangler dry-run PASS;
- local runtime proof for representative asset and removal of legacy media routes;
- Independent Critic PASS;
- Integration Review PASS.

Prior D1 evidence from candidate `5d0a1bf` remains reusable for unchanged D1/auth/order/event semantics.

## Current authorized work

Reactivate and execute bounded remote staging against Workers + D1 + Workers Static Assets.

Remote validation must resolve the mandatory gate map rows with real provider evidence for:
- Worker deployment/runtime;
- D1 binding/schema/reads/writes;
- auth/admin/session;
- orders/idempotency/transitions;
- persisted events/replay;
- Static Assets delivery and D1 image reference;
- required secrets/bindings;
- observability;
- behavior parity;
- COST-0/free-tier guardrail.

No remote stress testing is required where local evidence already proves the property.

## Constraints

Not authorized:
- production deployment/cutover;
- paid plan or intentional billable usage;
- R2;
- Cloudflare Images;
- Hyperdrive/external PostgreSQL;
- KV;
- Durable Objects;
- queues;
- unrelated product changes.

If a substantive application change is required during staging, classify `REWORK`, create a new exact candidate and rerun affected local assurance before resuming remote validation.

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
- Remote integration: ACTIVE / NOT YET PROVEN.
- Production: NOT_AUTHORIZED.

## Next authorized action
Execute `TL-CF-D1-REMOTE-STAGING-01` against exact candidate `4007a5810c998a7c4478dfb4b054c9c612860a1a` using the minimum remote resources required by Workers + D1 + Static Assets. Persist evidence and stop at `REMOTE_INTEGRATION_PASS`, legitimate HUMAN_GATE/HUMAN_ACTION/HUMAN_INPUT, REWORK, EXTERNAL_BLOCKER or CONTRACT_DEFECT.
