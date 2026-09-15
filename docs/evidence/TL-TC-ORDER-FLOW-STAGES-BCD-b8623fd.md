# TL-TC-ORDER-FLOW-01 — Stages B–D rework evidence

- Exact substantive candidate: `b8623fd6fee5d0496e665bb718b774b663b82e26`
- Rework from: `00ac161dc2532ee21a6bbcf08a9fffeb9d35ec32`
- Production: `NOT_AUTHORIZED`; no remote resources changed.

The rework closes the critic findings by aligning the delivery confirmation type, making refund actions reachable for closed orders, requiring a `REPORTED` payment before one-action delivery confirmation, and adding payment report/reject workflow actions. The existing atomic D1/transaction paths are retained.

Validation on this candidate:

- `pnpm test -- --runInBand`: PASS — 12 files, 33 tests.
- Changed-file ESLint: PASS.
- Generated-cache-isolated `pnpm run typecheck`: PASS.
- `pnpm run build:vinext`: PASS.
- No production, staging, R2, Images, Hyperdrive, KV or external PostgreSQL action.

Independent Critic must review this exact rework candidate before staging admission.
