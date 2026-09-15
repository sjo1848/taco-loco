# Taco Loco — Order Flow staging DELIVERY validation

Date: 2026-09-15  
Classification: `STAGING_ORDER_FLOW_PASS`

## Identity and boundary

- Repository: `sjo1848/taco-loco`
- Branch: `rework/tl-order-flow-01`
- Application candidate: `e6f2465d827f853690ebc96d65db7030de5c484e`
- Worker: `taco-loco-staging-20260913`
- URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`
- D1: `taco-loco-staging-20260913` (`266d23b2-4056-41c0-82d9-4f063ba48d78`)
- Scope: existing staging only; production remains `NOT_AUTHORIZED`.

No application or configuration code changed. The only remote mutation was the authorized staging `MenuSettings` data update.

## Staging setting

Before: `deliveryEnabled=0`, `deliveryFeeAmount=0`, `currency=ARS`.  
After: `deliveryEnabled=1`, `deliveryFeeAmount=3000`, `currency=ARS`.

No other setting was changed. The value ARS 3,000 is a staging validation value, not a commercial tariff decision.

## DELIVERY journey

The public endpoint rejected a DELIVERY request without address and transfer holder with HTTP 400 (`INVALID_INPUT`). A valid request containing an extra client `adjustmentAmount=999999` produced:

- Order: `TL-0017` (`70ddef94-88b9-4de9-87d8-b9e608837c7b`)
- Products: `Taco x2 común` + `Picante`; `Daikiri` + `Mango`
- Subtotal: ARS 17,000
- Server delivery fee: ARS 3,000
- Total: ARS 20,000
- Fulfillment: `DELIVERY`
- Address/reference: present; reference optional path exercised with a value
- Transfer holder: `Ana Pérez`
- Initial state: `RECEIVED`, `verificationStatus=PENDING`, `paymentStatus=PENDING`

The submitted client adjustment was ignored; the persisted `adjustmentAmount` equals the server fee ARS 3,000.

The same `clientReference` retried successfully as `reused=true`, returning the same order and total without duplicate business state.

## Payment and operation gates

1. Generic `RECEIVED → CONFIRMED` before payment confirmation returned HTTP 409 `PAYMENT_REQUIRED`; order remained `RECEIVED/PENDING` and no transition event was added.
2. `REPORT_PAYMENT` changed payment to `REPORTED` while verification remained pending.
3. Atomic `CONFIRM_PAYMENT_AND_ORDER` changed the order to `CONFIRMED`, `verificationStatus=VERIFIED`, and `paymentStatus=CONFIRMED`.
4. The order completed `CONFIRMED → IN_PREPARATION → READY → DELIVERED`.

Final order state: `DELIVERED`, `VERIFIED`, `CONFIRMED`, total ARS 20,000.

## Events, replay and admin

Order event sequences were deterministic and ascending: `29 RECEIVED`, `30 payment reported`, `31 CONFIRMED`, `32 IN_PREPARATION`, `33 READY`, `34 DELIVERED`. The failed premature confirmation created no event. Bounded SSE replay from cursor 28 returned persisted events 29–32 in order with the final order state and payment/verification fields.

Staging admin login, order detail, settings, order mutation and logout were verified. After logout, `/api/auth/session` returned HTTP 401. Admin settings displayed `deliveryEnabled=true`, `deliveryFeeAmount=3000`, and `currency=ARS`.

## PICKUP regression

New bounded PICKUP order `TL-0018` was created with `paymentStatus=NOT_REQUIRED` and completed `RECEIVED → CONFIRMED → IN_PREPARATION → READY → DELIVERED`. Existing prior pickup evidence remains valid.

## Runtime and cost posture

- Health endpoint: HTTP 200.
- Public menu: HTTP success; representative products and delivery fee rendered in the deployed response.
- Static Assets and D1 runtime were exercised by the journey.
- No R2, Images, Hyperdrive, PostgreSQL, KV, Durable Objects or production resource was created or used.
- Existing runtime evidence covers Worker logs/observability; a later ad-hoc Wrangler D1 count request returned provider authorization error 7403 and is not treated as green evidence.

## Verdict

`STAGING_ORDER_FLOW_PASS` for the bounded DELIVERY/PICKUP staging journey on candidate `e6f2465`. Production remains `NOT_AUTHORIZED`; the candidate is not production-approved.
