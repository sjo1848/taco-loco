# Independent Critic — Taco Club P1a

## Candidate

- Exact technical candidate: `e6fd77a360c298cded9495ab79e9c805310f4487`
- Review mode: fresh, read-only, logically independent
- Verdict: `HUMAN_GATE`

## Code review

The candidate satisfies the reviewed code controls:

- Google client configuration rejects non-OK, malformed, incomplete, and inconsistent responses.
- GIS SDK load failure exposes a retryable error; render, credential, and response continuations are guarded by component activity and challenge generation.
- GoogleAuthChallenge consumption is a conditional one-use database update.
- Post-consumption persistence failure returns an infrastructure response and requires a fresh challenge.
- Identity `UNIQUE` conflicts are distinguished from transient `SQLITE_BUSY` failures; retries are bounded and reuse stable IDs.
- Expired/consumed challenge cleanup is bounded to 100 rows and best-effort.
- Customer and administrator sessions remain separate.

## Controls now evidenced on the exact deployed candidate

The 2026-10-31 Playwright evidence closes the previously pending functional staging controls:

- Google login returned to `/cuenta` in the authenticated state.
- Reload preserved the customer session.
- Logout invalidated the customer session (`401`).
- A second login reused the same anonymized `Customer.id` fingerprint.
- Customer session access did not authorize `/admin/orders`; the route redirected to admin login.
- Guest checkout and public tracking worked without Google authentication. The bounded guest test created `TL-0039`; this was an order-flow regression check, not a synthetic identity or schema test.

The staging aggregate remained 3 customers / 3 identities with zero duplicate identity keys and zero orphan customers. The prior 2/2 note was stale; the controlled re-login did not increase the aggregate. No identity fields were persisted.

## Remaining external gate

This is not a code defect and remains unproven for this exact candidate:

- application-level identity contention and recovery against real provider D1 under parallel identity writes.

The local D1 harness and the sequential browser journey do not prove that gate. No parallel synthetic write was made to the shared staging D1.

## Human decision artifact

The residual-risk proposal is recorded at `docs/evidence/TL-TC-TACO-CLUB-P1A-REMOTE-IDENTITY-RISK-ACCEPTANCE-2026-10-31.md`. It is a proposal only; no risk acceptance is inferred.

Exact CI remains PASS — run `41209728396`; the current PR check is also PASS — run `41253107443`.

Production remains `NOT_AUTHORIZED`; PR #9 remains draft.
