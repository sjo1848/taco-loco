# TL-TC-TACO-CLUB-P1C

Status: `IMPLEMENTED_LOCALLY / STAGING_ONLY`

## Objective

Provide the first optional Taco Club preferences and repeat-order capability without changing guest checkout, tracking, administration, or order history semantics.

## Scope

- Repeat a customer-owned order through an opaque tracking capability, revalidating current product publication, availability, modifiers and prices through the existing order-intent path.
- Store customer-owned favorites and editable/deletable saved addresses.
- Keep all reads and writes scoped by the authenticated customer session.
- Preserve guest orders with `Order.customerId = NULL`.

## Non-goals

- No claim of guest orders, loyalty awards, promotions or payment changes.
- No deletion or anonymization of operational order history.
- Account deletion/retention policy remains a separate human product/privacy decision.
- No remote migration, deployment or production change.

## Acceptance mapping

| Requirement | Producer | Evidence / consumer | Failure behavior |
| --- | --- | --- | --- |
| Repeat current order safely | private repeat route + existing intent service | repeat tests, CI, server-side recalculation | unavailable product/modifier returns controlled conflict |
| No internal order ID exposure | customer projection + opaque repeat path | allow-list privacy test | no order returned outside authenticated owner |
| Favorites | private preference routes | customer-scoped service and CI | unauthorized request rejected |
| Addresses | private CRUD routes | customer-scoped service and CI | cross-customer IDs return not found |
| Guest compatibility | existing public intent/tracking paths | full local regression | guest remains unauthenticated and unowned |

## Candidate

Application candidate: `7cad8b4b2e22ea9f49c914e068a3a8710eb94491`.

## Retention note

Preference deletion is supported for addresses/favorites. Retention and account-deletion treatment for customer identity data is intentionally not decided by this contract.
