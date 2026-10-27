# TL-TC-ORDER-TRACKING-RETURN-P0

Mode: `DELIVERY`  
Phase: `IMPLEMENT / VALIDATE`  
Scope: staging only  
Production: `NOT_AUTHORIZED`

## Objective

Restore the customer automatically to the tracking page after the browser returns from the WhatsApp handoff, without changing the existing tracking API, polling, order lifecycle, idempotency or D1 schema.

## Root cause

The validated checkout stored `trackingHref` only inside `taco-loco-completed-order` in `sessionStorage`. That state restored the success dialog but had no pending-handoff marker and no return navigation. The existing WhatsApp helper only detected whether the page became hidden/blurred to show a fallback; it did not use those events to resume tracking. Desktop popup focus and mobile `pageshow`/visibility return therefore left the customer on `/menu`.

## Requirements and implementation

| Requirement | Implementation | Acceptance | Evidence |
| --- | --- | --- | --- |
| Preserve active tracking across WhatsApp | Local browser record containing only generated tracking path, order number, timestamp and pending flag | Same order resumes after app/tab return | `tracking-resume.test.ts`, staging evidence |
| Avoid stale credentials | 24-hour expiry, strict opaque `/pedido/<43-char-token>` validation, consume on tracking load | Stale/consumed records do not redirect | unit tests |
| Recover compatible returns | `visibilitychange`, `blur`, `focus`, `pageshow`, and initial reload check | Mobile app, desktop tab/popup, reload and bfcache paths are covered | local/staging browser evidence |
| Do not redirect an explicitly new order | Clear active record from “Realizar otro pedido”, “Seguir viendo el menú”, and tracking page; ignore pending record when a non-empty new cart exists | New order flow is not hijacked by prior order | unit test + browser scenarios |
| Preserve manual fallback | Existing “Ver estado de mi pedido” and WhatsApp Web fallback remain | User can recover when deep link/app launch fails | regression evidence |
| No duplicate order | Only navigation/state changes; no API call during resume | Resume does not create another order | existing idempotency suite + staging journey |

## Constraints / non-goals

- No WhatsApp delivery confirmation is inferred.
- No WhatsApp Business API, paid service or new infrastructure.
- The browser cannot reliably detect whether the message was sent; returning from the handoff is treated as a navigation convenience only.
- The bearer token is not logged or sent to a new service. Local storage is bounded and cleared when consumed or dismissed.
- Existing `OrderTracking` polling and `/api/orders/tracking/[token]` remain unchanged.

## Done when

Local tests/typecheck/lint/vinext build pass; staging is deployed on the existing Worker/D1 only; mobile and desktop return scenarios are validated where browser automation can observe them; real WhatsApp handoff remains explicitly marked as human-device validation where the provider is required.

## Stop condition

Stop at `HUMAN_TRACKING_WORKFLOW_REVIEW` after staging evidence. Do not deploy production.
