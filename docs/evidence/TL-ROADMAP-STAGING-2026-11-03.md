# Taco Loco — Final roadmap staging evidence

Date: 2026-11-03
Repository: `sjo1848/taco-loco`
Integrated merge: `29531325f3ccff8deddebd6935c28979a50395af`
Source application candidate: `1b568a91d0c7f32bdb1b7cf53073265af876edce`
Worker: `taco-loco-staging-20260913`
URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`
D1: `taco-loco-staging-20260913` (`266d23b2-4056-41c0-82d9-4f063ba48d78`)

## Protected integration

- PR #29 was verified at the approved head `c394030acc8ec5a0ec5ad0c26e4f4428c7cebd0d`, CI quality passed, and it was merged protected.
- Postmerge SHA: `29531325f3ccff8deddebd6935c28979a50395af`.
- PRs #14, #15, #17, #18, #25, #26, #27 and #28 were not merged independently; their composed work is represented by PR #29.

## D1 guardrail and migrations

- Read-only account/provider access: PASS.
- D1 name and ID matched the authorized staging target: PASS.
- Pre-change `d1 info`: 16 tables, 352256 bytes.
- Pre-change Time Travel bookmark was obtained and recorded only in restricted execution logs; its value is intentionally not repeated here.
- Restricted local export: `/tmp/taco-loco-staging-backup-20261103/taco-loco-staging.sql`.
- Export verification: 134472 bytes, SHA-256 `3d87d60e1c339d17366b710625840958b79b7ee705f44c9751e5bcb6b207aec`.
- Migration listing showed exactly `0006_customer_preferences.sql` and `0007_loyalty_ledger.sql` pending.
- Both migrations applied successfully. A second listing reported no pending migrations.
- Post-migration schema inspection showed CustomerAddress, CustomerFavorite, LoyaltyAccount and LoyaltyTransaction plus the expected indexes.
- No remote restore was executed. Production was not accessed.

## Worker deployment

- Dry-run showed only DB, Static Assets, version metadata and the staging Google configuration variables.
- First deployment intentionally stopped short of customer Google validation because the temporary config omitted the public Client ID; it was immediately redeployed with the already-authorized public staging variable. No client secret was used or uploaded.
- Final deployment version: `9a4f9f23-d59b-4d87-ace0-0c9c09bbeaca`.
- Final runtime configuration returned Google Sign-In enabled, health/menu returned 200, anonymous customer session returned 401, invalid tracking returned 404, and the representative Static Asset returned 200 with an image content type.

## Remote functional journey

PASS evidence was captured for the bounded synthetic staging journey:

- Public menu: seven category sections, product availability, modifiers and delivery option visible.
- PICKUP order: created with a canonical modifier, appeared in the admin pending queue, and remained outside kitchen work until operator action.
- DELIVERY order: address/reference/transfer holder were captured, server-side delivery fee was applied, and the total was visible in admin.
- Tracking: public projection returned 200 with `Cache-Control: no-store`, safe projection keys and ordered event history. After admin transitions, the customer tracking page showed payment reported, payment/order confirmed, preparation, ready and delivered milestones.
- Admin: authenticated order console, payment report, atomic payment/order confirmation, preparation, ready and delivered transitions all passed.
- Payment idempotency: first report was effective; the second attempt was rejected as an invalid state; D1 contained exactly one `PAYMENT_REPORTED` event for the test order.
- Idempotency retry: repeating the same client reference returned the same order and `reused=true` without a duplicate order.
- Synthetic rows were removed by explicit client-reference prefix and verified at zero remaining rows. Pre-existing staging rows were not targeted.

The real Google account chooser was not completed in this automated pass. The deployed `/cuenta` surface showed the GIS selector and the configuration endpoint was enabled, but customer-account creation/history/favorites/address/repeat-order E2E remains for the final human acceptance session. No PASS is claimed for that unobserved control.

Physical WhatsApp app/Web return remains the previously declared human-device pending control. WhatsApp was not opened or messaged during this staging run.

## Visual evidence

Fresh screenshots from the deployed Worker are stored under `output/playwright/staging-final/`, including menu viewports 360, 390, 430, 768 and 1440; pickup/delivery checkout; account/GIS selector; tracking at 360; and authenticated admin orders at 1440. Visual inspection found no material overflow or legibility defect in the captured surfaces.

## Local/CI assurance

- PR #29 required CI quality: PASS (107 tests, typecheck, lint, audit and vinext build in the clean CI checkout).
- Local postmerge test run: 32 files / 107 tests PASS.
- Local vinext build used for deployment: PASS.
- Production audit: zero high-level vulnerabilities after the existing fflate override.
- A full local typecheck/lint rerun in this dirty workspace was not used as release evidence because long-running generated untracked material caused the shell harness to exceed its bounded observation window; the clean CI result is authoritative for the merged candidate.

## Classification

`STAGING_INTEGRATION_PASS_WITH_HUMAN_ACCEPTANCE_PENDING`

This is not production readiness. Production remains `NOT_AUTHORIZED`. The next action is the single human acceptance session covering Google account flows, the five visual surfaces, and the four physical WhatsApp scenarios.
