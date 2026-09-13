# Taco Loco — Resume / Orchestration State

Updated: 2026-09-13

- Repository: `sjo1848/taco-loco`
- Branch: `migration/cloudflare-native`
- Application candidate: `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`
- Mode: `DELIVERY`
- Phase: `VALIDATE / RELEASE_PREPARATION`
- State: `STAGING_CATALOG_PARITY_PASS`
- Active contract: `docs/contracts/TL-STAGING-CATALOG-PARITY-01.md`
- Production: `NOT_AUTHORIZED`

## Proven checkpoint

Remote staging already reached `REMOTE_INTEGRATION_PASS` for the application candidate. Worker + D1 + Static Assets, auth/session, orders/idempotency/transitions, events/SSE, logs/runtime, Independent Critic and Integration Review are PASS.

## Current human decision

Do not release production yet. Continue in the existing staging environment, restore the established Taco Loco catalog from the frozen former implementation, validate realistic behavior, then reopen the production gate.

`workers.dev` is accepted as the preferred future initial zero-cost public URL. Staging remains available.

## Catalog source

Canonical source:
`sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48/prisma/seed.ts`

Expected public catalog:
- 7 categories;
- 31 products;
- exact source names/descriptions/prices/sort order;
- source modifier groups/options/associations.

Do not recreate the old demo order or default admin credential as part of catalog parity.

## Next authorized objective

`TL-STAGING-CATALOG-PARITY-01` passed: exact frozen-source catalog parity and realistic staging menu/order/admin behavior are proven. Reopen production eligibility as a separate Human Gate; keep staging available and do not deploy production.
