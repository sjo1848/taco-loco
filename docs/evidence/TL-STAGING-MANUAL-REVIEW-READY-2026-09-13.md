# Taco Loco — Staging manual review readiness

Date: 2026-09-13  
Classification: `STAGING_REVIEW_READY`  
Application candidate: `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`  
Execution HEAD: `907803cd9ec59ee7019f19fb930ae965a5c0d4c7`  
Environment: existing staging only

## Environment

- Worker: `taco-loco-staging-20260913`
- URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`
- D1: `taco-loco-staging-20260913`
- D1 ID: `266d23b2-4056-41c0-82d9-4f063ba48d78`
- No application source/configuration changed; the candidate remains unchanged.

## Temporary image coverage

The authorized staging-only placeholder is `/products/taco-carne.jpg`. No external URL, R2, Images binding, upload API or new media infrastructure was used.

- Published canonical products: `31`
- Published canonical products with `imageKey`: `31/31`
- D1 placeholder coverage: `31/31`
- Static Asset response: HTTP `200`, `image/jpeg`, `21160` bytes
- Public `/menu`: HTTP `200`; all seven category names present; image reference present in rendered output
- This is a temporary review placeholder, not a claim that every product has its final photograph.

## Staging admin access

- `STAGING_ADMIN_ACCESS_PASS`
- Staging identity: `staging@tacoloco.com`
- Login: HTTP `200`, `{\"ok\":true}`
- Authenticated session: HTTP `200`
- `/admin`: HTTP `200`
- `/admin/categories`: HTTP `200`
- `/admin/orders`: HTTP `200`
- `/admin/settings`: HTTP `200`
- `/admin/products/new`: HTTP `200`
- `/admin/products`: HTTP `404` is expected: no such route exists; the product manager is `/admin`, with product detail/create routes under `/admin/products/:id` and `/admin/products/new`.
- Logout: HTTP `200`; post-logout session lookup: HTTP `401`, `authenticated:false`

The password and password hash are intentionally absent from this artifact and all durable project state.

## Regression evidence

- Health: HTTP `200`, `status: ok`
- Public menu: HTTP `200`
- Existing staging data preserved: D1 counts after review preparation were 5 orders and 7 events; prior order/event evidence remains intact.
- Representative new public order: HTTP `201`, order number `5`, total `46000`
- Lines covered: `Taco x2 común` + `Guacamole`, `Nachos`, `Gaseosa`, `Daikiri` + `Mango`
- Admin order read: HTTP `200`; persisted line/modifier snapshots include `Guacamole` and `Mango`
- Idempotent retry with the same client reference: HTTP `200`, same order ID/order number, `reused:true`
- Event replay: authenticated SSE endpoint returned HTTP `200` and ordered replay data
- D1 counts: 7 active categories, 31 published products, 31 placeholder image references, 5 orders, 7 events

## Production boundary

Production remains `NOT_AUTHORIZED`. No production resource, deployment, DNS, cutover or eligibility reopening was performed. The existing staging environment remains available for manual human review.

## Next action

Human manually reviews the existing staging URL using the staging-only identity. Await explicit human direction; do not reopen production eligibility automatically.
