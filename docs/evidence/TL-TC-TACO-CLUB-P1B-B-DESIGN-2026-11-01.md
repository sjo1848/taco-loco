# Taco Club P1b-B — design and policy gate

Date: 2026-11-01  
Branch: `feature/tl-taco-club-p1b-b`  
Base: `3197611bd8bf464c29fc1418cd2b5d4b9cefea7d` (integrated P1b-A merge)  
Active contract: `docs/contracts/TL-TC-TACO-CLUB-P1B.md`

## Recovery

- Origin was fetched before branch creation.
- The new branch starts from the real integrated P1b-A merge on `origin/rework/tl-order-tracking-return-p0`.
- P1b-A application surfaces are present in the base; no P1b-B application code exists yet.
- The local untracked `products/` directory and other user files were preserved and not staged.

## Scope boundary

This checkpoint contains only the P1b-B policy proposal, technical contract and test plan. No D1/PostgreSQL data, migration, staging resource or production resource was changed.

## Recommended policy

The recommended policy is:

- authenticated customer session plus the complete opaque tracking token are both required;
- claim is available for 30 days after order creation while the order is retained;
- the token remains a bearer capability and shared-link risk is disclosed;
- first atomic claim wins; same-customer retry is idempotent; another owner produces a generic conflict;
- no customer self-unclaim in this increment;
- claim does not extend retention, create a parallel history or emit a synthetic lifecycle event;
- account deletion/erasure and operator unlink require a separate decision/contract.

The human must approve this policy before claim implementation begins.

## Planned proof

The implementation gate must prove authenticated/session enforcement, token format and window, explicit confirmation, atomic conditional ownership, idempotent retry, concurrent claim behavior, generic cross-owner conflict, privacy allow-list, and unchanged guest tracking/checkout/WhatsApp/admin behavior. Local tests precede any staging data mutation; production remains unauthorized.

Classification: `HUMAN_GATE / CLAIM_POLICY_APPROVAL_REQUIRED`
