# Taco Loco — UX acceptance staging validation

## Deployment

- Integrated merge: `96a1dd696011b883f8b59dc0263e21048f5d2c22`
- Application candidate: `e5f60f91c8b9ba66f47b4d0e32e88f7a4195b49f`
- Worker: `taco-loco-staging-20260913`
- Deployment version: `e42fbd97-d700-42df-9524-144e0d47829f`
- URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`
- D1: `taco-loco-staging-20260913` / `266d23b2-4056-41c0-82d9-4f063ba48d78`
- Migrations: none applied in this validation

## Provider smoke checks

- `/api/health`: HTTP 200.
- `/menu`: HTTP 200; public navigation rendered.
- `/cuenta`: HTTP 200; Taco Club visitor state rendered.
- `/products/taco-carne.jpg`: HTTP 200, `image/jpeg`.
- Dry-run bindings: only D1, Static Assets, version metadata and existing staging Google variables.

## Synthetic checkout

Playwright created one bounded synthetic PICKUP order using the existing public checkout, with customer name `QA UX Synthetic`. The UI showed the prepared-order state, tracking action, copy-message action and WhatsApp Web fallback; no WhatsApp message was claimed as sent. A sanitized D1 read confirmed the order was persisted as `PENDING`, `NOT_REQUIRED`, with the expected PICKUP fulfillment and server-calculated total. No production resource was accessed.

## Visual QA

New screenshots were captured from the deployed Worker at 360, 390, 430, 768 and 1440 px, plus checkout and account views, under `output/playwright/ux-acceptance-staging/`. The inspected menu views show the persistent navigation, visible cart entry, green branded hero, readable neutral catalog surfaces and preserved CTA hierarchy.

## Remaining human checks

- Physical WhatsApp app/Web behavior and return from an actual device remain human validation; automated browser coverage verifies URL construction, fallback visibility and tracking access only.
- Authenticated Google account, admin dashboard filters and real delivery-address ownership require the final human/staging session because no credentials or customer identity were used by the synthetic run.

Production remains `NOT_AUTHORIZED`.
