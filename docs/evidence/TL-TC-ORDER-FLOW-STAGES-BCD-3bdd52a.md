# TL-TC-ORDER-FLOW-01 — Concurrent delivery confirmation guard

- Exact substantive candidate: `3bdd52a883d5b6959e448aa9901e4ac6394249a3`
- Rework from: `c2c9330d587cb9f16aab629ea0596d131364917b`
- Production: `NOT_AUTHORIZED`; remote resources untouched.

Delivery confirmation now uses a conditional payment guard in both D1 SQL and PostgreSQL `updateMany`: the mutation succeeds only while payment is `REPORTED` or `CONFIRMED`. A concurrent rejection therefore produces the existing conditional-update failure instead of a confirmed order. Tests assert the guard SQL and the strict payment-state helper.

Validation: 12 files / 37 tests PASS, changed-file ESLint PASS, generated-cache-isolated typecheck PASS, and vinext Worker build PASS. Independent Critic remains pending for this exact candidate.
