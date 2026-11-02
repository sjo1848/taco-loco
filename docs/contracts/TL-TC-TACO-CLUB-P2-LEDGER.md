# TL-TC-TACO-CLUB-P2-LEDGER

Status: `DESIGN_READY / BENEFITS_DISABLED`

This increment prepares an auditable, idempotent ledger without deciding or activating commercial rewards. No points, discounts or promotions are credited.

## Invariants

- A ledger entry is never created for order creation, payment pending or payment report.
- Eligibility requires an authenticated customer-owned order in `DELIVERED`, with no cancellation or required/refunded refund state.
- Every mutation has a unique idempotency key and can be reversed with a separate compensating entry; no history is deleted.
- Commercial rule configuration remains disabled until a Human Gate closes amount/frequency, eligibility, expiry, abuse and margin decisions.
- The ledger is not a wallet, payment balance or regulated financial account.

## Non-goals

No automatic awards, customer-facing points balance, discounts, promotions, scheduled jobs or provider integrations.

## Evidence

Schema/migration compatibility and pure eligibility/idempotency tests are local evidence only. Remote migration, staging deployment and production are out of scope.
