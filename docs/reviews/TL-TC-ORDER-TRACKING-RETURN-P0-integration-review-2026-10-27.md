# Integration Review — TL-TC-ORDER-TRACKING-RETURN-P0

Date: 2026-10-27  
Candidate: `de368359ea18ced8571b8a36e20cd8f73f2f8d7a`  
Staging deployment: `1a27db08-8753-4e17-8ded-238ad99a0a8c`

## Verdict

`PASS`

## Composition reviewed

- Existing order creation response continues to provide the server-generated tracking path.
- `MenuExperience` persists a bounded pending handoff, launches WhatsApp through the existing paths, and resumes only after a return signal or reload.
- Existing customer tracking page consumes/clears the pending handoff and continues its existing D1-backed polling.
- Existing idempotency and order/event behavior are unchanged.
- New-cart detection, explicit “another order” actions and expiry prevent accidental navigation to an old order.
- Public menu, success state, tracking page and browser storage compose without a new API or infrastructure dependency.

## Evidence

- Mobile viewport simulation: 390×844, automatic `/pedido/<opaque-token>` restoration after return/reload.
- Desktop viewport simulation: 1440×900, same restoration path with popup handoff state initialized before opening.
- Submitted cart is synchronously empty before the resume callback; this closes the earlier false-negative guard race.
- Existing staging idempotency check returned the same order/path with `reused=true` and no duplicate business order.
- Existing tracking endpoint and D1-backed page remained reachable.
- Worker deployment exposes only the existing D1, Static Assets and version metadata bindings.

## Human boundary

This review does not claim that WhatsApp confirms message delivery or that every OS/browser returns from the native app/deep link. Those provider/device journeys are the next manual review surface. The implementation preserves the manual WhatsApp fallback when automatic return is unavailable.

## Production

`NOT_AUTHORIZED`. No production resource, deployment, secret, DNS or traffic was touched.
