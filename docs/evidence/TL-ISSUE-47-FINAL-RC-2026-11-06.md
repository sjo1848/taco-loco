# Taco Loco — Issue #47 final release-candidate verification

Date: 2026-11-06
Repository: `sjo1848/taco-loco`
Application candidate: `8cbbc0170edaac69eddeb6d211039bb73eabd2ef`
Staging Worker: `taco-loco-staging-20260913`
Staging URL: https://taco-loco-staging-20260913.sjo1848.workers.dev
Deployment version: `b8b8629c-e83e-4359-8b0d-777b57372bee`
D1: `taco-loco-staging-20260913` (`266d23b2-4056-41c0-82d9-4f063ba48d78`)

## New directed checks

- Staging health: HTTP 200, `{"status":"ok"}`.
- Public menu: real Playwright snapshot reached all seven category sections, product availability states, modifiers, cart navigation, account navigation and Static Asset images. New capture: `output/playwright/issue-47-final-menu-390.png` (local artifact).
- Google Sign-In: the real GIS button opened the Google provider account-selection flow with the staging origin and configured OAuth client. The first observation was unauthenticated; a later authorized browser session completed the real customer checks recorded below.
- WhatsApp Web: real browser navigation from `wa.me` reached the provider landing `api.whatsapp.com/send`; the message was not sent. Provider send, app handoff and return-to-browser remain `EXTERNAL_BLOCKED`.
- Anonymous customer calls to preferences/session returned the expected unauthorized boundary; no customer data was exposed.
- D1 read-only info: PASS; expected staging UUID, 20 tables and non-zero database size returned. Current provider metrics were read-only.
- D1 Time Travel info: PASS; provider returned a bookmark. No restore was attempted.

## Completed real customer session

After the directed check began, an already-authorized Google account session became available in the controlled browser. The following was observed against the real staging Worker/D1 path, without recording personal values, cookies or tokens:

- Google Sign-In: PASS; the account returned to `/cuenta`, which displayed the authenticated welcome state and Taco Club history.
- Session persistence: PASS; the account history, preferences and authenticated state were available after navigation to `/menu` and back to `/cuenta`.
- Logout: PASS; the UI returned to the visitor state and the GIS control became available again.
- Re-login: PASS; the same account re-entered and the same history was displayed without a new visible customer or identity.
- Favorite: PASS; a synthetic favorite was created and displayed, then removed during cleanup.
- Saved address: PASS; a synthetic address was created and displayed, then removed during cleanup.
- DELIVERY checkout: PASS; the saved address selector populated the current address/reference fields and the delivery fee remained visible. No order was submitted for this preference check.
- Guest boundary: PASS by existing anonymous regression; no guest order was associated automatically with this account.

The real customer session did not provide a second independent Google account, so cross-account privacy isolation remains covered by the existing authenticated fixture/authorization tests rather than a two-real-account staging comparison.

## Automated regression

- `pnpm test`: 32 files / 108 tests PASS.
- `pnpm typecheck`: PASS.
- `pnpm build:vinext`: PASS.
- Prior tracked-source lint result remains valid: 0 errors, 5 pre-existing warnings.
- Existing Playwright baseline remains valid for unchanged code: Chromium, Firefox and WebKit across 360/390/430/768/1440 px, 55 PASS / 0 FAIL / 9 external provider blocks.
- Existing local D1/SQLite regression proof remains PASS for manual notes, payment idempotency and event sequencing.

## Product and operational conclusion

No new material application defect was reproduced in these directed checks. The staging candidate remains suitable for the owner’s single final session. The schedule is configured for 10:00–22:00; final ordering checks should run within that window or explicitly verify closed-state behavior.

## Human gates only

1. Complete one real Google account selection in the already-open GIS flow and verify Taco Club against D1.
2. Complete one real WhatsApp Web/mobile handoff and return without claiming delivery of the message.
3. Owner acceptance of the final staging experience and pilot risk posture.

Remote D1 restore remains untested; export/recovery documentation and Time Travel availability are evidenced, but this is not a destructive restore proof.

Production remains `NOT_AUTHORIZED`. No production resource, migration, restore or paid service was used.
