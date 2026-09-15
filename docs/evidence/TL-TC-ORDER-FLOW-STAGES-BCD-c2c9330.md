# TL-TC-ORDER-FLOW-01 — Strict delivery confirmation gate evidence

- Exact substantive candidate: `c2c9330d587cb9f16aab629ea0596d131364917b`
- Rework from: `65de7048b9fc95e3523ddd73d927c82db72bfe54`
- Production: `NOT_AUTHORIZED`; remote resources untouched.

Delivery confirmation is now strictly server-gated: `CONFIRMED` payment is accepted, or `REPORTED` payment only with explicit `confirmPayment=true`; `NOT_REQUIRED`, `PENDING`, rejected and unconfirmed reported states are rejected. Tests cover these states, atomic transition bindings, payment rejection SQL and delivery fields.

Validation: 12 files / 36 tests PASS, changed-file ESLint PASS, generated-cache-isolated typecheck PASS, and vinext Worker build PASS. Independent Critic remains pending for this exact candidate.
