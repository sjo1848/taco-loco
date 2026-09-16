# TL-TC-ORDER-TRACKING-01 — Stage A Evidence

- Candidate: `1d96410c5b10d5275beaf61943ddde10732ea171`
- Scope: token capability, structured `OrderEvent.kind`, additive PostgreSQL/D1 migrations and atomic D1/PostgreSQL creation/workflow writes.
- Token: 32 random bytes, URL-safe base64url, nullable unique field, server-generated; client reference remains idempotency-only.
- Event invariant: public-menu Order, OrderLine, opaque token and `ORDER_CREATED` event are created in one D1 batch or one PostgreSQL transaction. Workflow mutations write their structured event kind in the same atomic operation.
- Migration: `prisma/migrations/20260916000000_order_tracking/migration.sql`, `d1/migrations/0003_order_tracking.sql`.
- Local D1 migration applied successfully; schema inspection confirmed `publicTrackingToken`, unique index and `OrderEvent.kind`.
- Tests: 50 Vitest tests; typecheck PASS after excluding only incompatible generated Next validator; affected-file ESLint PASS; `build:vinext` PASS.

Verdict: `TRACKING_STAGE_A_PASS`.
