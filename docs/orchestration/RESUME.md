# Taco Loco — Resume / Orchestration State

Updated: 2026-09-15

- Repository: `sjo1848/taco-loco`
- Branch: `rework/tl-order-tracking-01`
- Application candidate: `1d96410c5b10d5275beaf61943ddde10732ea171`
- Execution HEAD: `e8effcd867e39976d3e8ff96119c01dadf0e7604`
- Mode: `DELIVERY`
- Phase: `VALIDATE / RELEASE_PREPARATION`
- State: `CORRECTIVE_INTERVENTION / STAGING_MANUAL_REVIEW_PASS`
- Active contract: `docs/contracts/TL-TC-ORDER-TRACKING-01.md`
- Production: `NOT_AUTHORIZED`

## Proven checkpoint

The existing remote staging baseline remains historical evidence for the prior application candidate. Candidate `e6f2465` separates the explicit atomic payment-and-order confirmation action, enforces the generic confirmed-payment guard in both runtimes, and passes local validation, Independent Critic and Integration Review. Production remains `NOT_AUTHORIZED`.

## Current human decision

Do not release production yet. Continue in the existing staging environment, restore the established Taco Loco catalog from the frozen former implementation, validate realistic behavior, then reopen the production gate.

`workers.dev` is accepted as the preferred future initial zero-cost public URL. Staging remains available.

## Order-flow Stage A checkpoint

Stages B–D are reworked locally on exact candidate `e6f2465d827f853690ebc96d65db7030de5c484e`; local evidence, Independent Critic and Integration Review are PASS. Production remains `NOT_AUTHORIZED`.

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

## Order-flow staging validation

The fixed staging setting `deliveryEnabled=1`, `deliveryFeeAmount=3000`, `currency=ARS` enabled a bounded real DELIVERY journey on candidate `e6f2465`: server-side fee, address/transfer data, idempotency, payment report, atomic payment-and-order confirmation, operation gate, final delivery, events/SSE replay, admin/session and PICKUP regression all passed. Evidence: `docs/evidence/TL-TC-ORDER-FLOW-STAGING-e6f2465-delivery-2026-09-15.md`.

The corrective workflow on exact candidate `ea99ca8` makes `/admin` redirect to `/admin/orders`, preserves product CRUD at `/admin/products`, and proves owner SSE arrival of pending PICKUP/DELIVERY submissions without refresh. Evidence: `docs/evidence/TL-STAGING-MANUAL-REVIEW-WORKFLOW-94719f8-2026-09-15.md`. Independent Critic and Integration Review: PASS.

## Next authorized objective

Remote staging validation passed on the existing Worker/D1: deployment `ef5cad20-2dbe-4e79-ba44-6a9e110f1143`, migration `0003_order_tracking.sql`, PICKUP/DELIVERY tracking, opaque cursor, reload, privacy, idempotency and admin regression. Stop at `HUMAN_TRACKING_WORKFLOW_REVIEW`; production remains `NOT_AUTHORIZED`.

## Tracking local assurance

Candidate `1d96410c5b10d5275beaf61943ddde10732ea171` passed Stages A–D locally. Evidence: `docs/evidence/TL-TC-ORDER-TRACKING-STAGE-A-1d96410.md`, `...STAGE-B...`, `...STAGE-C...`, `...STAGE-D...`. Independent Critic and Integration Review are PASS. The public cursor is an opaque SHA-256 capability-derived value; no raw `OrderEvent.sequence` is exposed.

Remote evidence: `docs/evidence/TL-TC-ORDER-TRACKING-STAGING-2026-09-16.md`; classification `REMOTE_INTEGRATION_PASS`. Production is not authorized.
