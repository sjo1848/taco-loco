# Evidence Index — Taco Loco
As of: 2026-09-13

- Problem: PROVEN — Cloudflare-native/USD-0 objective and current product baseline.
- Design: PROVEN for D1 target; initial media strategy updated by explicit Human Decision `MEDIA_STATIC_ASSETS_INITIAL`.
- Prior D1 implementation: PROVEN — candidate `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`, Independent Critic PASS and Integration Review PASS.
- Static Assets media implementation: PROVEN — candidate `4007a5810c998a7c4478dfb4b054c9c612860a1a`; `docs/evidence/TL-CF-STATIC-ASSETS-4007a58.md`.
- Validation: PROVEN — local adaptation and bounded remote provider journey passed with Independent Critic and Integration Review.
- Release/Deployment: PARTIAL — bounded non-production Worker/D1 deployment proven; production remains unauthorized.
- Maintenance/Operations: UNKNOWN — not operated in production.
- Judgment/Decisions: PROVEN — D1 decision, COST-0 constraint, `R2_FREE_TIER_ACCEPTED` historical decision, and later `MEDIA_STATIC_ASSETS_INITIAL` supersession for initial media.
- Orchestration/Resume: PROVEN — `docs/orchestration/RESUME.md`.
- Static Assets decision: PROVEN — `docs/evidence/TL-MEDIA-STATIC-ASSETS-DECISION-2026-09-13.md`.
- Self-service upload: DEFERRED by Human Decision for the initial release.
- R2 enablement: NOT_REQUIRED_INITIAL; previous API 10042/account evidence remains historical and inspectable.
- Remote D1 staging contract: REMOTE_INTEGRATION_PASS — `docs/contracts/TL-CF-D1-REMOTE-STAGING-01.md`; exact final candidate `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`.
- Remote staging evidence: PROVEN — `docs/evidence/TL-CF-D1-REMOTE-STAGING-6eccc3a.md`.
- Remote staging effective bindings: PROVEN — `docs/evidence/TL-CF-D1-REMOTE-STAGING-bindings-6eccc3.json`.
- Remote staging Independent Critic: PROVEN PASS — `docs/reviews/TL-CF-D1-REMOTE-STAGING-independent-critic-6eccc3a.md`.
- Remote staging Integration Review: PROVEN PASS — `docs/reviews/TL-CF-D1-REMOTE-STAGING-integration-review-6eccc3a.md`.
- Staging catalog parity: PROVEN PASS — `docs/evidence/TL-STAGING-CATALOG-PARITY-2026-09-13.md`; frozen source `a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`, 7 active categories, 31 published products, zero missing/mismatched/duplicate public canonical products, realistic order and modifier journey PASS.
- Staging manual review preparation: PROVEN PASS — `docs/evidence/TL-STAGING-MANUAL-REVIEW-READY-2026-09-13.md`; 31/31 temporary image coverage, staging admin access, public/menu/image/session/order/idempotency/event regression PASS. Production remains explicitly unauthorized.
- Staging WhatsApp number: PROVEN PASS — `docs/evidence/TL-STAGING-WHATSAPP-NUMBER-FIXED-2026-09-13.md`; staging-only `MenuSettings.whatsappPhone` corrected from sanitized `5491112345678` to `5492615956912`, web/mobile handoff, order number and admin settings verified. Production untouched.
- Staging static product assets: PROVEN PASS — `docs/evidence/TL-STAGING-STATIC-PRODUCT-ASSETS-2026-09-13.md`; candidate `f896b6b`, 26 real WebP assets deployed and linked in D1, 5 documented placeholders, Worker/D1/Static Assets runtime PASS.
- Static Assets Independent Critic: PROVEN PASS — `docs/reviews/TL-CF-STATIC-ASSETS-independent-critic-4007a58.md`; exact candidate and fresh independent context.
- Static Assets Integration Review: PROVEN PASS — `docs/reviews/TL-CF-STATIC-ASSETS-integration-review-4007a58.md`; exact candidate and fresh independent context.
- Order-flow Stage A implementation: PROVEN TECHNICAL_PASS — substantive candidate `d8d98f7196284ffe0464a562033241aebbaf4c3c`; `docs/evidence/TL-TC-ORDER-FLOW-STAGE-A-d8d98f7.md`. PostgreSQL/D1 order-flow dimensions, safe legacy defaults and D1 `DELIVERY` binding coverage are validated locally.
- Order-flow Stage A Independent Critic: PROVEN PASS — `docs/reviews/TL-TC-ORDER-FLOW-STAGE-A-independent-critic-d8d98f7.md`; fresh independent context, exact candidate, prior binding-test gap reworked and closed.
- Order-flow Stage A Integration Review: PROVEN PASS — `docs/reviews/TL-TC-ORDER-FLOW-STAGE-A-integration-review-d8d98f7.md`; exact candidate and synchronized governance state.
- Order-flow Stages B–D: TECHNICAL_PASS — exact candidate `03fa3ce14d51e8ec2017c2a2ff9d00da19d79c04`; checkout, exception actions, D1/PostgreSQL guards, SSE queue snapshots and tests pass. Evidence: `docs/evidence/TL-TC-ORDER-FLOW-STAGES-BCD-03fa3ce.md`.
- Order-flow Stages B–D Independent Critic: PROVEN PASS — exact candidate `03fa3ce14d51e8ec2017c2a2ff9d00da19d79c04`; evidence `docs/reviews/TL-TC-ORDER-FLOW-STAGES-BCD-independent-critic-03fa3ce.md`.
- Order-flow Stages B–D Integration Review: PROVEN PASS — exact candidate `03fa3ce14d51e8ec2017c2a2ff9d00da19d79c04`; evidence `docs/reviews/TL-TC-ORDER-FLOW-STAGES-BCD-integration-review-03fa3ce.md`.

Coverage is conservative; no historical process or PASS state is fabricated.
