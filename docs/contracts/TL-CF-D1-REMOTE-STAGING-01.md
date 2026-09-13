# TL-CF-D1-REMOTE-STAGING-01 — bounded Cloudflare D1 validation

Status: `REMOTE_STAGING_REWORK_PENDING_ASSURANCE / STATIC_ASSETS`  
Mode: `DELIVERY`  
Phase: `VALIDATE / RELEASE_PREPARATION`  
Prior validated candidate: `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`  
Remote staging candidate: `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`
Scope: bounded remote validation only; production remains unauthorized.

## Superseding media decision

`MEDIA_STATIC_ASSETS_INITIAL` supersedes R2 as the initial media target.

- R2 enablement/checkout, bucket and `MEDIA_BUCKET` binding are not required.
- Cloudflare Images is deferred/not required unless a separate current requirement justifies it.
- Self-service image upload is deferred.
- Product media is delivered as Workers Static Assets versioned with the application deployment.
- `Product.imageKey` stores/resolves a public static asset path.

The historical `R2_FREE_TIER_ACCEPTED` decision and API 10042 evidence remain preserved but no longer block this contract.

## Canonical inputs

- Active local adaptation contract: `docs/contracts/TL-CF-STATIC-ASSETS-01.md`
- Decision: `docs/evidence/TL-MEDIA-STATIC-ASSETS-DECISION-2026-09-13.md`
- Gate map: `docs/reviews/TL-CF-D1-REMOTE-STAGING-GATE-MAP.md`
- Prior D1 local evidence for candidate `5d0a1bf`
- Frozen source: `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`

## Requirements and acceptance after reactivation

Every mandatory gate must resolve to PASS or contract-backed NOT_APPLICABLE. UNKNOWN cannot be consumed as GREEN.

| Requirement | Expected surface | Acceptance | Evidence |
|---|---|---|---|
| Account/cost guardrail | Workers + D1 account state | initial target remains compatible with COST-0; no mandatory paid plan | sanitized account/plan/quota artifact |
| Worker runtime | deployed candidate | real URL, version and health response | deployment identity and runtime logs |
| D1 provider path | D1 binding/schema | exact migration succeeds and Worker reads/writes real D1 | database identity, migration output, queries |
| Auth/admin/session | deployed routes/secrets | login, session, admin read/mutation, logout invalidation | redacted journey transcript |
| Orders | public/admin routes | order intent, lines, numbering, idempotency, transition | persisted-row and HTTP evidence |
| Events | D1 event path/SSE | no phantom event, ordered replay, bounded polling | event rows and cursor transcript |
| Static media | Workers Static Assets + D1 image reference | representative product image is deployed/reachable with correct reference/content; no R2 dependency | deployment asset evidence + public menu journey |
| Observability | Worker logs | runtime requests and expected errors inspectable | sanitized logs/tail evidence |
| Behavior parity | representative journey | no material drift except explicitly deferred self-service upload | parity report |

## Constraints and non-goals

- No production deployment, cutover, production data, paid plan, intentional billable usage, VPS, external PostgreSQL, Hyperdrive, R2, Cloudflare Images unless independently re-authorized, KV, Durable Objects, realtime, queues or unrelated product changes.
- Use only bounded remote validation resources after the local Static Assets contract passes.
- A new substantive candidate is required after the media adaptation.
- Never record secret values.
- Local concurrency proof remains reusable for unchanged D1 surfaces; remote validation proves provider integration, not provider stress.

## Current stop condition

Remote execution completed for the exact candidate. Two routine runtime defects were corrected through bounded REWORK, with final evidence in `docs/evidence/TL-CF-D1-REMOTE-STAGING-6eccc3a.md`. The final candidate is admitted for fresh Independent Critic review; do not classify remote staging green before that assurance.

Entry conditions are satisfied: exact candidate, affected QA/build/runtime PASS, Independent Critic PASS, Integration Review PASS and synchronized governance.

## Done when

After fresh assurance, if the bounded remote journey passes every mandatory gate in the canonical map, state may advance to `REMOTE_INTEGRATION_PASS` without implying production authorization.

Production remains `NOT_AUTHORIZED`.
