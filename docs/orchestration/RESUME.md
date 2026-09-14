# Taco Loco — Resume / Orchestration State

Updated: 2026-09-13

- Repository: `sjo1848/taco-loco`
- Branch: `migration/cloudflare-native`
- Application candidate: `f896b6b7f3af22987aaf42097be1aacebeea556a`
- Mode: `DELIVERY`
- Phase: `VALIDATE / RELEASE_PREPARATION`
- State: `STAGING_WHATSAPP_NUMBER_FIXED`
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

## Manual review readiness

The existing staging environment is ready for human review. Temporary `/products/taco-carne.jpg` coverage is present for all 31 published canonical products, staging-only admin access is verified, and public/admin/order/session/event regression remains healthy. Evidence: `docs/evidence/TL-STAGING-MANUAL-REVIEW-READY-2026-09-13.md`.

The staging `MenuSettings.whatsappPhone` value is corrected to `5492615956912`; web/mobile order handoff and admin settings were revalidated. Evidence: `docs/evidence/TL-STAGING-WHATSAPP-NUMBER-FIXED-2026-09-13.md`.

The existing staging Worker now serves 26 real product WebP assets through Workers Static Assets. Five canonical products retain the temporary placeholder because no source asset was supplied. Evidence: `docs/evidence/TL-STAGING-STATIC-PRODUCT-ASSETS-2026-09-13.md`.

## Next authorized objective

Human manually reviews the existing staging URL. Keep staging available. Production remains `NOT_AUTHORIZED`; do not reopen production eligibility or perform production actions without a future explicit human instruction.
