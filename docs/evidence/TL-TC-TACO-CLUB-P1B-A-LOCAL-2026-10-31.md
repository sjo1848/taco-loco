# Taco Club P1b-A — local implementation evidence

## Identity

- Contract: `TL-TC-TACO-CLUB-P1B.md`, P1b-A scope only.
- Branch: `feature/tl-taco-club-p1b-a`.
- Base: merge commit `0a0a9ff370291be04a47d19232954979630fcd01`.
- Application changes: associate new public-menu orders with the authenticated server-side customer session; preserve guest `NULL`; add private paginated account history.
- Database migrations: `NO_NEW_MIGRATION`; P1a already provides nullable `Order.customerId` and its index.

## Requirements and evidence

| Requirement | Implementation | Evidence |
|---|---|---|
| Authenticated new order ownership | `/api/orders/intents` resolves `getCurrentCustomer()` server-side and passes only the session customer ID into the atomic writer | Typecheck, tests, code review |
| Guest preservation | Missing/invalid customer session passes `null`; manual/admin orders default to `null` | D1 writer test and existing guest regression suite |
| D1 atomicity | `customerId` is inserted in the same order/lines/event batch | `src/modules/orders/d1-atomic.test.ts` |
| PostgreSQL parity | Prisma transaction includes `customerId` in the same order creation | Typecheck and schema compatibility |
| Idempotency | Existing `clientReference` lookup returns the original order unchanged before ownership assignment | Existing service behavior preserved; no owner reassignment path added |
| Private history | `GET /api/customer/orders` requires `requireCustomer()`, filters by session customer ID and uses bounded stable cursor pagination | Route implementation and cursor tests |
| Privacy | Account DTO is constructed from safe lifecycle/line fields; no order ID, tracking token, address, transfer holder, customer ID or internal fields are returned | Projection allow-list test |
| Guest/tracking/admin compatibility | No tracking endpoint, admin route, event model or guest token behavior changed | Full regression and vinext build |

## Validation

- Focused tests: PASS, 12 tests.
- Full tests: PASS, 28 files / 89 tests.
- Typecheck: PASS.
- Lint: PASS with 3 pre-existing harness/generated warnings; 0 errors.
- `build:vinext`: PASS; `/api/customer/orders` is included in the route output.
- Remote staging/D1: NOT RUN; no migration or deployment authorized in this block.

## Scope boundary

- P1b-B guest claim is not implemented.
- Favorites, repeat order, addresses, points, rewards and promotions are not implemented.
- Production remains `NOT_AUTHORIZED`.

## Classification

`P1B_A_LOCAL_TECHNICAL_PASS / READY_FOR_PR_REVIEW`
