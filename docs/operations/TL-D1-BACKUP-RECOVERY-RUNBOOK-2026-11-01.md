# Taco Loco — D1 backup and recovery runbook

Status: operational procedure, no remote restore executed.

## Current evidence

The existing staging database is `taco-loco-staging-20260913` with ID `266d23b2-4056-41c0-82d9-4f063ba48d78`. A read-only `wrangler d1 info --json` succeeded after one intermittent provider error 10000 and reported 16 tables and a database size of 352256 bytes. Read-only `wrangler d1 time-travel info --json` also returned a bookmark. The exact root cause of the earlier 10000 response remains UNKNOWN; it is not currently reproducible as a stable permission denial.

## Export

Only with an explicitly authorized remote read/export window:

```sh
pnpm exec wrangler d1 export taco-loco-staging-20260913 --remote \
  --output tmp/taco-loco-staging-$(date -u +%Y%m%dT%H%M%SZ).sql \
  --skip-confirmation
sha256sum tmp/taco-loco-staging-*.sql
```

Record the database identity, UTC timestamp, byte size and SHA-256. Do not publish customer data or the SQL dump in GitHub/Drive. Store it only in an approved restricted location.

## Verify

Check that the export is non-empty, contains the expected schema markers (`d1_migrations`, `Order`, `OrderEvent`) and that its checksum is recorded separately. A checksum proves artifact integrity, not business completeness.

## Recovery

For short-window operational recovery, use D1 Time Travel after a separate Human Gate because restore overwrites the database in place. First capture current identity and a fresh export; then select the approved bookmark/time, execute the provider restore command, and run read-only health, schema, catalog, order and event checks. Never restore directly over production without an explicit cutover decision and an independently retained export.

Cloudflare documents a seven-day Time Travel window on Workers Free and 30 days on Workers Paid; account-specific entitlement and retention must be checked at execution time. Longer retention requires a separate restricted-export policy.

## Local drill result

The 2026-11-01 isolated drill exported the local D1 database, verified SHA-256 `7145fe88d812af1ee3a30daa00a26642ace1700f2b8d73f648b40eb2db955d9c`, imported it into a separate local D1 persistence directory, and verified 16 tables, 1 order, 1 event and 1 product. The dump needed a disposable import prelude because its `Order` foreign key references `Customer` before the later `Customer` DDL; this is a local export/import tooling finding, not a remote data mutation.
