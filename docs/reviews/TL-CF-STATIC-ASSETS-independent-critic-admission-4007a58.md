# Independent Critic admission — TL-CF-STATIC-ASSETS-01

Status: `FROZEN_ADMITTED`
Candidate: `4007a5810c998a7c4478dfb4b054c9c612860a1a`
Baseline: `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`
Contract: `docs/contracts/TL-CF-STATIC-ASSETS-01.md`

## Critic scope

Review the exact candidate and evidence for the bounded local media adaptation. Do not modify files, correct the artifact, or infer remote/staging/production readiness.

## Canonical inputs

- `docs/contracts/TL-CF-STATIC-ASSETS-01.md`
- `docs/evidence/TL-CF-STATIC-ASSETS-4007a58.md`
- `docs/evidence/TL-CF-STATIC-ASSETS-OPERATOR-WORKFLOW.md`
- `docs/evidence/TL-MEDIA-STATIC-ASSETS-DECISION-2026-09-13.md`
- `INVARIANTS.md`
- candidate source/config files at `4007a5810c998a7c4478dfb4b054c9c612860a1a`

## Required checks

1. Static asset path and content-type behavior are directly supported by the artifact and runtime evidence.
2. Product create/edit remains available without self-service upload.
3. Upload UI/API and R2/Images runtime dependencies are actually absent from the candidate surface.
4. `Product.imageKey` validation and missing-image behavior are safe and compatible with the explicit media decision.
5. Prior D1/auth/order/event evidence is reused only for unaffected surfaces.
6. The evidence is exact, reproducible and does not imply remote or production readiness.
7. Cost-0 dependency graph is Workers + D1 + Workers Static Assets.

## Verdict constraint

Return exactly one: `PASS`, `REWORK`, `HUMAN_GATE`, or `CONTRACT_DEFECT`, with concise findings and evidence references. If PASS, identify the exact candidate and packet.
