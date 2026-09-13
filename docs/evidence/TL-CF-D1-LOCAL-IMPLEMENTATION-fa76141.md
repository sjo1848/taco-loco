# D1 Local Implementation Evidence — fa76141

Date: 2026-09-13  
Repository: `sjo1848/taco-loco`  
Branch: `migration/cloudflare-native`  
Substantive candidate: `fa76141` (`feat: add local D1 transactional adaptation`)  
Execution HEAD at evidence capture: `fa76141`

## Implementation

- Added `prisma/schema.d1.prisma` with SQLite-compatible mappings and generated Prisma D1 client.
- Added `d1/migrations/0001_initial.sql` for all current persisted models and relation actions.
- Added D1 binding `DB`; removed Hyperdrive/KV target bindings and KV cache adapter.
- Switched Worker database path to `@prisma/adapter-d1`.
- Added direct D1 batch order creation and conditional transition path because Prisma D1 transactions are not sufficient.
- Replaced PostgreSQL LISTEN/NOTIFY dependency with persisted OrderEvent cursor polling for admin SSE.
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

## Not yet proven

- True concurrent Worker invocations against D1 for order-number allocation and duplicate public intent.
- Full catalog/settings/auth/session runtime journey through D1 Worker binding.
- Remote staging, R2/Images account state, secrets, logs and production.
- The old PostgreSQL runtime path remains for Node/local historical compatibility.

## Engineering Evidence

- Problem: `PROVEN`.
- Design: `PROVEN`.
- Implementation: `PROVEN` for the bounded local D1 path.
- Validation: `PARTIAL`; deterministic local proof is proven, concurrency/full runtime journey remain.
- Release/Deployment: `UNKNOWN`.
- Maintenance/Operations: `UNKNOWN`.
- Judgment/Material Decisions: `PROVEN`.

## Next gate

Fresh Independent Critic review of candidate `fa76141`. No remote validation or production action is authorized before that review and any required integration review.
