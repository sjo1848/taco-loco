# D1 Local Implementation Evidence — 0fe52c7 rework

Date: 2026-09-13  
Repository: `sjo1848/taco-loco`  
Branch: `migration/cloudflare-native`  
Prior candidate: `fa76141` (`feat: add local D1 transactional adaptation`)
Substantive rework candidate: `0fe52c73b69756a2d65bc7cab013690ba0a2d60f` (`fix: complete local D1 runtime rework`)
Execution HEAD at evidence capture: `0fe52c7`

## Implementation

- Added `prisma/schema.d1.prisma` with SQLite-compatible mappings and generated Prisma D1 client.
- Added `d1/migrations/0001_initial.sql` for all current persisted models and relation actions.
- Added D1 binding `DB`; removed Hyperdrive/KV target bindings and KV cache adapter.
- Switched Worker database path to `@prisma/adapter-d1`.
- Added direct D1 batch order creation and conditional transition path because Prisma D1 transactions are not sufficient.
- Replaced PostgreSQL LISTEN/NOTIFY dependency with persisted OrderEvent cursor polling for admin SSE.
- Bounded the cursor-polling stream to 50 seconds and 100 events per poll.
- Configured Prisma's client engine for Workers with an explicit compiled WASM module and removed the Node standalone output that is not part of the Worker target.
- Preserved the historical PostgreSQL schema/migrations and Node database path.

## Executable validation

- `prisma validate --schema prisma/schema.d1.prisma`: PASS.
- `wrangler d1 migrations apply DB --local`: PASS; 22 migration commands.
- `d1/verification/atomic-proof.sql` via Wrangler local D1: PASS.
  - Order persisted with unique order number and client reference.
  - Modifier JSON round-trip returned `Roja`.
  - Event replay returned deterministic sequences 1 and 2.
  - Conditional transition reached `CONFIRMED`.
- Duplicate `Order.clientReference`: rejected with SQLite UNIQUE constraint.
- Category delete with dependent Product: rejected with FK constraint.
- Order delete cascaded to OrderLine and OrderEvent; both counts returned zero.
- D1 atomic adapter tests: 3 passed.
- Full Vitest regression: 13 files / 33 tests passed.
- Typecheck: PASS.
- ESLint: PASS.
- vinext Worker build: PASS.
- `wrangler deploy --dry-run` from generated Worker config: PASS; D1 binding visible, no deployment.
- Local Worker HTTP smoke: PASS; real D1-backed public intent returned `201`.
- Local Worker concurrent duplicate intent: PASS; four simultaneous requests for one `clientReference` produced one `201`, three `200 reused`, one order, one line and one event.
- Local Worker concurrent distinct intents: PASS; two simultaneous distinct references produced unique order numbers 3 and 4.
- Local Worker runtime loaded Prisma query compiler WASM through the compiled-WASM bundle rule; no remote resource was used.
- `rollback-proof.sql` through local D1: PASS; the invalid FK second write caused the preceding order insert to be absent afterward.

## Not yet proven

- Full catalog/settings/auth/session runtime journey through D1 Worker binding.
- Remote staging, R2/Images account state, secrets, logs and production.
- The old PostgreSQL runtime path remains for Node/local historical compatibility; it is not used by the Worker runtime.

## Engineering Evidence

- Problem: `PROVEN`.
- Design: `PROVEN`.
- Implementation: `PROVEN` for the bounded local D1 path.
- Validation: `PARTIAL`; bounded Worker order/idempotency/runtime proof is proven, while full catalog/settings/auth/session journey remains.
- Release/Deployment: `UNKNOWN`.
- Maintenance/Operations: `UNKNOWN`.
- Judgment/Material Decisions: `PROVEN`.

## Critic rework result

The first Independent Critic returned `REWORK` for `fa76141`, identifying unproven true Worker concurrency, rollback evidence and an unbounded event stream. Candidate `0fe52c7` addresses those findings with the executable evidence above. A new critic must review this exact candidate and this updated evidence from a fresh context.

## Next gate

Fresh Independent Critic review of candidate `0fe52c7`. No remote validation or production action is authorized before that review and any required integration review.
