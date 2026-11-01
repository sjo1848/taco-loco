# TL-TC-TACO-CLUB-P1B — Customer order history and verified guest claim

Status: `P1B_B_STAGING_VALIDATED / INTEGRATION_AUTHORIZATION_REQUIRED`
Issue: `#6 — P1b: historial de pedidos y claim verificable de invitados`  
Depends on: `TL-TC-TACO-CLUB-P1A` integration approval

Current checkpoint: P1b-A customer-scoped order history is integrated. P1b-B guest claim is implemented on `2c15d6f0255fe1df411ef1128d177dc1c8a8206a` and passed the bounded real staging journey. Protected merge/integration authorization remains pending.

P1b-A evidence: `docs/evidence/TL-TC-TACO-CLUB-P1B-A-STAGING-2026-11-01.md`.

## P1b-B approved policy

This single policy was approved by the human on 2026-11-01 and governs the implementation below.

### Recommended policy

1. **Capability and authorization.** Claim requires both an authenticated customer session and the complete opaque tracking token. `TL-xxxx`, email, phone, address, client reference and Google identity email never authorize a claim.
2. **Eligibility window.** A guest order may be claimed once, up to 30 days after `createdAt`, while the order is retained. This window applies to claiming only; existing public tracking behavior is unchanged. Manual orders without a public tracking token are ineligible.
3. **Shared-link risk.** The token is a bearer capability. Whoever possesses a shared link can view the deliberately minimal public projection and, before a claim, can win the first valid claim. The UI must warn the customer not to share the link. There is no automatic recovery or ownership transfer based on identity assertions.
4. **Conflict behavior.** The first atomic conditional claim wins. A repeat claim by the same customer is idempotent and returns success. A claim against an order already owned by another customer returns a generic conflict without disclosing the owner or personal data.
5. **Revocation.** Customers cannot self-unclaim in P1b-B. An operator-assisted unlink is not included in this increment; if required, it becomes a separate audited contract. Account/session logout does not revoke an existing order association.
6. **Retention and deletion.** Claiming creates no parallel history and does not extend order retention. Existing order retention/erasure policy remains authoritative. Account deletion or personal-data erasure rules require a separate human decision before implementation.
7. **Lifecycle/audit.** Claim changes ownership, not order status or customer-visible timeline. It therefore creates no synthetic `OrderEvent` and must not alter public tracking history. The atomic ownership write is the only new state mutation in this increment.

### Technical contract after approval

- Add a customer-scoped claim surface from `/pedido/[token]`, with explicit confirmation and a validated return path through `/cuenta` when Google login is required.
- Add `POST /api/customer/orders/[token]/claim`; require the existing customer session, same-origin request checks/CSRF protection, a valid 43-character token and the 30-day eligibility check.
- Use one conditional D1/PostgreSQL write equivalent to `UPDATE Order SET customerId = sessionCustomerId WHERE publicTrackingToken = token AND customerId IS NULL AND createdAt >= cutoff`. The result must distinguish only: claimed/already-owned, generic conflict, not eligible/not found and unauthorized.
- Preserve guest checkout, tracking, WhatsApp, admin history and the existing customer-order projection. After success, `/cuenta` must show the order without duplicating it.
- No new table, identity provider, infrastructure, order event kind, production migration or remote data mutation is part of this contract.

### Required proof before staging

- token-only, TL-only, email-only and phone-only attempts cannot claim;
- unauthenticated, malformed, expired-window and unknown-token requests fail without ownership change;
- explicit confirmation is required;
- same-customer retry is idempotent;
- two parallel claims yield one owner and no duplicate association;
- another customer receives a generic conflict and cannot read or alter ownership;
- public tracking, WhatsApp, guest checkout, admin view and customer history remain compatible;
- no token, customer identity, address, transfer holder or internal order fields leak through the claim response/UI.

## Objective

Allow an authenticated Taco Club customer to view their order history and explicitly associate an eligible guest order using the existing private tracking link, without weakening guest checkout or exposing internal order data.

## Requirements

- Guest checkout remains first-class and requires no account.
- Customer history is derived from the existing `Order` and `OrderEvent` records; no parallel history table.
- `Order.customerId` remains nullable for guests.
- Claim requires an authenticated customer session, a valid opaque tracking token, explicit confirmation and same-origin/CSRF protection.
- Claim is idempotent for the same customer.
- A claim already associated with another customer returns a generic conflict and reveals no ownership details.
- `TL-xxxx`, email, phone and address alone never authorize a claim.
- Public tracking continues working before, after and without a claim.
- Public projections remain minimal; history/account views must not expose delivery address, transfer holder, internal notes, administrative reasons or unnecessary raw events.
- No points, rewards, promotions, addresses, favorites or repeat-order behavior in this contract.

## Expected surfaces

- Customer account history route and safe API projection.
- Explicit claim flow from `/pedido/[token]` or account UI.
- Atomic conditional `Order.customerId` association with an auditable `OrderEvent` only if the product contract requires a customer-visible milestone; do not create duplicate history.
- PostgreSQL and D1 additive migration only if a schema/index/claim audit field is proven necessary.
- Tests for token authorization, CSRF, idempotency, conflicts, privacy, guest compatibility and concurrent claim attempts.

## Constraints and non-goals

- No production changes or deployment.
- No automatic linking by email, phone, TL number or Google identity email.
- No customer account redesign, multitenancy, recovery provider or loyalty rules.
- Do not silently change order lifecycle, tracking-token semantics or admin permissions.
- Preserve `OrderEvent` as the only canonical order history.

## Required acceptance evidence

| Requirement | Producer | Evidence | Consumer | Failure behavior |
|---|---|---|---|---|
| Authenticated customer sees only their associated orders | customer session + history query | sanitized allow-list/API tests and staging journey | security/integration reviewer | block PASS |
| Guest claim needs opaque token and explicit confirmation | claim API/UI | 401/403/404/conflict tests and HTTP evidence | critic | block PASS |
| Same customer can retry claim safely | conditional update/idempotency path | repeated and concurrent claim test | critic | REWORK on duplicate or race |
| Another customer cannot claim an owned order | conditional ownership check | generic conflict response test | security reviewer | block PASS |
| Guest tracking remains independent | existing tracking API and UI | regression evidence | integration reviewer | REWORK if broken |
| No sensitive fields leak | projection allow-list | automated schema/privacy test | critic | block PASS |

## Human gates

The claim policy above is approved. Pause again only if retention/erasure, guest claim UX, account deletion, or customer-history privacy policy changes materially. Staging deployment still requires explicit authorization; production remains separately unauthorized.

## Done when

Local implementation, D1/PostgreSQL migrations if needed, full affected QA, Independent Critic PASS, Integration Review PASS, and bounded staging validation are complete. Do not begin implementation until P1a is approved for integration and the claim/retention policy is confirmed.

## Resume point

The next authorized action is protected merge/integration authorization for the exact staging-validated candidate. No production work is authorized.
