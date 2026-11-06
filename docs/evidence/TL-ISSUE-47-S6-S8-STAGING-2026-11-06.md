# Taco Loco — Issue #47 S6–S8 staging evidence

Date: 2026-11-06
Repository: `sjo1848/taco-loco`
Execution HEAD (governance/evidence): `dd6d97ef4a1a8fcea867481acd55d24fc48afe42`
Application candidate deployed: `8cbbc0170edaac69eddeb6d211039bb73eabd2ef`

## Staging identity

- Worker: `taco-loco-staging-20260913`
- URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`
- Deployment version: `b8b8629c-e83e-4359-8b0d-777b57372bee`
- D1: `taco-loco-staging-20260913`
- D1 ID: `266d23b2-4056-41c0-82d9-4f063ba48d78`
- Active bindings: D1 and Workers Static Assets; no R2, Images, KV, Durable Objects, Hyperdrive or external PostgreSQL binding.
- Production: `NOT_AUTHORIZED`; no production action was performed.

## S6 — real staging workflows

| Surface | Result | Evidence boundary |
| --- | --- | --- |
| Public menu, catalog, Static Assets and guest boundaries | PASS | Real staging browser and prior multibrowser evidence. |
| Guest checkout/tracking path | PASS | Existing validated baseline; no Google session required. |
| Authenticated customer with real Google provider | EXTERNAL_BLOCKED | The provider account selector/session was not independently available in this run. Prior fixture tests are not counted as real Google evidence. |
| Operator authentication and console | PASS | Real staging admin session; logout returned to `/admin/login`. |
| Operator filters | PASS | Hoy, 7/30 days, history, custom range, queue/status combinations, and pending visibility were exercised. |
| Catalog/settings access | PASS | `/admin/products` and `/admin/settings` returned successfully in the authenticated staging session. |
| Representative delivery lifecycle | PASS | Existing synthetic `TL-0065`: payment report, payment/order confirmation, preparation, ready and delivered. |
| Public tracking after lifecycle | PASS | Tracking projected `COMPLETED` with ordered public milestones and no forbidden fields. Token omitted from evidence. |
| WhatsApp provider landing | PASS_WITH_LIMITATION | `wa.me` redirected to the WhatsApp provider landing with app/Web choices; no message was sent. Physical/Web send-and-return remains external. |

The staging schedule was closed at the time of the attempted new-order UI journey (22:29 versus the configured 10:00–22:00 schedule). The application correctly exposed the closed/fallback behavior; no unnecessary synthetic order was created.

## S7 — UX, browser and accessibility review

The existing reproducible Playwright evidence remains valid for the unchanged application candidate:

- Chromium, Firefox and WebKit across 360, 390, 430, 768 and 1440 px: 55 PASS, 0 FAIL, 9 EXTERNAL_BLOCKED.
- Isolated authenticated fixture suite: 45 PASS, 0 FAIL. This is explicitly fixture/interception evidence, not proof of Google or real admin provider authentication.
- Fresh staging CLI snapshot confirmed public navigation, menu categories and product interactions.
- Fresh real-admin capture: `output/playwright/issue-47-admin-filters-1440.png` (local, intentionally not committed with this governance evidence).
- Axe/accessibility checks from the existing suite passed. Visual inspection found no material reproducible P0/P1 issue in the reviewed public, account or admin surfaces; no speculative UI code change was made.

## S8 — operations and recovery

Automated/local checks on the current application:

- `pnpm test`: 32 files / 108 tests PASS.
- `pnpm typecheck`: PASS.
- Tracked-source ESLint: 0 errors, 5 existing warnings (tooling/type declaration/import warnings; no new application error).
- `pnpm build:vinext`: PASS.
- Isolated D1/SQLite regression proof: manual notes persisted; first payment report `reused=false`; retry `reused=true`; exactly one payment event; sequence allocation PASS.
- Read-only D1 info: PASS; 20 tables, non-zero database size, provider metrics returned.
- Read-only D1 Time Travel info: PASS; bookmark available: `000000b2-00000000-0000511b-6c90f627ad3b5e9`.
- Local export/import recovery drill: PASS, documented in the existing backup/recovery runbook.

No remote restore was executed or proven. Account-specific retention and destructive recovery behavior remain outside this bounded run.

## Consolidated classification

`READY_FOR_SINGLE_HUMAN_FINAL_TEST_WITH_EXTERNAL_GATES`

The existing staging candidate is suitable for one final owner session. This does not mean production readiness or production authorization.

## Remaining external gates

1. Real Google account selection/session validation for the currently deployed version.
2. Real WhatsApp mobile/Web send-and-return, including the no-send/fallback path on the owner’s device/browser.
3. Human acceptance of the operational pilot and any business decisions arising from that session.
4. Remote restore remains untested; the documented operational criterion is verified export plus available Time Travel plus explicit human risk acceptance.

No credentials, cookies, tracking tokens, emails or customer PII are stored in this artifact.
