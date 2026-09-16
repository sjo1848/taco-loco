# TL-TC-ORDER-TRACKING-01 — Remote Staging Evidence

## Identity and resources

- Application candidate: `1d96410c5b10d5275beaf61943ddde10732ea171`
- Governance/execution HEAD at staging admission: `2cafa256414bfb08bd09072b0fecf2cb973ac8fe`
- Branch: `rework/tl-order-tracking-01`
- Worker: `taco-loco-staging-20260913`
- URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`
- Deployment version: `ef5cad20-2dbe-4e79-ba44-6a9e110f1143`
- D1: `taco-loco-staging-20260913`
- D1 ID: `266d23b2-4056-41c0-82d9-4f063ba48d78`
- Migration applied: `0003_order_tracking.sql` — remote success, 4 statements.

## Gate map result

| Requirement | Producer | Evidence | Consumer / result | Failure behavior |
|---|---|---|---|---|
| Worker reachable | Cloudflare deployment | `/api/health` returned `{"status":"ok"}` | Runtime gate | deployment/runtime failure blocks PASS |
| Static Assets | Worker ASSETS binding | `/products/taco-carne.jpg` returned 200 `image/jpeg` | Media/runtime gate | asset failure blocks PASS |
| D1 schema/binding | remote migration + `DB` binding | migration success; remote schema queried | D1 gate | schema/binding failure blocks PASS |
| Tracking creation | public intent route | PICKUP TL-0026 and DELIVERY TL-0027 received tracking paths | Order journey gate | missing token/path blocks PASS |
| Safe public projection | tracking API | both projections had no internal-field leak; version length 43 | Privacy gate | leakage blocks PASS |
| Cursor polling | tracking API | matching opaque cursor returned 204 | Polling gate | stale/incorrect cursor behavior blocks PASS |
| Token access control | token API | `/api/orders/tracking/TL-0026` returned 404 | Enumeration gate | order number access blocks PASS |
| Idempotency | public intent route | retry returned `reused=true`, same order and same tracking path | Order invariant gate | duplicate capability/order blocks PASS |
| Admin/session | auth and admin routes | login 200; `/admin` 307 to board; orders/products/categories/settings 200 | Admin regression gate | auth/admin failure blocks PASS |
| PICKUP lifecycle | admin workflow + public API | `WAITING_CONFIRMATION → CONFIRMED → PREPARING → READY → COMPLETED`; event history 5 entries | Public journey gate | lifecycle drift blocks PASS |
| DELIVERY lifecycle | admin workflow + public API | fee 3000, `WAITING_PAYMENT_CONFIRMATION → PAYMENT_REPORTED → CONFIRMED → PREPARING → READY → COMPLETED`; event history 6 entries | Payment/order gate | payment guard or event drift blocks PASS |
| Structured events | D1 OrderEvent | `ORDER_CREATED`, `PAYMENT_REPORTED`, `PAYMENT_AND_ORDER_CONFIRMED`, transitions observed | Canonical history gate | missing/duplicate event blocks PASS |
| Observability | Worker deployment | deploy exposed observability metadata binding; health/runtime requests succeeded | Runtime operations gate | unavailable logs/diagnosis remains a follow-up risk |
| COST-0 footprint | existing account/resources | authenticated account; only existing Worker, D1 and Static Assets used; no R2/Images/paid resource provisioned | Cost guardrail | paid/intentional overage would require Human Gate |

## Parity and privacy

- Page `/pedido/<opaque-token>` returned 200 with `noindex`, `nofollow`, `noarchive`, and `no-referrer` metadata.
- Tracking API returned `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, and `X-Robots-Tag`.
- Public projection exposed order code, stage, safe history, line/modifier summary, total and delivery fee only. Delivery address and transfer-holder data remained absent.
- Tracking page reload reconstructs from the deployed API; no sessionStorage authority is required.
- Existing admin SSE route and prior order-flow resources were not modified by this candidate.

## Classification

`REMOTE_INTEGRATION_PASS`

This is bounded staging evidence only. Production deployment, cutover, production data and production authorization remain out of scope.
