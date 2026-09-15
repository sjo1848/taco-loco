# TL-TC-ORDER-FLOW-01 — Stage A rework evidence

- Substantive candidate: `d8d98f7196284ffe0464a562033241aebbaf4c3c`
- Governance/evidence predecessor: `84ccf20a58775cd8e891d3d3b2a7675f16fbb347`
- Branch: `rework/tl-order-flow-01`
- Scope: close the Independent Critic finding by proving the exact `DELIVERY` value is bound to the D1 order INSERT.

## Rework closure

`src/modules/orders/d1-atomic.test.ts` now captures statement bindings in the D1 fake and asserts `bindings[0][1] === "DELIVERY"` for `createD1OrderWith`. This prevents a hardcoded `PICKUP` writer from passing the test. No schema, SQL, production resource or remote environment changed.

## Evidence

| Check | Result |
|---|---|
| `pnpm test -- --runInBand` | PASS — 12 files, 32 tests |
| changed-file ESLint | PASS — `d1-atomic.ts`, `d1-atomic.test.ts` |
| `pnpm run db:migrate:d1:local` | PASS — no pending migrations; `0002` was already applied locally |
| `pnpm run build:vinext` | PASS on this candidate; generated Worker routes and D1/Static Assets bindings |
| D1 schema proof | PASS — Stage A columns and indexes present in local D1 |
| typecheck | PASS with stale `.next` cache isolated and restored; direct stale mixed Next/vinext artifact failure is tooling-only |

The known full CI lint issue remains outside Stage A (`src/types/wasm.d.ts` rule and `d1/verification/proof-worker.ts` warning). Production remains `NOT_AUTHORIZED`; remote staging remains unauthorized until Stage A assurance is complete.
