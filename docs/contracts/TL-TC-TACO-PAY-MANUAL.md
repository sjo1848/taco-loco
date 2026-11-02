# TL-TC-TACO-PAY-MANUAL

Status: `IMPLEMENTED_LOCALLY / STAGING_ONLY`

## Objective

Allow a DELIVERY customer to report that a transfer was made while keeping payment verification and order confirmation exclusively with the operator.

## Scope

- Reuse the existing `PENDING → REPORTED → CONFIRMED` payment lifecycle.
- Expose a private tracking action that records the customer report.
- Persist `PAYMENT_REPORTED` in the canonical `OrderEvent` history atomically with the payment-state mutation.
- Make a repeated report idempotent: it returns success without adding another event.
- Keep `CONFIRM_PAYMENT_AND_ORDER` as the sole operator confirmation action.

## Constraints and non-goals

- No payment provider, bank API, wallet, webhook, credential, or automatic bank confirmation.
- No production migration, deployment, or resource change.
- PICKUP does not gain a payment-report action.
- The bearer tracking link can report a transfer, but cannot confirm, edit, or cancel an order.

## Acceptance mapping

| Requirement | Implementation | Evidence | Failure behavior |
| --- | --- | --- | --- |
| Customer can report DELIVERY transfer | `POST /api/orders/tracking/[token]/payment` | route/service tests and staging journey | generic `409` when state is not reportable |
| State and event are atomic | D1 batch / PostgreSQL transaction | atomic adapter tests and migration schema | no partial state accepted |
| Operator remains sole confirmer | existing admin workflow unchanged | existing order-flow evidence | customer endpoint never confirms |
| Retry is idempotent | existing `REPORTED` returns `reused=true` | service/API tests | no duplicate event |
| Private action | opaque token + same-origin check | tracking-token and route checks | malformed/foreign request rejected |

## Durable invariants

- `PAYMENT_REPORTED` is an audit event, not payment proof.
- Only an authenticated operator decision may confirm payment and advance the order.
- No client-provided amount or payment status is accepted.

## Remote boundary

Local implementation and tests are authorized. Staging migration/deployment requires a separate explicit authorization. Production remains `NOT_AUTHORIZED`.
