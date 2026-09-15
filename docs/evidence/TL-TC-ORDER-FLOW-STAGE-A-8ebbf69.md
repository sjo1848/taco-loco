# TL-TC-ORDER-FLOW-01 — Stage A evidence

## Candidate

- Branch: `rework/tl-order-flow-01`
- Exact technical candidate: `8ebbf699afa990677f821a8926f273af293128b0`
- Candidate ancestry: descendant of `origin/migration/cloudflare-native`; no production action.
- Scope: Stage A order-flow domain model, PostgreSQL/D1 migrations, and D1 writer type/test alignment.

## Contract result

Stage A preserves the existing order, line, `clientReference`, `OrderEvent`, sequence and replay surfaces while adding the contract dimensions for delivery, verification, payment and refund. Legacy rows receive safe defaults (`VERIFIED`, `NOT_REQUIRED`, `NOT_REQUIRED`, and zero delivery fee). `DELIVERY` is accepted by the D1 atomic writer and covered by an executable test.

## Executed evidence

| Requirement | Producer | Evidence | Result |
|---|---|---|---|
| D1 schema migration applies locally | `wrangler d1 migrations apply DB --local` | `d1/migrations/0002_order_flow_dimensions.sql` | PASS; 19 commands applied on first run; subsequent exact-candidate run reports no pending migrations |
| New D1 columns exist | local D1 `PRAGMA table_info` | local DB schema | PASS; order verification/payment/refund/delivery fields and settings delivery fields present |
| Atomic writer accepts delivery | `createD1OrderWith` | `src/modules/orders/d1-atomic.test.ts` | PASS; explicit `DELIVERY` case |
| Existing behavior tests | `pnpm test -- --runInBand` | Vitest | PASS; 12 files, 32 tests |
| Changed-file lint | ESLint on Stage A order files | command output | PASS |
| Prisma schemas | `prisma validate`, `db:generate`, `db:generate:d1` | Prisma output | PASS |
| Worker build | `pnpm run build:vinext` | generated `dist/server/wrangler.json` | PASS |
| Worker packaging/config | Wrangler dry-run with generated config | binding inventory | PASS; D1 + Static Assets only |
| Typecheck | `pnpm run typecheck` with stale `.next` isolated and restored | TypeScript | PASS; direct run against stale mixed Next/vinext artifact is a tooling-surface failure only |

## Known baseline tooling findings

The existing full CI lint job fails before later gates on the pre-existing `src/types/wasm.d.ts` rule (`@next/next/no-assign-module-variable`) and reports a warning in `d1/verification/proof-worker.ts`; Stage A did not modify either file. A direct full lint scan also traverses generated build output and did not complete within the bounded local run. These are recorded as baseline/tooling findings, not Stage A regressions; changed-file lint passes.

## Assurance state

- First Independent Critic verdict: `REWORK`; requested an executable `DELIVERY` writer test and exact-SHA evidence.
- Rework completed in scope in commits `78903c8` and `8ebbf69`.
- New Independent Critic is required before Stage A admission.
- Integration Review remains pending and no Stage B or remote staging work is authorized by this artifact.
- Production: `NOT_AUTHORIZED`.
