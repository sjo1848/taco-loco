# Task Contract — TL-CF-D1-LOCAL-IMPLEMENTATION-01

## Task ID / Project / Mode / Phase

- Task ID: `TL-CF-D1-LOCAL-IMPLEMENTATION-01`
- Project: Taco Loco
- Mode: `DELIVERY`
- Phase: `IMPLEMENT / VALIDATE`
- Parent contract: `TL-CF-D1-MIG-01`
- Status: `IMPLEMENTATION_COMPLETE / CRITIC_PENDING`

## Objective

Implement and validate the smallest local D1 path that can prove Taco Loco's current product and transactional semantics remain intact. This contract authorizes local/disposable work only; it does not authorize remote staging, paid resources, production data, or production cutover.

## Canonical inputs / current state

- Feasibility candidate: `ce36a2c81eba3f20aa7e4643a31771e8b85a23af`.
- Substantive implementation candidate: `fa76141928bf60f9259ba24a462468e0834b6b3a`.
- Execution HEAD after implementation: `fa76141928bf60f9259ba24a462468e0834b6b3a`.
- Feasibility review: `docs/reviews/TL-CF-D1-FEASIBILITY.md` — `PASS_FOR_LOCAL_MIGRATION`.
- Independent Critic: `docs/reviews/TL-CF-D1-MIG-01-independent-critic-2026-09-13.md` — `PASS`.
- Product schema, migrations, repositories/services, tests and current Worker/vinext configuration.

## Requirements

1. Use a disposable local D1/SQLite database and do not touch production or remote resources.
2. Preserve all current models and product behavior; no silent scope reduction.
3. Prove atomic all-or-nothing behavior for order creation, public intent idempotency, status transition and event append.
4. Prove `Order.orderNumber` and `OrderEvent.sequence` representation, uniqueness, deterministic ordering, concurrent behavior, replay and acceptable gap semantics.
5. Preserve foreign-key actions, JSON snapshots/settings, date/UTC behavior, uniqueness, indexes, auth/session expiry and admin authorization.
6. Replace or isolate PostgreSQL LISTEN/NOTIFY with a bounded persisted-replay-compatible local behavior; do not introduce Durable Objects or unrelated realtime infrastructure.
7. Keep R2/Images work limited to local compatibility fixtures; do not provision them.
8. Run deterministic typecheck/lint/tests/build and record evidence with exact SHA.

## Expected surfaces

Potentially affected only after an implementation plan is proven: Prisma schema/provider and generation, D1 adapter/binding seam, database repositories/services, order event delivery seam, migrations, tests, and local Worker configuration. The implementer must list every changed file and preserve the old PostgreSQL evidence/history.

## Constraints / non-goals

- No remote deployment, D1 database creation, R2/Images enablement, secrets, paid plan, Hyperdrive, external PostgreSQL, KV, DO, queues, Redis, or production data.
- No production cutover and no claim of staging/release readiness.
- Do not hide adapter limitations by removing transactions, events, idempotency or admin behavior.
- Stop before any change that requires a strategic, scope, cost or irreversible decision.

## Decision Latitude

The specialist may make bounded local implementation choices that preserve the contract, including direct D1 `batch()` use where Prisma cannot express required atomicity. It may not change public behavior, relax invariants, or decide the live-event product contract. Any conflict is `REWORK`, `HUMAN_GATE`, or `CONTRACT_DEFECT` as applicable.

## Required output and evidence

- Local implementation artifact(s), exact changed-file list and candidate SHA.
- D1 schema/migration reproducibility evidence.
- Failure-injection evidence for atomicity and rollback.
- Concurrency/idempotency/sequence/replay evidence.
- Auth/catalog/order/media regression evidence.
- Engineering Evidence update: D1 Implementation can become `PROVEN` only for what was actually built; remote deployment remains `UNKNOWN`, production `NOT_AUTHORIZED`.

## Acceptance matrix

| Requirement | Producer | Evidence | Consumer/classifier | Failure behavior |
|---|---|---|---|---|
| Atomic order writes | D1 batch/repository path | Failure injection tests | QA/critic | `REWORK`; no remote run |
| Idempotent public intent | Unique clientReference plus retry path | Concurrent duplicate test | QA/critic | `REWORK` or `BLOCKER` if unpreservable |
| Deterministic event sequence/replay | Sequence allocation and cursor reader | Concurrent append/replay test | QA/critic | `REWORK` or architecture blocker |
| Status transition consistency | Conditional update + event batch | Race test | QA/critic | `REWORK` |
| Auth/session persistence | D1 session repository | Login/expiry/logout tests | QA/critic | `REWORK` |
| Live admin behavior | Persisted replay adapter | Cursor/reconnect test | QA/critic | `REWORK`/`HUMAN_GATE` if behavior decision required |
| Cost-0 local constraint | Local bindings/config only | No remote billing/resource mutation | Orchestrator | Stop before remote action |

## Learned Invariants / Engineering Evidence

Apply all invariants in `INVARIANTS.md`, especially data semantics over infrastructure convenience, COST-0, local-before-remote, exact SHA/evidence, and separate critic gate. Contribute to Problem/Design/Implementation/Validation/Judgment only with observed evidence; Release/Deployment and production remain `UNKNOWN`/`NOT_AUTHORIZED`.

## Done when / exit criteria

Done when the local D1 path passes deterministic semantic tests and is ready for a fresh Independent Critic, or produces a durable blocker/adaptation finding. Candidate `fa76141` has deterministic local PASS evidence; true concurrent invocation and full D1 runtime journey remain critic-visible gaps. A local build alone is insufficient. No remote action is permitted until local `LOCAL_INTEGRATION_PASS` and a subsequent critic/integration decision.

## Human Gate / stop conditions

Stop at a material invariant that cannot be preserved, any required product/realtime scope decision, any paid/remote resource requirement, missing unique human input, or contract defect. Mechanical test/tool failures require bounded rework first.

## Handoff / Resume Point

After implementation, self-check and evidence update, launch a fresh Independent Critic for the local candidate. Integration Review is then considered only if multiple changed surfaces compose with material cross-cutting risk. Remote bounded validation comes later; production remains unauthorized.
