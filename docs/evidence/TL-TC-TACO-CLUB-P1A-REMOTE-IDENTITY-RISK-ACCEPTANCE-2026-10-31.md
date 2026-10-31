# Taco Club P1a — proposed residual-risk decision

Status: `PROPOSAL_ONLY / HUMAN_DECISION_REQUIRED`

## Scope

The exact candidate `e6fd77a360c298cded9495ab79e9c805310f4487` is deployed to the existing staging Worker. Functional authenticated browser validation is complete. This artifact addresses only concurrent Google identity creation/recovery against provider D1.

## Existing guarantees

- `CustomerIdentity(provider, providerSubject)` has a unique constraint.
- Identity/session persistence is server-side; customer sessions are separate from administrator sessions.
- Customer creation and identity linking use the bounded D1 atomic path with stable IDs and bounded retry handling.
- Definitive `UNIQUE` conflicts are distinguished from transient `SQLITE_BUSY` failures.
- A challenge is consumed atomically and is not reused after a post-consumption persistence failure.
- The observed staging aggregate has 3 customers, 3 identities, zero duplicate identity groups and zero orphan customers.
- Sequential staging login, logout and re-login reused the same anonymized customer fingerprint.

## What remains unknown

No authorized parallel synthetic identity write was executed against a provider-backed D1 environment. Therefore the exact behavior under simultaneous first-login requests, including provider timing and recovery from `UNIQUE`/`SQLITE_BUSY`, is not proven.

## Proposed acceptance, not yet approved

If the human accepts the residual risk for P1a integration, the acceptance should be limited to:

- no claim that real provider concurrency is proven;
- reliance on the database unique constraint as the duplicate-prevention boundary;
- bounded retries only for classified transient contention;
- fail-closed infrastructure response when recovery cannot be established;
- no automatic retry that can create a second customer or session;
- continued staging monitoring of customer/identity cardinality, duplicate-key queries, 5xx auth responses and repeated identity-link failures;
- immediate re-opening of the risk if a duplicate identity/customer, orphan customer, unbounded retry, persistent `SQLITE_BUSY`, or mismatch between identity and session records is observed.

## Impact and recovery

The probable impact of an unresolved contention defect is a failed login attempt or, in the worst case, inconsistent identity/customer creation. The existing uniqueness and stable-ID controls reduce the duplicate-creation path, but do not substitute for provider-level evidence. Recovery is to reject the affected attempt, require a fresh Google challenge, inspect sanitized identity/customer cardinality, and re-run the login only after the failed transaction has settled. No production rollout is authorized by this proposal.

## Conditions to reopen

Reopen the risk before integration if staging shows any duplicate provider identity, orphan customer, unexplained customer cardinality increase, repeated `SQLITE_BUSY`, auth 5xx spike, or inability to recover with a fresh challenge. A future isolated provider-D1 concurrency test may replace this proposal with direct evidence.

## Decision

`HUMAN_GATE_PENDING`

This document does not accept the risk automatically and does not declare real concurrency PASS.
