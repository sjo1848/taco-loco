# Taco Loco migration invariants
1. `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48` is read-only.
2. Product behavior is preserved during infrastructure migration except where an explicit Human Decision deliberately defers a capability.
3. The Cloudflare-native / USD-0 Human Gate is the current target constraint; PostgreSQL/Hyperdrive is historical for `TL-CF-MIG-01`.
4. D1 local implementation evidence for candidate `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4` is TECHNICAL_PASS with Independent Critic PASS and Integration Review PASS; substantive changes must preserve or revalidate affected semantics.
5. Server-side validation, idempotency, sessions and persisted OrderEvent replay semantics must survive.
6. Data semantics take precedence over infrastructure convenience.
7. COST-0 / CLOUDFLARE-NATIVE: initial operation must not require a VPS, external PostgreSQL, mandatory monthly infrastructure spend, or a mandatory paid Cloudflare plan.
8. Free-tier components require requirement-backed justification, measured headroom, over-limit behavior and guardrails.
9. Local evidence precedes remote provider consumption.
10. No PASS without exact SHA plus executable evidence.
11. Functional QA and security audit are independent gates; either may block integration/cutover.
12. Implementation, Independent Critic and Integration Review are separate gates.
13. Production cutover requires a Human Gate.
14. `R2_FREE_TIER_ACCEPTED` is retained as historical evidence but is `SUPERSEDED_FOR_INITIAL_MEDIA_TARGET`; R2 is not required for the initial release.
15. `MEDIA_STATIC_ASSETS_INITIAL`: initial product images are versioned Workers Static Assets; D1 stores only the public path/reference.
16. `MEDIA_SELF_SERVICE_UPLOAD_DEFERRED`: customer/admin self-service image upload is outside the initial release; image additions/replacements are operator-managed and require a repository/deployment change.
17. R2, Cloudflare Images, KV and Durable Objects must not be introduced into the initial target without a requirement-backed decision.
