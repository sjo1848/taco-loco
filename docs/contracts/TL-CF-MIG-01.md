# TL-CF-MIG-01 — Baseline Parity & Cloudflare Readiness
## Goal
Reproduce the frozen application baseline, prove functional parity, assess security independently, then establish a non-destructive vinext/Cloudflare Workers build path without product-feature changes.
## Frozen source
`sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`
## Acceptance
- frozen runtime/assets/schema/lockfile reproduced;
- Prisma generate/deploy/seed, lint, typecheck, unit tests and Next build pass;
- high-severity dependency findings remain an explicit blocking security gate until repaired or independently dispositioned;
- `vinext check`, initialization and Workers-target build are evidenced;
- no deploy or production cutover occurs.
