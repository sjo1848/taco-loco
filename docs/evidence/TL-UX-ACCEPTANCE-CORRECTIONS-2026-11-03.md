# Taco Loco — UX/UI acceptance corrections

## Candidate

- Branch: `feature/tl-ux-acceptance-corrections-20261103`
- Implementation commit: `2d4615d`
- Base: `29531325f3ccff8deddebd6935c28979a50395af`
- Production: `NOT_AUTHORIZED`
- Remote staging: not deployed in this block

## Implemented

- Added persistent public navigation for menu, cart, account and an active tracking link.
- Preserved cart state in `sessionStorage`; the navigation exposes the current item count and opens the existing checkout sheet.
- Added optional order name to guest checkout and profile-name prefill for an authenticated customer. The value is server-validated and stored as `Order.customerName`; it remains distinct from transfer holder data.
- Added authenticated saved-address selection during delivery checkout and explicit opt-in to save a newly entered address. Existing preference APIs remain owner-authorized.
- Removed the desktop handoff dependency on a blank popup destination: the prepared WhatsApp URL is assigned to the opened window when available, while the originating page always exposes a visible fallback with copy-message, manual WhatsApp Web and tracking actions. No UI claims that WhatsApp sent the message.
- Added admin date filters for today, 7 days, 30 days, all history and custom ranges. Pending verification orders remain visible by default when a date filter is active and can be explicitly hidden.

## Verification

- Vitest: `32` files, `108` tests PASS.
- TypeScript: PASS (`tsc --noEmit`).
- Changed-file ESLint: PASS.
- `build:vinext`: PASS.
- Conventional `next build`: BLOCKED by the existing Cloudflare-only `cloudflare:workers` import when executed in the Node/Turbopack harness; no application error was reported in compilation or TypeScript.
- `git diff --check`: PASS.
- Browser capture attempt: the local server returned the menu shell but could not resolve `menuSettings` because this workspace has no local application database connection. The captures are not treated as visual PASS evidence. Staging remains required for final visual review.

## Scope limits

No database migration, remote D1 write, deployment, production change, payment rule change, or WhatsApp Business integration was performed. Physical WhatsApp behavior remains a human validation item.
