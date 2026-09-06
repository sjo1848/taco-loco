# Taco Loco — Current Authoritative Project State
Updated: 2026-09-06
Mode: DELIVERY
Phase: VALIDATE
Status: CRITIC_REVIEW_BLOCKED
Active contract: TL-CV-MIG-01
Technical candidate: `c385a7b31d26d9e27625982e49e0e0cc8a854604`
Frozen source: `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`

## Objective
Complete the Cloudflare-native migration without changing Taco Loco product behavior or transactional semantics.

## Active decisions
- Source repo remains read-only.
- PostgreSQL remains transactional truth; D1 is out of scope.
- Workers/vinext is target runtime.
- Prisma Workers path uses adapter-pg + Hyperdrive.
- Media Workers path uses Images + R2.
- No product features during migration.
- Production cutover requires a future Human Gate.

## Source precedence
1. FALDEO Project Method v1.0 + Harness v1 define operating semantics.
2. This file governs current project state.
3. Active Task Contract governs scope/stop.
4. `STATUS.json` governs live orchestration state.
5. Repo SHA + `docs/evidence/` govern technical claims.
6. Frozen source SHA governs original baseline behavior.
7. Conversation is cache only.

## Validated at current migration line
Baseline parity PASS; Functional QA PASS; Security Audit PASS; vinext check/init/build PASS; Engineering QA PASS. Hyperdrive and Workers media adapters are present.

## Current blocker
Independent Critic cannot honestly be closed from the implementation/orchestration context itself. No separate reviewer/runtime is currently available in the active tool surface. This is an assurance blocker, not a technical failure and not a Human Gate.

## Engineering evidence
Implementation/Validation: PROVEN for the current increment.
Release/Deployment and Maintenance/Operations: UNKNOWN.

## Next authorized action
Provision or invoke a logically independent critic context against the frozen critic packet. Persist PASS / REWORK / HUMAN_GATE / CONTRACT_DEFECT. Do not begin realtime/Durable Objects until that verdict exists.

## Stale check
Before resume, verify branch HEAD, technical candidate identity, `STATUS.json`, contract and latest evidence. If product/code changes materially, rerun required evidence.
