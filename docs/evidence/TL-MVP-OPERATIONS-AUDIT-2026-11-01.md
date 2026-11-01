# Taco Loco — MVP operational audit — 2026-11-01

Scope: read-only audit; no production, migration, deployment or data mutation performed.
Repository: `sjo1848/taco-loco`
P0 base: `fd1ee6be539755b50bb88cf9d118a1019a36bade`
QA HEAD: `03feb11b8a67b4e06f3117a5edd837c4718b69f8`
Production: `NOT_AUTHORIZED`

## Current runtime smoke

Existing staging Worker `taco-loco-staging-20260913` returned:

- `/api/health`: HTTP 200.
- `/menu`: HTTP 200.
- Representative Static Asset: HTTP 200.
- Anonymous customer session: HTTP 401.
- Anonymous customer order history: HTTP 401.
- Invalid public tracking token: HTTP 404.

These checks are read-only and do not prove the pending physical WhatsApp return behavior.

## Operational classification

### Blocks a controlled pilot

1. **WhatsApp physical return is not yet observed.** Mobile app/deep-link, WhatsApp Web and no-app/blocked-opening behavior remain pending human-device validation. The application-side simulations are not a substitute.
2. **Remote restore evidence remains incomplete, but the read-only access blocker was narrowed.** A bounded `wrangler d1 list` call returned provider error 10000; the subsequent read-only `wrangler d1 info --json` and `wrangler d1 time-travel info --json` calls succeeded for the existing staging D1. The account-specific root cause of the intermittent 10000 remains `UNKNOWN`; no migration, restore or remote data mutation was attempted. A recovery procedure and local isolated drill are now recorded separately.
3. **Staging deployment configuration is now reproducible as a tracked secret-free template, but no deployment was performed in this block.** The tracked root `wrangler.jsonc` remains intentionally local; `ops/staging/wrangler.staging.example.jsonc` and its procedure define the controlled staging path and require explicit value substitution before use.

### Important, non-blocking for the technical MVP

- DELIVERY payment remains manual: the operator verifies the transfer before `CONFIRM_PAYMENT_AND_ORDER`; there is no bank or payment-provider reconciliation.
- WhatsApp is a prepared human handoff. The system cannot prove delivery of the message or that the customer sent it.
- PENDING closure, no-show recording and refunds are manual operational actions and need a daily checklist.
- The fixed delivery fee, catalog prices, availability and publication state are configuration/data responsibilities; changes require an operator review before opening a session.
- Admin order intake and SSE visibility are proven by prior staging evidence; the operator should retain manual refresh/navigation as a recovery procedure.
- No production monitoring, alerting, export retention or remote disaster-recovery drill is currently evidenced. A local isolated export/import drill passed.

### Future improvements

- Account-specific Cloudflare plan/quota dashboard evidence and threshold alerts.
- D1 Time Travel bookmark/restore runbook and a non-production restore drill.
- A bounded export/retention strategy beyond the free-plan Time Travel window if the business requires longer recovery.
- Operator checklist for opening hours, menu availability, WhatsApp matching, payment verification, end-of-day closure, no-show and manual refund audit.
- Pilot metrics: orders received, pending age, payment verification time, cancellations, no-shows, WhatsApp return failures and duplicate-intent rate.

## Commercial behavior reviewed

- Catalog parity is already evidenced at 7 categories and 31 published products.
- Server-side order creation, idempotency, tracking, admin reception and status transitions are covered by prior staging evidence.
- RETIRO does not require advance payment; DELIVERY requires address/transfer-holder data and manual payment verification.
- DELIVERY remains outside kitchen operation until payment and order confirmation.
- Public tracking intentionally exposes a minimal projection; admin retains operational details.

## Cloudflare recovery/cost note

Current Cloudflare documentation states that D1 Time Travel is always enabled on supported production-backend databases, with a 7-day restore window on Workers Free and 30 days on Workers Paid; restore overwrites the database in place. The staging account now has successful read-only `d1 info` and bookmark evidence, but the CLI did not expose account-specific retention; retention remains UNKNOWN until Dashboard/provider evidence is available.

Sources:

- https://developers.cloudflare.com/d1/reference/time-travel/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/workers/platform/limits/

## Next evidence boundary

Complete the four physical WhatsApp scenarios in one human-device session. Record each as `PASS` or `UNKNOWN`, with no credentials, cookies or tracking tokens in the report. Do not create more than one bounded PICKUP and one bounded DELIVERY order.

## New readiness evidence — 2026-11-01

- D1 read-only `info --json`: PASS after one intermittent provider error; 16 tables, 352256 bytes, 9744 reads and 42 writes in the reported 24-hour window.
- D1 Time Travel info: PASS; bookmark returned, no restore performed.
- Local recovery drill: PASS — `docs/evidence/TL-MVP-D1-LOCAL-RECOVERY-DRILL-2026-11-01.md`.
- Reproducible staging template and dry-run procedure: `ops/staging/wrangler.staging.example.jsonc` and `ops/staging/README.md`.
- Operating procedure: `docs/operations/TL-MVP-PILOT-RUNBOOK-2026-11-01.md`.
