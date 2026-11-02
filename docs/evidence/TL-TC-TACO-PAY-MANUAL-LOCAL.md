# Taco Pay manual — local evidence

Date: 2026-11-01
Branch: `feature/tl-taco-pay-manual`
Scope: local implementation only; no remote migration or deployment.

## Result

The customer-facing action is limited to DELIVERY orders in `PENDING` payment state. It performs an atomic state transition to `REPORTED` and writes `OrderEvent.kind = PAYMENT_REPORTED` in the same D1 batch or PostgreSQL transaction. The existing operator-only `CONFIRM_PAYMENT_AND_ORDER` action remains unchanged.

Repeated reports are idempotent: an already `REPORTED` order returns success with `reused=true` and does not append another event. Other states receive `409 PAYMENT_REPORT_NOT_AVAILABLE`. PICKUP orders cannot use this action.

## Checks

- `pnpm typecheck`: PASS
- `pnpm test`: PASS — 30 files, 103 tests
- changed-file ESLint: PASS
- `pnpm build:vinext`: PASS
- `git diff --check`: PASS

## Security and scope

- The route requires the existing opaque tracking token and same-origin request.
- The customer cannot set an amount, confirm payment, confirm the order, or alter delivery data.
- No financial provider, bank API, wallet, credential, or new Cloudflare product was introduced.
- No production resource, remote D1 database, migration, or deployment was touched.

## Remaining validation

Remote staging migration/deployment and a bounded end-to-end journey remain pending explicit staging authorization. Commercial payment rules and any pricing/benefit decisions remain outside this increment.
