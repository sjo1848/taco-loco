# TL-CF-D1-REMOTE-STAGING-01 — bounded Cloudflare D1 validation

Status: `BLOCKED_HUMAN_ACTION_R2_ENABLEMENT`  
Mode: `DELIVERY`  
Phase: `VALIDATE / RELEASE_PREPARATION`  
Technical candidate: `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`  
Scope: bounded remote validation only; production remains unauthorized.

## Objective

Prove the already locally validated D1 candidate in real Cloudflare infrastructure using the smallest remote footprint compatible with the Cloudflare-native / USD-0 constraint.

## Canonical inputs

- Local implementation contract: `docs/contracts/TL-CF-D1-LOCAL-IMPLEMENTATION-01.md`
- Gate map: `docs/reviews/TL-CF-D1-REMOTE-STAGING-GATE-MAP.md`
- Local evidence: `docs/evidence/TL-CF-D1-LOCAL-IMPLEMENTATION-0fe52c7.md`
- Independent Critic PASS: `docs/reviews/TL-CF-D1-LOCAL-IMPLEMENTATION-independent-critic-5d0a1bf.md`
- Integration Review PASS: `docs/reviews/TL-CF-D1-LOCAL-IMPLEMENTATION-integration-review-5d0a1bf.md`
- Frozen source: `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`

## Requirements and acceptance

Every mandatory gate must resolve to PASS or contract-backed NOT_APPLICABLE. UNKNOWN cannot be consumed as GREEN.

| Requirement | Expected surface | Acceptance | Evidence |
|---|---|---|---|
| Account/cost guardrail | Workers, D1, R2, Images account state | Free allocation available; no mandatory paid plan or uncontrolled overage | sanitized account/plan/quota artifact |
| Worker runtime | deployed candidate | real URL, version and health response | deployment identity and runtime logs |
| D1 provider path | D1 binding/schema | exact migration succeeds and Worker reads/writes real D1 | database identity, migration output, queries |
| Auth/admin/session | deployed routes/secrets | login, session, admin read/mutation, logout invalidation | redacted journey transcript |
| Orders | public/admin routes | order intent, lines, numbering, idempotency, transition | persisted-row and HTTP evidence |
| Events | D1 event path/SSE | no phantom event, ordered replay, bounded polling | event rows and cursor transcript |
| Media | R2 and Images where required | upload/read/replacement/deletion and transformation path | object/binding evidence without secrets |
| Observability | Worker logs | runtime requests and expected errors inspectable | sanitized logs/tail evidence |
| Behavior parity | representative journey | no material drift from approved local/product baseline | parity report |

## Constraints and non-goals

- No production deployment, cutover, production data, paid plan, intentional billable usage, VPS, external PostgreSQL, Hyperdrive, KV, Durable Objects, realtime, queues, or unrelated product changes.
- Use only disposable/bounded remote validation resources.
- Freeze the substantive candidate; any code change creates a new candidate and reopens affected assurance.
- Never record secret values.
- Local concurrency proof is sufficient; remote validation must prove provider integration, not stress the provider.

## Current blocker and stop condition

`R2_FREE_TIER_ACCEPTED` is the resolved Human Gate decision: R2 is acceptable while expected Taco Loco workload remains materially inside the free allocation; paid-plan upgrades, mandatory recurring cost or expected material overage require a new Human Gate. `wrangler r2 bucket list` returned Cloudflare API code `10042`: R2 still must be enabled through the Cloudflare Dashboard. The runtime has no connected browser channel to perform that dashboard action. Classification: `HUMAN_ACTION`.

The account API also denied billing/subscription reads with `403`; account-specific entitlement and provider free-tier behavior remain UNKNOWN and must be rechecked after enablement. This is evidence work, not an unresolved architecture decision. Do not provision or deploy until the recheck is complete.

## Done when

The bounded remote journey passes every mandatory gate in the canonical map, evidence is persisted, and state is advanced to `REMOTE_INTEGRATION_PASS` without implying production authorization. If R2 remains unavailable or account evidence cannot establish the accepted free-tier guardrail, stop at `HUMAN_ACTION`/`HUMAN_GATE`.
