# TL-TC-ORDER-FLOW-01 — Stages B–D local evidence

- Branch: `rework/tl-order-flow-01`
- Exact application candidate: `00ac161dc2532ee21a6bbcf08a9fffeb9d35ec32`
- Scope: public PICKUP/DELIVERY checkout, delivery payment-gated confirmation, operational exception actions.
- Production: `NOT_AUTHORIZED`
- Remote staging: not modified by this increment.

## Implemented behavior

- Public checkout accepts PICKUP or DELIVERY.
- DELIVERY requires address and transfer-holder name, uses configurable `MenuSettings.deliveryFeeAmount`, and persists `verificationStatus=PENDING` and `paymentStatus=PENDING`.
- PICKUP remains no-prepayment and persists `verificationStatus=PENDING` with `paymentStatus=NOT_REQUIRED` for public intents.
- The server recalculates product totals and delivery fee; client totals are presentation only.
- Prepared WhatsApp text includes TL number, modality, delivery address/reference and transfer holder.
- Admin delivery confirmation requires one action with `confirmPayment=true`; the D1 batch/transaction updates payment, verification, order status and audit event together.
- Operational actions exist for pending expiry, pickup no-show, refund required and refund completed, with invariant checks.

## Requirement → evidence

| Requirement | Evidence | Result |
|---|---|---|
| Checkout validation | `src/modules/orders/service.test.ts` | PASS; pickup default, delivery required fields and complete delivery payload |
| WhatsApp/order handoff | `src/modules/selection/model.test.ts` | PASS; TL number, delivery address and transfer holder |
| D1 atomic writes | `src/modules/orders/d1-atomic.ts` and Stage A tests | PASS; batch path retained and extended |
| Regression | `pnpm test -- --runInBand` | PASS; 12 files, 33 tests |
| Type safety | clean generated-cache-isolated `pnpm run typecheck` | PASS |
| Changed-file lint | ESLint on B–D surfaces | PASS |
| Worker packaging | `pnpm run build:vinext` and Wrangler dry-run | PASS; D1 + Static Assets only |

Remote staging journeys, full operator acceptance and production remain pending separate gates. No secrets, production resource, R2, Images, Hyperdrive, KV or external PostgreSQL were used.
