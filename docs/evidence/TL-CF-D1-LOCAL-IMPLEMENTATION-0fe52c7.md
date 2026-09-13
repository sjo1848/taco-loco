# D1 Local Implementation Evidence — 0fe52c7

Date: 2026-09-13  
Repository: `sjo1848/taco-loco`  
Branch: `migration/cloudflare-native`  
Implementation candidate: `0fe52c73b69756a2d65bc7cab013690ba0a2d60f`
Verification candidate: `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`
Execution HEAD at evidence capture: `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`

This is the exact rework evidence packet. The prior candidate `fa76141` received Independent Critic `REWORK`; the rework is described in `docs/reviews/TL-CF-D1-LOCAL-IMPLEMENTATION-independent-critic-2026-09-13-rework.md`. The verification candidate contains the self-contained harnesses used for the proofs below.

## Rework evidence

### Actual D1.batch rollback

Harness: `d1/verification/proof-worker.ts`, `d1/verification/proof-wrangler.jsonc`, `scripts/d1-local-runtime-proof.sh`, and the integrated runner `scripts/d1-local-integration-proof.sh`.

Commands:

```text
pnpm exec wrangler d1 migrations apply DB --local --config d1/verification/proof-wrangler.jsonc --persist-to /home/sjo1848/dev/taco-loco/.wrangler/proof-state
./scripts/d1-local-runtime-proof.sh
```

Result:

```json
{"batch":"DB.batch","failed":true,"error":"D1_ERROR: FOREIGN KEY constraint failed: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_FOREIGNKEY)","remaining":0}
```

The proof Worker uses the real local D1 binding and `env.DB.batch([...])`; the first order insert is absent after the invalid second statement fails.

### Actual concurrent Worker requests

Harness: `scripts/d1-local-concurrency-proof.sh`, invoked by `scripts/d1-local-integration-proof.sh`. The integrated runner builds the Worker, creates a disposable local D1 persistence directory, applies migrations, seeds fixtures, starts the real Worker, sends four concurrent requests with one `clientReference` and two concurrent requests with distinct references, verifies SQL counts and tears down both Worker processes and the database directory.

Command:

```text
./scripts/d1-local-integration-proof.sh
```

Representative output from the exact run:

```text
rollback_assertions: PASS, remaining: 0
same-reference: one HTTP 201, three HTTP 200 with the same order id/orderNumber 101
distinct-a: HTTP 201, orderNumber 102
distinct-b: HTTP 201, orderNumber 103
assertions: PASS, duplicate_requests: 4, distinct_requests: 2
transition_race: PASS, statuses: [200, 409]
sse_cursor_replay_assertions: PASS, ids: [100, 101, 102, 103, 104]
D1_LOCAL_INTEGRATION_PROOF=PASS
```

Database verification using the same local D1 persistence directory returned exactly three intent orders, three lines and three intent events. The seeded order number is 100; the three newly created orders received exactly 101, 102 and 103, and the duplicate reference appeared once. The seed transition order separately retained exactly two events with sequences `100,104` (seed plus the one successful transition); the losing transition emitted no event. The harness asserts these isolation, numbering, uniqueness and event-accounting invariants, then removes the temporary persistence directory and both Worker process groups on exit.

### Worker/Prisma WASM runtime

`src/lib/db.worker.ts` loads the generated client-engine WASM module through the Vite compiled-WASM import and overrides Prisma's compiler loader. The built Worker was started with Wrangler local and the concurrent harness executed real Prisma catalog reads plus the D1 atomic order path successfully. No remote resource or deployment was used.

### Bounded event polling

`src/app/api/admin/orders/events/route.ts` now caps each cursor stream at 50 seconds and each replay poll at 100 events. `src/modules/orders/repository.ts` applies the bounded `take` query.

### Catalog, settings, auth and sessions

The integrated harness reads `/menu`, seeds an admin and valid seven-day settings schedule, logs in through `/api/auth/login`, verifies `/api/auth/session`, reads and patches `/api/admin/settings`, logs out, and verifies session invalidation with HTTP 401. It reports `catalog_settings_auth_session_assertions=PASS`.

The same authenticated harness races two `PATCH /api/admin/orders/:id` status transitions and asserts one `200` and one `409`, then reads `/api/admin/orders/events?after=99` and asserts exactly five persisted SSE events with strictly ascending cursor ids `100,101,102,103,104` (seed, three order creations, and the successful transition). It reports `transition_race: PASS` and `sse_cursor_replay_assertions=PASS`.

## Full local checks

- `prisma validate --schema prisma/schema.d1.prisma`: PASS.
- Local D1 migration: PASS; 22 commands.
- Atomic proof, unique client reference, FK restriction, cascade deletion and JSON modifier snapshot: PASS.
- `pnpm run typecheck`: PASS.
- changed-file ESLint (`src/modules/orders/d1-atomic.ts`, proof Worker): PASS. A full post-build `pnpm run lint` is currently noisy/fails on generated `dist` output and the pre-existing `src/types/wasm.d.ts` `module` naming rule; this is tooling-surface noise, not a changed-file error.
- `pnpm test -- --run`: PASS; 13 files / 33 tests.
- `pnpm audit --audit-level=high`: exit 0; two moderate advisories remain.
- `pnpm run build:vinext`: PASS.
- `pnpm exec wrangler deploy --dry-run --config dist/server/wrangler.json`: PASS; no deployment.

## Requirement → implementation → acceptance → evidence

- D1 atomic multi-write order path → `d1-atomic.ts` uses one D1 batch → order/line/event all persist or none → Worker duplicate/distinct harness plus rollback proof.
- `clientReference` idempotency → unique D1 column plus conflict reread → one persisted order for concurrent duplicates → concurrency harness and SQL count.
- Meaningful order numbering → serialized D1 batch allocation plus unique constraint → distinct concurrent requests receive unique numbers → concurrency harness and SQL result.
- Event replay ordering → unique sequence allocation and cursor polling → the local Worker replay returns the complete expected cursor set in ascending order without duplicates → integrated SSE assertion and bounded route/repository.
- PostgreSQL LISTEN/NOTIFY removal → persisted OrderEvent polling → Worker-compatible bounded stream → route/repository implementation and type/test/build checks.
- Worker Prisma runtime → D1 adapter plus compiled query compiler WASM → local Worker executes real D1 reads/writes → Wrangler local HTTP run and dry-run bundle validation.

## Engineering Evidence

- Problem: `PROVEN`.
- Design: `PROVEN` for the bounded local D1 adaptation.
- Implementation: `PROVEN` for the exercised Worker/D1 order path; full product migration remains incomplete.
- Validation: `PARTIAL`; bounded runtime, rollback, concurrency, catalog/settings/auth/session, transition-race, SSE replay and regression checks pass; full product migration and independent assurance remain pending.
- Release/Deployment: `UNKNOWN`; dry-run only, no remote deployment.
- Maintenance/Operations: `UNKNOWN`.
- Judgment/Material Decisions: `PROVEN`; D1 target, no Hyperdrive/KV, and no product semantic weakening are persisted.

## Not proven / not authorized

- Full product migration remains incomplete; the bounded admin transition-race and SSE cursor-replay journeys are proven by the integrated local Worker harness, including no phantom event on the losing transition, but remote bindings and deployment are not.
- Remote D1/R2/Images resources, secrets, bindings, logs and free-tier account state.
- Staging or production deployment.
- Production cutover; production remains `NOT_AUTHORIZED`.

## Next gate

Fresh Independent Critic review of this exact candidate and packet. Integration Review is not yet admitted; it will be evaluated only after a valid critic PASS.
