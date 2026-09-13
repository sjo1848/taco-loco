# Task Contract — TL-CF-D1-MIG-01

## Task ID

`TL-CF-D1-MIG-01`

## Project / Mode / Phase

- Project: Taco Loco
- Mode: `DELIVERY`
- Phase: `DESIGN / VALIDATE`
- Current block: `D1_FEASIBILITY_REVIEW`
- Contract status: `ACTIVE`
- Created from recovery at execution HEAD `fbf9925a6b1ae0f69c83ba70872d37b9ff3039f5`

## Objective

Determine whether the current Taco Loco product can migrate from PostgreSQL to Cloudflare D1 while preserving product behavior, transactional semantics, operational invariants, and the authoritative Cloudflare-native / USD-0 infrastructure decision.

This increment is feasibility and review only. It does not authorize the D1 schema migration or production changes.

## Canonical inputs

- Repository: `sjo1848/taco-loco`, branch `migration/cloudflare-native`.
- Current execution HEAD: `fbf9925a6b1ae0f69c83ba70872d37b9ff3039f5`.
- Technical candidate: `ce36a2c81eba3f20aa7e4643a31771e8b85a23af`.
- Source baseline, read-only: `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`.
- `AGENTS.md`, `STATE.md`, `STATUS.json`, `INVARIANTS.md`, `MIGRATION.md`.
- `docs/MIGRATION-STRATEGY.md`, `docs/orchestration/RESUME.md`.
- Existing `TL-CF-MIG-01` contract, critic packet, critic PASS, integration PASS, and Engineering Evidence.
- `wrangler.jsonc`, `vite.config.ts`, `package.json`, Prisma schema/migrations, database/auth/catalog/order/media code and tests.
- Official platform references recorded in the feasibility artifact.

## Current recovered state

The old PostgreSQL/Hyperdrive migration contract has technical PASS and independent critic/integration PASS for candidate `ce36a2c`. Governance/evidence descendants through the current HEAD did not change the substantive artifact. The old operational path is blocked by unavailable external resources. The strategic Human Gate now supersedes that target with Cloudflare-native D1 and USD-0 feasibility review. Old PostgreSQL/Hyperdrive evidence remains historical and must not be deleted.

## Requirements

1. Preserve the implemented functional baseline: public menu, catalog, modifiers, media, admin auth and sessions, settings, orders, statuses, confirmation, idempotency/client references, persisted OrderEvents, ordering/replay, and operational behavior.
2. Classify every material D1 compatibility item as `COMPATIBLE`, `REQUIRES_ADAPTATION`, `BLOCKER`, or `UNKNOWN`.
3. Explicitly review UUIDs, uniqueness, FKs, cascades/restrict/set-null, JSON, indexes, dates, integers, autoincrement, transactions, isolation/concurrency, migrations, Prisma, auth, media, and order/event semantics.
4. Evaluate the current D1/Prisma transaction limitation against all multi-write order and admin operations.
5. Evaluate current `Order.orderNumber`, `OrderEvent.sequence`, idempotency, replay and concurrent transition behavior.
6. Evaluate Workers, D1, R2 and Images against the USD-0 constraint, including limits, headroom, over-limit behavior, billing activation and guardrails.
7. Keep Hyperdrive, external PostgreSQL, KV, Durable Objects, realtime infrastructure, VPS, Redis, queues, microservices and Kubernetes out of this increment.
8. Produce a local-first validation and migration plan with a complete gate-satisfiability mapping.

## Expected surfaces

- `docs/reviews/TL-CF-D1-FEASIBILITY.md`
- This contract and any necessary durable state/evidence index updates.
- No product implementation changes are authorized by this contract.

## Constraints

- PostgreSQL is the historical source of truth for the existing artifact; D1 is the proposed target for a later implementation.
- No behavior may be weakened to make D1 easier.
- No production resources, paid plans, production data migration, Hyperdrive, KV, VPS or external PostgreSQL provisioning.
- Local/deterministic evidence precedes any future remote validation.
- Current official platform documentation must be used for free-tier facts.

## Non-goals

- Implementing or applying D1 schema migrations.
- Replacing the Prisma data layer now.
- Designing future realtime, Durable Objects or unrelated features.
- Production deployment or cutover.
- Deleting or rewriting PostgreSQL migration/evidence history.

## Decision Latitude

The executor may inspect all repository surfaces, classify compatibility, document required adaptations, and create a disposable/local proof plan. It may recommend `PASS_FOR_LOCAL_MIGRATION` only if no material invariant is shown impossible and all implementation blockers are bounded as explicit adaptations. It may not silently change scope, semantics, or architecture decisions.

## Allowed actions

- Read repository, Git, local test/evidence and official documentation.
- Create/update this contract, the feasibility review, and honest governance/evidence state.
- Run bounded local deterministic checks that do not provision remote resources.
- Prepare an independent critic packet after a PASS recommendation.

## Forbidden actions

- D1 migration implementation unless a later contract authorizes it.
- Production or staging deployment, paid-plan enablement, resource provisioning, or data migration.
- Creating Hyperdrive, KV, external PostgreSQL, VPS, Durable Objects, realtime, Redis, queues or microservices.
- Destructive Git operations or modification of the historical source repository.
- Declaring release, staging or production readiness from this review.

## Required output

`docs/reviews/TL-CF-D1-FEASIBILITY.md` with the required 21 sections, one exact final recommendation, a compatibility matrix, cost-0 assessment, blockers/adaptations, and a resume point.

## Evidence required

- Recovery identity: repository, branch, HEAD, candidate, clean/dirty state, descendant classification.
- Current schema, migrations, adapter/runtime and relevant service/repository behavior.
- Official D1/Workers/R2/Images limits and failure behavior.
- Requirement → Producer → Evidence/Artifact → Consumer/Classifier → Failure behavior mapping for all future material gates.
- Honest Engineering Evidence states; no fabricated deployment or implementation evidence.

## Requirement → Expected Surface → Acceptance → Evidence

| Requirement | Expected surface | Acceptance | Evidence |
|---|---|---|---|
| Current truth recovered | Review §1–§3 | Identity and divergence are reproducible from Git/files | Git commands and durable file references |
| Product baseline preserved | Review §7–§8 | All listed subsystems appear in review; no silent scope reduction | Schema, service, route and test references |
| D1 compatibility classified | Review §9 | Every material item has classification, adaptation, acceptance, evidence and risk | Compatibility matrix |
| Transactional semantics preserved | Review §10 | Order create/transition/idempotency/event operations have a local proof gate | D1 batch/adapter analysis and planned tests |
| Cost-0 remains bounded | Review §13 | Limits, headroom assumptions, hard-failure/charge behavior and guardrails are explicit | Official Cloudflare links and monitoring gates |
| Remote gates satisfiable | Review §17 | No required gate can remain UNKNOWN while reporting GREEN | Gate-satisfiability table |
| Review independently assured | Critic packet | Fresh critic context reviews frozen artifact and canonical inputs | Durable critic admission/result |

## Learned Invariants contribution

Add only evidence-supported rules: `COST-0 / CLOUDFLARE-NATIVE`, data semantics take precedence over infrastructure convenience, free-tier components require requirement-backed justification, and local evidence precedes remote provider consumption. Existing PostgreSQL/Hyperdrive invariants remain historical for `TL-CF-MIG-01` and are not deleted.

## Engineering Evidence contribution

- Problem: `PROVEN` from current product and strategic decision.
- Design: `PROVEN` only for the documented feasibility conclusion and bounded target architecture.
- Implementation: `UNKNOWN` for D1 until implementation exists.
- Validation: `PARTIAL`; existing PostgreSQL candidate validation is proven, D1 behavior is not yet proven.
- Release/Deployment: `UNKNOWN`.
- Maintenance/Operations: `UNKNOWN` for D1; existing operational evidence remains historical.
- Judgment/Material Decisions: `PROVEN` when tied to the strategic Human Gate and cited platform facts.

## Done when

The review is complete, all material requirements are classified, cost-0 constraints are explicit, the exact recommendation is recorded, state/evidence synchronization is persisted, and—if recommendation is `PASS_FOR_LOCAL_MIGRATION`—a frozen independent critic packet is admitted without beginning implementation.

## Exit criteria

- `PASS_FOR_LOCAL_MIGRATION`: D1 is feasible with bounded adaptations and a local proof is the next authorized implementation gate.
- `REWORK`: review defect or missing analysis can be corrected inside this contract.
- `HUMAN_GATE`: strategy, cost, unsafe free-tier assumption, irreversible trade-off, or production-level decision requires authority.
- `CONTRACT_DEFECT`: mandatory acceptance cannot be produced or consumed under this contract.

## Human Gate triggers

- Any paid plan, unavoidable charge, unsafe free-tier assumption, or material uncertainty about account billing.
- A material product invariant cannot be preserved without a scope or behavior decision.
- A required realtime/operational behavior has no acceptable replacement within the stated target.

## Stop condition

Stop only at a legitimate `HUMAN_GATE`, `HUMAN_ACTION`, `HUMAN_INPUT`, external access blocker, unresolved contract defect, or demonstrated D1 architecture blocker. Routine review rework remains autonomous.

## Handoff / Resume Point

After review persistence, freeze the exact artifact and candidate. If recommendation is `PASS_FOR_LOCAL_MIGRATION`, admit a fresh Independent Critic packet. Do not start D1 implementation until critic PASS. If critic PASS, create a bounded local D1 implementation contract; remote validation remains later and production remains unauthorized.
