# Taco Loco — bounded remote D1 + Static Assets staging evidence

Date: 2026-09-13  
Classification under review: `INTEGRATION_REVIEW_PENDING`  
Repository: `sjo1848/taco-loco`  
Branch: `migration/cloudflare-native`  
Technical candidate: `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`  
Prior Static Assets candidate: `4007a5810c998a7c4478dfb4b054c9c612860a1a`  

## Scope and guardrails

This was bounded non-production validation only. No production deployment, cutover, R2, Images, Hyperdrive, external PostgreSQL, KV, Durable Objects, queues, paid-plan upgrade or production data was used.

The initial remote deploy exposed two runtime serialization/probe defects. They were corrected locally, re-tested, and deployed as new candidates `91c5e6788737b6722486b27708686c8626cc7669` and finally `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`. The final evidence below refers only to `6eccc3a`.

## Provider and deployment identity

- Authenticated account: Cloudflare account `30e8fad45f7bc1cd5bddad87e18b1aec`; Wrangler OAuth identity was verified before provisioning.
- Worker: `taco-loco-staging-20260913`
- URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`
- Final version: `5b251804-6d2f-4bde-b547-7e4d560a7b71`
- Final deploy message identified candidate `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`.
- Bindings in final deploy: `DB` (D1), `ASSETS` (Workers Static Assets), `CF_VERSION_METADATA`.
- Effective sanitized binding artifact: `docs/evidence/TL-CF-D1-REMOTE-STAGING-bindings-6eccc3.json`.
- No `MEDIA_BUCKET` or `IMAGES` binding was present.
- Worker observability was enabled in the generated deploy configuration. Wrangler tail connected and captured a successful `GET /api/health` invocation.

## D1 resource and migration

- Database: `taco-loco-staging-20260913`
- Database ID: `266d23b2-4056-41c0-82d9-4f063ba48d78`
- Region: `ENAM`
- Binding: `DB`
- Canonical migration: `d1/migrations/0001_initial.sql`
- Remote migration result: `PASS`; 22 commands applied; D1 migration table records the migration.
- Seed was disposable and contained one settings row, one category, one product, one modifier group/option and one admin identity; no production data was imported.

## Representative remote journey

| Requirement | Result | Evidence |
|---|---|---|
| Worker reachable and health | PASS | `GET /api/health` returned `200 {"status":"ok"}` on final version. |
| Static asset | PASS | `GET /products/taco-carne.jpg` returned `200`, `image/jpeg`, 21,160 bytes; D1 `imageKey` was `/products/taco-carne.jpg`. |
| Legacy media paths | PASS | `/api/media/products/products/taco-carne.jpg` and `POST /api/admin/media/products` returned `404`. |
| Public menu | PASS | `/` and `/menu` rendered the seeded product and `taco-carne` reference. |
| Login/session | PASS | Login returned `200`; session lookup returned authenticated admin; logout returned `200`; post-logout session returned `401`. Credential values are not recorded. |
| Admin/catalog | PASS | Authenticated settings read returned the seeded settings; product read and representative product PATCH returned `200`. |
| Order creation | PASS | Public intent returned `201`; persisted order number `2`, line and modifier snapshot, total `4500`. |
| Idempotency | PASS | Exact retry returned `200`, `reused:true`, same order ID/order number; no duplicate business order was created. |
| Admin order read | PASS | Final candidate returned `200` with event sequences serialized as strings. |
| Valid transition | PASS | `RECEIVED → CONFIRMED` returned `200` and persisted event. |
| Invalid transition | PASS | `CONFIRMED → RECEIVED` returned `409 INVALID_ORDER_TRANSITION`; no additional event was created. |
| Event/replay | PASS | Remote D1 rows had sequences `1,2,3,4`; bounded SSE replay after cursor `1` delivered ordered IDs `2,3,4`. |
| LISTEN/NOTIFY dependency | PASS | Active Worker path uses persisted D1 event polling; no PostgreSQL notification binding/path is configured. |
| Runtime logs | PASS | Wrangler tail connected and captured `GET /api/health - Ok`; no secret values were recorded. |

## Remote D1 post-journey invariants

Sanitized query evidence after the journey:

- settings `1`; categories `1`; products `1`; orders `2`; lines `2`; events `4`.
- order numbers were unique and contiguous in this bounded fixture: `1`, `2`.
- statuses were `CONFIRMED` for both created orders.
- each order had one creation event and, for the transitioned orders, one confirmation event.
- modifier snapshot persisted as `{group:"Salsa",option:"Picante"}`.

The local bounded concurrency/atomicity suite remains the evidence for stress-level invariants; this remote run intentionally did not perform load testing.

## Cost-0 assessment

Provider evidence: authenticated `wrangler whoami` succeeded with account access; D1 creation, migration and Worker deployment completed without a plan-upgrade prompt or paid-plan action. The final D1 query metadata reported a database size of `192512` bytes after the bounded journey, with only 2 orders, 2 lines and 4 events. The final Worker upload contained 38 static files, and the representative image was 21,160 bytes.

The applicable published free-plan guardrails recorded for this review are: Workers Free 100,000 requests/day, 10 ms CPU/request, 20,000 static files/version and 25 MiB/file; D1 Free 5 million rows read/day, 100,000 rows written/day and 5 GB total storage. Static Asset requests are free/unlimited; Worker/SSR requests remain subject to Workers limits. The bounded Taco Loco staging usage is materially below these limits. Exceeding D1 Free daily limits fails queries until reset rather than silently creating an overage; upgrading to Paid would be a separate Human Gate. No R2/Images billing path exists in the final candidate.

Direct account billing-profile API inspection was unavailable to the current token (`403 Authentication error`), but this did not block the already-authorized bounded path: resource creation and deployment succeeded without mandatory billing activation. This limitation is recorded, not presented as proof of unlimited free-tier capacity. Production still requires dashboard/account usage monitoring and a separate production Human Gate.

Source references for limits and billing behavior: Cloudflare Workers Limits, D1 Pricing, Workers Static Assets Billing and Limitations, and D1 free-tier enforcement documentation (all accessed 2026-09-13).

## Gate-map resolution

All mandatory remote rows are `PASS` for the final candidate, with self-service upload `NOT_APPLICABLE` by the explicit `MEDIA_STATIC_ASSETS_INITIAL` decision. No mandatory `UNKNOWN` was consumed as green. The two earlier candidate defects were classified as routine `REWORK` and are retained here for traceability.

Production remains `NOT_AUTHORIZED`.
