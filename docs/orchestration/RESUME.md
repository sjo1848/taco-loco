# Taco Loco — Resume / Orchestration State

Updated: 2026-09-15

- Repository: `sjo1848/taco-loco`
- Branch: `rework/tl-order-flow-01`
- Application candidate: `d8d98f7196284ffe0464a562033241aebbaf4c3c`
- Mode: `DELIVERY`
- Phase: `VALIDATE / RELEASE_PREPARATION`
- State: `ORDER_FLOW_STAGES_BCD_REWORKED / CRITIC_PENDING`
- Active contract: `docs/contracts/TL-TC-ORDER-FLOW-01.md`
- Production: `NOT_AUTHORIZED`

## Proven checkpoint

Remote staging already reached `REMOTE_INTEGRATION_PASS` for the application candidate. Worker + D1 + Static Assets, auth/session, orders/idempotency/transitions, events/SSE, logs/runtime, Independent Critic and Integration Review are PASS.

## Current human decision

Do not release production yet. Continue in the existing staging environment, restore the established Taco Loco catalog from the frozen former implementation, validate realistic behavior, then reopen the production gate.

`workers.dev` is accepted as the preferred future initial zero-cost public URL. Staging remains available.

## Order-flow Stage A checkpoint

Stages B–D are reworked locally on exact candidate `b8623fd6fee5d0496e665bb718b774b663b82e26`; evidence: `docs/evidence/TL-TC-ORDER-FLOW-STAGES-BCD-b8623fd.md`. Independent Critic for this cross-surface increment is pending. Production remains `NOT_AUTHORIZED`.

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

Run Independent Critic, then Integration Review and bounded staging validation for the exact candidate. Keep staging available. Production remains `NOT_AUTHORIZED`; do not reopen production eligibility or perform production actions without a future explicit human instruction.
