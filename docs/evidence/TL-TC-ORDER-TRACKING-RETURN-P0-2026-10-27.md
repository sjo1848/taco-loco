# TL-TC-ORDER-TRACKING-RETURN-P0 — Evidence

Date: 2026-10-27  
Branch: `rework/tl-order-tracking-return-p0`  
Technical candidate: `de368359ea18ced8571b8a36e20cd8f73f2f8d7a`
Production: `NOT_AUTHORIZED`

## Root cause

The prior implementation persisted `trackingHref` only inside the success-dialog record `taco-loco-completed-order` in `sessionStorage`. WhatsApp launch listeners only detected blur/hidden state to show a fallback; no pending handoff state was persisted and no return event navigated to the tracking route. Consequently, returning from WhatsApp left the customer on `/menu` with the manual tracking button as the only path.

## Correction

- Added `src/modules/orders/tracking-resume.ts` with a strict opaque tracking-path check, 24-hour expiry, pending/consumed state and storage cleanup.
- On successful order creation, the generated tracking path is written to browser `localStorage` before opening WhatsApp.
- Desktop handoff state is initialized before `window.open()` so a popup-induced blur cannot be lost; if the user returns while the order request is still in flight, the completed response resumes immediately after the record is written.
- `/menu` resumes the pending tracking path on compatible `visibilitychange`, `focus`, `pageshow` and reload paths.
- A non-empty new cart cancels an older pending resume; “Realizar otro pedido” and “Seguir viendo el menú” clear it.
- The submitted cart is cleared synchronously in the order-submit path, before the resume callback can run; this closes the return-before-fetch-completion race.
- Loading `/pedido/[token]` clears the pending record, while existing tracking polling remains unchanged.
- No API, D1 schema, order lifecycle, idempotency, event, auth, payment or infrastructure changes.

## Automated validation

- `pnpm test -- --reporter=dot`: PASS — 18 files, 53 tests.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS — three pre-existing warnings only.
- `pnpm build:vinext`: PASS.
- `pnpm build`: known baseline failure remains at `/api/health` because conventional Next build cannot resolve Worker-only `cloudflare:workers`; TypeScript compilation itself completed.
- New unit coverage validates opaque path acceptance, storage round-trip, expiry and consumed-state rejection.

## Staging validation

Existing resources only:

- Worker: `taco-loco-staging-20260913`
- URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`
- D1: existing `taco-loco-staging-20260913`; no migration applied.
- Deployment version: `1a27db08-8753-4e17-8ded-238ad99a0a8c`.
- Wrangler dry-run exposed only D1, Static Assets and version metadata bindings.

Provider/runtime checks:

- Real staging order creation returned a tracking path and `TL-0032`.
- Repeated identical `clientReference` returned the same order/path with `reused=true`; no duplicate order was created.
- Existing tracking page returned successfully from D1 for a staging order.
- Headless Chrome staging simulation on deployment `1a27db08-8753-4e17-8ded-238ad99a0a8c` at 390×844 and 1440×900 restored `/pedido/<opaque-token>` from a pending browser record after reload; the submitted cart was `[]` and the consumed record was marked non-pending by `OrderTracking`.
- A non-empty new cart prevented redirect and cleared the older pending record.
- Static Assets/D1/Workers architecture unchanged.

## WhatsApp boundary

The following cannot be truthfully marked automated PASS without a real device/app or WhatsApp Web session:

- actual mobile WhatsApp deep-link launch and return;
- actual desktop WhatsApp Web tab/popup return;
- behavior when WhatsApp is not installed or the OS refuses the scheme.

The implementation preserves the existing manual WhatsApp Web fallback and does not claim that a message was sent. These scenarios are `HUMAN_TRACKING_WORKFLOW_REVIEW` items.

## Classification

`STAGING_TECHNICAL_PASS_HUMAN_TRACKING_WORKFLOW_REVIEW`
