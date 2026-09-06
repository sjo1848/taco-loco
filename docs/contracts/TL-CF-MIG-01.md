# TL-CF-MIG-01 — Baseline Parity & Cloudflare Readiness
Method: FALDEO Project Method v1.0
Mode: DELIVERY
Phase: VALIDATE
Status: CRITIC_REVIEW

## Objective
Preserve the frozen Taco Loco baseline while establishing a non-destructive Workers/vinext path with PostgreSQL/Prisma retained.

## Canonical inputs
Frozen source SHA; `STATE.md`; `STATUS.json`; `INVARIANTS.md`; target branch; `docs/evidence/`.

## Requirements
- frozen behavior/schema/assets preserved;
- PostgreSQL remains transactional truth;
- Workers build succeeds;
- high-severity audit blockers are zero or independently dispositioned;
- media and DB Workers adapters preserve required behavior;
- exact candidate/evidence convergence;
- no production cutover.

## Constraints / non-goals
No source writes, product features, D1 migration, or production deploy. Realtime replacement is not closed merely by a successful Workers build.

## Decision latitude
Repair compatibility, dependencies, build and adapters while preserving product/data semantics. No scope expansion or release authority.

## Evidence required
Exact SHA; Functional/Engineering QA; security audit; vinext evidence; relevant adapter source; Independent Critic verdict.

## Learned invariants
No PASS from stale evidence; build PASS != release PASS; security is not traded for convenience; technical blockers are REWORK, not Human Gates; source stays read-only.

## Done when
Required technical gates PASS, Independent Critic PASS, and state/evidence/candidate converge.

## Human Gate triggers
Only strategy, scope, material cost/risk, irreversibility or release decisions.

## Stop condition
Persist the Independent Critic verdict. Do not enter realtime/Durable Objects in this block.
