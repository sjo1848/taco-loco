# TL-TC-ORDER-TRACKING-01 — Customer Order Tracking

## Contract

- **Project:** Taco Loco
- **Mode:** DELIVERY
- **Phase:** DESIGN / IMPLEMENT / VALIDATE
- **Initial status:** `DESIGN_READY / STAGING_ONLY`
- **Branch:** `rework/tl-order-tracking-01`
- **Production:** `NOT_AUTHORIZED`
- **Prior application candidate:** `ea99ca83d7e6831833a97a11e21d5585c0903273`

## Objective

Allow a customer to consult the current state and public history of an order without an account, login, phone, email, OTP, or mandatory checkout step. Tracking is an additive convenience alongside the existing WhatsApp flow.

## Canonical inputs

- Validated order-flow implementation and evidence at the prior candidate.
- `prisma/schema.prisma`, `prisma/schema.d1.prisma`, D1/PostgreSQL migrations and order services.
- `TL-TC-ORDER-FLOW-01` and its validated staging behavior.
- Approved human decisions: progressive friction, one Order plus one canonical OrderEvent history, no customer accounts, production blocked.

## Requirements and acceptance

| Requirement | Expected surface | Acceptance | Evidence |
|---|---|---|---|
| Opaque tracking capability | Order, create-intent service, D1/PostgreSQL migrations | New public-menu orders receive a server-generated URL-safe token with at least 256 bits; same idempotency key returns the same order/token | Token tests, migration checks, idempotency tests |
| Structured history | OrderEvent `kind`, all workflow mutations | New events use the declared kind; old events remain readable with the backward-compatible default | Event-kind tests and SQL/schema evidence |
| Public safety | Central projection and tracking API | Only an allow-listed projection is returned; malformed/unknown tokens have the same generic 404; no order lookup by TL number/client reference | Allow-list/security tests |
| Public lifecycle | `public-tracking.ts` | Current stage derives from real Order state; history is ordered by sequence, deduplicated and hides operational-only events | Projection tests |
| Efficient polling | API and customer page | `after` returns 204 when unchanged; visible polling backs off on errors, pauses hidden, resumes immediately, and stops at terminal stages | API/UI tests and staging evidence |
| Cursor precision | D1 adapter and public projection | Sequence values remain exact within the adapter's safe integer boundary; unsafe values fail explicitly rather than being silently rounded, and unsafe external cursors are not sent to D1 | Precision guard test and runtime evidence |
| Checkout integration | Intent response, MenuExperience, WhatsApp | Response includes tracking path/URL; success UI exposes tracking; WhatsApp includes the absolute link without making tracking mandatory | Component/route tests and staging journey |
| Compatibility | Existing order flow/admin SSE | Existing PICKUP/DELIVERY, idempotency, payment guard, admin history/SSE and D1 behavior remain intact | Full QA and regression evidence |

## Design constraints

- `TL-xxxx` is a human reference, never a credential.
- `publicTrackingToken` is nullable, unique, server-generated, cryptographically random and URL-safe.
- `clientReference` remains idempotency-only.
- `OrderEvent` is the only historical authority; no parallel tracking/history table.
- Public tracking uses polling, not public SSE. Existing admin SSE remains unchanged.
- The public projection must not expose IDs, token, client reference, actor/admin data, customer contact/address/payment-holder data, internal reason/notes, raw statuses or D1 sequence semantics.
- No customer account, login, OTP, phone collection, cross-device history, multitenancy, or new Cloudflare product.
- Additive migrations only; do not rewrite historical events.
- The current Prisma D1 adapter exposes numeric SQLite sequences within JavaScript's safe-integer range. Taco Loco's expected operational volume is materially below that boundary; the implementation rejects unsafe loaded values explicitly and treats unsafe external cursors as a cache miss/full projection, never as a rounded cursor.
- Preserve atomic Order/OrderLine/OrderEvent/token creation in both runtimes.
- Do not modify `products/`, the historical source repository, production resources, production data, production secrets or production DNS.

## Allowed actions

- Add schema fields/enums, additive migrations, bounded order-domain helpers, API/page/component code, tests and documentation.
- Update staging only after local QA and the required assurance gates pass.
- Correct technical defects autonomously within this contract.

## Forbidden actions

- Production deployment or eligibility reopening.
- Public tracking by order number, client reference or predictable identifier.
- Public SSE, polling of all orders, or infrastructure beyond Workers + D1 + Static Assets.
- Silent changes to the validated order lifecycle or business rules.
- Persisting secrets/tokens in evidence or logs.

## Decision latitude

The implementer may choose equivalent file/module names and implementation details when they preserve the requirements, privacy boundary, D1/Workers compatibility and existing behavior. Any need for customer identity, tenant architecture, paid infrastructure, or a product-semantic change is outside latitude and stops at the applicable gate.

## Stages and outputs

1. **Stage A — Domain/persistence:** token, event kind, schemas, migrations, atomic writes and tests. Gate: `TRACKING_STAGE_A_PASS`.
2. **Stage B — Projection/API:** safe projection, timeline, current-stage mapping, cursor/204 API and tests. Gate: `TRACKING_STAGE_B_PASS`.
3. **Stage C — Customer UI:** mobile page, timeline, polling, visibility/backoff/terminal behavior and tests. Gate: `TRACKING_STAGE_C_PASS`.
4. **Stage D — Checkout/WhatsApp:** intent response, success dialog, session storage, absolute tracking link, regression. Gate: `TRACKING_STAGE_D_PASS`.

Required artifacts are stage evidence, critic review, integration review, updated state/status/resume/evidence index, and staging evidence.

## Learned invariants contribution

Apply and, if confirmed, persist:

- `PUBLIC_TRACKING_EVENT_INVARIANT`: every mutation that can change a customer-visible stage or timeline creates its corresponding `OrderEvent` in the same atomic operation.
- One order has one canonical event history and multiple safe projections.
- Tracking capability is opaque and independent from human order numbering/idempotency.

## Engineering Evidence contribution

- Problem/design/judgment: prove through this contract and projection design.
- Implementation/validation: prove through local tests, typecheck, lint, builds and staging journeys.
- Release/deployment: remains staging-only; production remains `NOT_AUTHORIZED`.
- Maintenance/operations: document polling limits, no-store responses and terminal stop behavior.

## Done when / exit criteria

Done when all four stages pass locally, required checks pass, the Independent Critic and Integration Review pass, staging validates PICKUP and DELIVERY tracking with reload and no sensitive leakage, and durable state/evidence is synchronized. Stop at `HUMAN_TRACKING_WORKFLOW_REVIEW`, or earlier only for a genuine Human Gate, unique Human Input, contract defect, separate multitenancy contract requirement, or technical blocker that cannot be resolved within scope.

## Handoff / resume point

After local assurance, freeze the new technical candidate, run independent review, integration review, then deploy only the candidate to the existing staging Worker/D1. Never infer production authorization from any technical PASS.
