# TL-TC-TACO-CLUB-P1B — Customer order history and verified guest claim

Status: `DESIGN_READY / STAGING_ONLY`  
Issue: `#6 — P1b: historial de pedidos y claim verificable de invitados`  
Depends on: `TL-TC-TACO-CLUB-P1A` integration approval

## Objective

Allow an authenticated Taco Club customer to view their order history and explicitly associate an eligible guest order using the existing private tracking link, without weakening guest checkout or exposing internal order data.

## Requirements

- Guest checkout remains first-class and requires no account.
- Customer history is derived from the existing `Order` and `OrderEvent` records; no parallel history table.
- `Order.customerId` remains nullable for guests.
- Claim requires an authenticated customer session, a valid opaque tracking token, explicit confirmation and same-origin/CSRF protection.
- Claim is idempotent for the same customer.
- A claim already associated with another customer returns a generic conflict and reveals no ownership details.
- `TL-xxxx`, email, phone and address alone never authorize a claim.
- Public tracking continues working before, after and without a claim.
- Public projections remain minimal; history/account views must not expose delivery address, transfer holder, internal notes, administrative reasons or unnecessary raw events.
- No points, rewards, promotions, addresses, favorites or repeat-order behavior in this contract.

## Expected surfaces

- Customer account history route and safe API projection.
- Explicit claim flow from `/pedido/[token]` or account UI.
- Atomic conditional `Order.customerId` association with an auditable `OrderEvent` only if the product contract requires a customer-visible milestone; do not create duplicate history.
- PostgreSQL and D1 additive migration only if a schema/index/claim audit field is proven necessary.
- Tests for token authorization, CSRF, idempotency, conflicts, privacy, guest compatibility and concurrent claim attempts.

## Constraints and non-goals

- No production changes or deployment.
- No automatic linking by email, phone, TL number or Google identity email.
- No customer account redesign, multitenancy, recovery provider or loyalty rules.
- Do not silently change order lifecycle, tracking-token semantics or admin permissions.
- Preserve `OrderEvent` as the only canonical order history.

## Required acceptance evidence

| Requirement | Producer | Evidence | Consumer | Failure behavior |
|---|---|---|---|---|
| Authenticated customer sees only their associated orders | customer session + history query | sanitized allow-list/API tests and staging journey | security/integration reviewer | block PASS |
| Guest claim needs opaque token and explicit confirmation | claim API/UI | 401/403/404/conflict tests and HTTP evidence | critic | block PASS |
| Same customer can retry claim safely | conditional update/idempotency path | repeated and concurrent claim test | critic | REWORK on duplicate or race |
| Another customer cannot claim an owned order | conditional ownership check | generic conflict response test | security reviewer | block PASS |
| Guest tracking remains independent | existing tracking API and UI | regression evidence | integration reviewer | REWORK if broken |
| No sensitive fields leak | projection allow-list | automated schema/privacy test | critic | block PASS |

## Human gates

Pause for human decision if retention/erasure, guest claim UX, account deletion, or customer-history privacy policy changes materially; production remains separately unauthorized.

## Done when

Local implementation, D1/PostgreSQL migrations if needed, full affected QA, Independent Critic PASS, Integration Review PASS, and bounded staging validation are complete. Do not begin implementation until P1a is approved for integration and the claim/retention policy is confirmed.

## Resume point

After P1a evidence is finalized, present this contract for review. The next authorized action is contract admission/design review for Issue #6, not production work.
