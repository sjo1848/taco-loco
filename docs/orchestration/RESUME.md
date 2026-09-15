# Taco Loco — Resume / Orchestration State

Updated: 2026-09-15

- Repository: `sjo1848/taco-loco`
- Branch: `rework/tl-order-flow-01`
- Application candidate: `e6f2465d827f853690ebc96d65db7030de5c484e`
- Mode: `DELIVERY`
- Phase: `VALIDATE / RELEASE_PREPARATION`
- State: `STAGING_ORDER_FLOW_PASS`
- Active contract: `docs/contracts/TL-TC-ORDER-FLOW-01.md`
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

## Next authorized objective

Human review of the validated staging order-flow journey. Production remains `NOT_AUTHORIZED`.
