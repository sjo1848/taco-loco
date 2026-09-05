# Taco Loco migration invariants

1. Source repo `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48` is read-only.
2. Product behavior is preserved during infrastructure migration.
3. PostgreSQL remains transactional source of truth until a separate approved contract changes it.
4. D1 is out of scope for the initial migration.
5. Server-side catalog validation, order idempotency, sessions and persisted OrderEvent replay semantics must remain intact.
6. No PASS/closure without exact SHA plus executable evidence.
7. Implementation and independent review are separate roles/gates.
8. Production cutover requires a Human Gate.
