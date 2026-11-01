# Taco Club P1b-A — staging validation

Date: 2026-11-01  
Application candidate: `4b565f3dec11940bb651518a1f4a786da52661c2`  
Governance HEAD: `f4e0cccca7dc775fc9c7e39dca8ad2e68243f71a`  
Worker: `taco-loco-staging-20260913`  
Deployment version: `b777951d-247e-4419-adcf-d4d562e0835f`  
D1: `taco-loco-staging-20260913` (`266d23b2-4056-41c0-82d9-4f063ba48d78`)

## Deployment and schema

- Exact candidate deployed to the existing Worker staging environment.
- Existing D1 binding verified; `wrangler d1 migrations list --remote` reported no migrations to apply.
- No migration, resource creation, production operation, or application code change was performed during this validation.
- Active bindings remain D1, Workers Static Assets and version metadata; no R2, Images, KV, Hyperdrive or PostgreSQL provider was introduced.

## Runtime evidence

- Health, menu and account routes returned successfully.
- Anonymous customer session and customer-orders requests return `401`.
- Invalid public tracking token returns generic `404`.
- Existing public tracking page reconstructed a prior guest order; WhatsApp handoff remained available. Message delivery itself is not claimed.
- Authenticated browser session survived deployment/reload and `/cuenta` rendered the authenticated state plus `Mis pedidos`.
- A bounded authenticated PICKUP order was created through the public menu. The staging D1 row is customer-owned, remains `PENDING`, and is visible in the authenticated account history.
- `/api/customer/orders` returned `200` with one customer-scoped order and the safe projection keys only: `orderCode`, `fulfillment`, `currentStage`, `title`, `message`, `totalAmount`, `deliveryFeeAmount`, `createdAt`, `updatedAt`, `history`, `lines`. No token, customer identity, client reference, address, transfer holder, actor or raw internal status fields were returned.

## Sanitized D1 snapshot

- Orders: 40 total; 1 customer-owned; 39 guest-owned.
- Customers: 3.
- Customer identities: 3.
- The new staging order is customer-owned and has the expected `PICKUP`, total and pending state. Raw customer identifiers and personal data are intentionally omitted.

## Coverage and limits

- Local P1b-A evidence remains valid: 28 test files / 90 tests, typecheck, lint and `build:vinext` PASS; three lint warnings are pre-existing.
- Independent Critic and Integration Review remain valid PASS for the unchanged application candidate: `docs/reviews/TL-TC-TACO-CLUB-P1B-A-independent-critic-4b565f3.md` and `docs/reviews/TL-TC-TACO-CLUB-P1B-A-integration-review-4b565f3.md`.
- Guest checkout, public tracking and anonymous authorization boundaries were smoke-checked against the deployed candidate; prior full staging evidence remains the authoritative regression baseline.
- A second authenticated customer was not available for a new cross-account browser journey. Cross-customer authorization is covered by local tests and the server-side customer-scoped query, but a second-account remote browser result is not claimed here.
- Pagination was not forced by creating ten additional staging orders; cursor pagination remains covered by local tests and the deployed route exposes the existing bounded cursor contract.

## Classification

`P1B_A_READY_FOR_INTEGRATION`

PR #10 remains draft. No merge, production deployment, production data change or P1b-B work was performed.
