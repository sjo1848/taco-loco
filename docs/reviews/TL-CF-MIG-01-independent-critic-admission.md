# TL-CF-MIG-01 — Independent Critic Admission Packet

Status: READY_FOR_INDEPENDENT_REVIEW / ASSURANCE_BLOCKED
Technical candidate: `c385a7b31d26d9e27625982e49e0e0cc8a854604`
Governance contract: `TL-CF-MIG-01`
Frozen source: `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`

## Required independent inputs
- `docs/contracts/TL-CF-MIG-01.md`
- `INVARIANTS.md`
- `STATUS.json`
- `docs/evidence/DICS-BUNDLE-latest.md`
- `docs/evidence/bundle-functional-qa.txt`
- `docs/evidence/bundle-security-audit.txt`
- `docs/evidence/bundle-vinext-build.txt`
- diff `41deb8f82b07fb08b2cdec9cc880b99382a35f41..c385a7b31d26d9e27625982e49e0e0cc8a854604`

## Admission facts
- Functional/Engineering QA failures: 0
- Security audit exit: 0
- vinext build exit: 0
- PostgreSQL remains transactional truth.
- D1 is out of scope.
- Media Workers path is isolated through Vite aliases to Images + R2 adapters.
- DB Workers path is isolated through Vite alias to Prisma adapter-pg + Hyperdrive.
- Realtime replacement is explicitly not closed by this contract.
- No production deploy/cutover evidence is claimed.

## Review questions
1. Does the candidate satisfy every TL-CF-MIG-01 requirement without product-scope expansion?
2. Do the Worker adapters preserve the required observable/server-side semantics for this readiness increment?
3. Is any PASS based on stale or non-surface-correct evidence?
4. Are security findings genuinely closed rather than suppressed?
5. Are any release/deployment claims being over-inferred from build/QA?
6. Are there P0/P1 findings that block contract closure?

## Allowed verdicts
`PASS | REWORK | HUMAN_GATE | CONTRACT_DEFECT`

## Independence rule
The implementation/orchestration context that produced or repaired the candidate must not emit the final Independent Critic PASS. If no logically independent reviewer/runtime is available, keep this gate blocked rather than self-approve.
