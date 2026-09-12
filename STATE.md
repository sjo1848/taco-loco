# Taco Loco — Current Authoritative Project State
Updated: 2026-09-12
Mode: DELIVERY
Phase: VALIDATE
Status: CRITIC_REVIEW_BLOCKED
Active contract: TL-CF-MIG-01
Technical candidate: `ce36a2c81eba3f20aa7e4643a31771e8b85a23af`
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
Baseline parity remains PASS; Functional QA PASS; security audit passes the contract high-severity threshold (exit 0; two moderate advisories remain); lint/typecheck/tests/build:vinext PASS. Hyperdrive and Workers media adapters are present.

## Current blocker
The prior independent critic returned REWORK because candidate/evidence identities diverged and the prior security evidence was stale. The dependency repair is now committed as the exact technical candidate; a fresh independent critic verdict is still required.

## Engineering evidence
Implementation/Validation: PROVEN for the current increment.
Release/Deployment and Maintenance/Operations: UNKNOWN.

## Next authorized action
Invoke a logically independent critic context against the reconciled critic packet. Persist PASS / REWORK / HUMAN_GATE / CONTRACT_DEFECT. Do not begin realtime/Durable Objects until that verdict exists.

## Stale check
Before resume, verify branch HEAD, technical candidate identity, `STATUS.json`, contract and latest evidence. If product/code changes materially, rerun required evidence.
