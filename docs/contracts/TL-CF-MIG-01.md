# TL-CF-MIG-01 — Baseline Parity & Cloudflare Readiness

## Goal
Reproduce the frozen Taco Loco application baseline in the successor repository, prove baseline QA, then add a non-destructive vinext/Cloudflare Workers path without product-feature changes.

## Frozen source
`sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`

## Acceptance
- application runtime files are synchronized from the frozen source;
- lockfile-backed install succeeds;
- Prisma generate/deploy/seed succeeds against CI PostgreSQL;
- lint, typecheck, tests, audit and Next.js build pass;
- `vinext check` evidence is captured;
- vinext initialization uses Cloudflare target and preserves the Next.js path;
- vinext production build result is captured;
- no production deploy occurs in this contract.

## Explicit non-goals
Payments, delivery tracking, accounts, loyalty, reviews, maps, advanced analytics, multi-tenancy, WhatsApp webhooks and D1 migration.
