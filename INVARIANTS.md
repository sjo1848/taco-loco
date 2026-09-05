# Taco Loco migration invariants
1. `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48` is read-only.
2. Product behavior is preserved during infrastructure migration.
3. PostgreSQL remains the initial transactional source of truth.
4. D1 is out of scope for the initial migration.
5. Server-side validation, idempotency, sessions and persisted OrderEvent replay semantics must survive.
6. No PASS without exact SHA plus executable evidence.
7. Functional QA and security audit are independent gates; either may block integration/cutover.
8. Implementation, Independent Critic and Integration Review are separate gates.
9. Production cutover requires a Human Gate.
