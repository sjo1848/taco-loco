# Taco Loco migration invariants
1. `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48` is read-only.
2. Product behavior is preserved during infrastructure migration.
3. The Cloudflare-native / USD-0 Human Gate is the current target constraint; PostgreSQL/Hyperdrive is historical for `TL-CF-MIG-01`.
4. D1 is not implementation-authorized until feasibility review and Independent Critic PASS.
5. Server-side validation, idempotency, sessions and persisted OrderEvent replay semantics must survive.
6. Data semantics take precedence over infrastructure convenience.
7. COST-0 / CLOUDFLARE-NATIVE: initial operation must not require a VPS, external PostgreSQL, mandatory monthly infrastructure spend, or a mandatory paid Cloudflare plan.
8. Free-tier components require requirement-backed justification, measured headroom, over-limit behavior and guardrails.
9. Local evidence precedes remote provider consumption.
10. No PASS without exact SHA plus executable evidence.
11. Functional QA and security audit are independent gates; either may block integration/cutover.
12. Implementation, Independent Critic and Integration Review are separate gates.
13. Production cutover requires a Human Gate.
