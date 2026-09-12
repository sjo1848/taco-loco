# TL-CF-STAGING-01 — Cloudflare staging validation

Status: PREPARED_BLOCKED_ON_RESOURCES
Parent technical candidate: `ce36a2c81eba3f20aa7e4643a31771e8b85a23af`
Scope: staging only; no production deployment or cutover.

## Acceptance matrix

| Requirement | Producer | Evidence | Consumer | Failure behavior |
|---|---|---|---|---|
| Worker is deployed to staging | `vinext exec`/Wrangler staging deploy using the validated Worker artifact | Deployment/version ID, staging URL, Wrangler output, commit SHA | Staging gate classifier | `REWORK` if artifact/config mismatch; `HUMAN_ACTION` if account/permission blocks deploy |
| PostgreSQL connection through Hyperdrive | `HYPERDRIVE` binding backed by provisioned staging config | Binding resolution, health/read query, sanitized config identity | DB connectivity classifier | `REWORK` for code/config failure; `HUMAN_INPUT` for missing DB connection data |
| PostgreSQL read and write | Existing Prisma repositories/services through Worker DB adapter | Authenticated read/write transaction transcript with IDs and rollback/cleanup proof | DB behavior classifier | `REWORK`; never substitute mocks for staging DB evidence |
| Auth and admin | Worker routes, session binding/secrets, admin UI/API | Login/session/admin journey evidence and logs | Auth/admin classifier | `REWORK` on behavior/security regression |
| Main business operations | Public menu, order intent, admin order/product/category/settings flows | Journey matrix with request/response and persisted state evidence | Functional parity classifier | `REWORK` on material parity or transaction failure |
| R2/media | `MEDIA_BUCKET` binding and media adapter | Upload, list/read, and failure-path evidence from staging | Media classifier | `HUMAN_ACTION` if R2 account is not enabled; otherwise `REWORK` |
| Images, where required by contract | `IMAGES` binding and image optimizer path | Image transform/serve evidence or explicit `N/A` rationale | Media classifier | `REWORK` if required and unavailable; `N/A` only with contract-supported rationale |
| Secrets and bindings | Wrangler config plus staging secrets/bindings | Sanitized binding inventory, secret presence checks, no secret values | Deployment classifier | `HUMAN_ACTION` for permission/write channel; `REWORK` for config mismatch |
| Logs and runtime behavior | Worker runtime, structured application logs, Wrangler tail/log surface | Correlated request IDs, error/success logs, runtime compatibility evidence | Operations classifier | `REWORK` if observability or runtime errors prevent diagnosis |
| Behavior parity | Candidate plus frozen source invariants | Cross-journey parity report tied to candidate SHA | Integration classifier | `REWORK`; no PASS from build-only evidence |

## Preconditions

- R2 account enabled (`HUMAN_ACTION` currently outstanding).
- Staging PostgreSQL connection data or an existing Hyperdrive config ID (`HUMAN_INPUT` currently outstanding).
- KV namespace ID for `VINEXT_KV_CACHE` if the configured cache path is exercised.
- Staging account/project permissions and secret-write channel available.

## Stop conditions

- Do not use production resources or credentials.
- Do not treat local build, dry-run, mocks, or API-only checks as staging evidence.
- Do not authorize production cutover from this contract; production requires a separate Human Gate.
