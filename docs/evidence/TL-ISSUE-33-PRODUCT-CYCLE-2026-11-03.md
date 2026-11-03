# Issue #33 — Product-cycle QA review

Date: 2026-11-03  
Application deployed: `8cbbc0170edaac69eddeb6d211039bb73eabd2ef`  
Staging Worker version: `b8b8629c-e83e-4359-8b0d-777b57372bee`

## Client agent

The real staging Worker was exercised as an anonymous first-time customer through the Playwright runner and CLI snapshot. The flow covered menu discovery, category navigation, search, cart entry, PICKUP checkout, DELIVERY checkout, required delivery data, transfer-holder data, order creation, success/tracking link, tracking reload and WhatsApp fallback surface. The public multibrowser run covered Chromium, Firefox and WebKit at 360, 390, 430, 768 and 1440 pixels.

Result: `55 PASS`, `0 FAIL`.

The authenticated customer fixture run covered two isolated synthetic customer contexts, account history, repeat-order proposal, address creation, favorite toggle, authenticated checkout reachability, logout state and cross-context separation in Chromium, Firefox and WebKit. It is explicitly UI fixture coverage and not real Google/D1 authorization evidence.

Result: `45 PASS`, `0 FAIL`.

## Operator/backend agent

The operator credential was not supplied to staging, so authenticated admin UI workflows remain external. The local isolated D1 regression proof exercised the real SQLite/D1 runtime path without touching the remote database:

- manual order persisted with line note `sin cebolla`;
- first customer transfer report returned `reused=false`;
- retry returned `reused=true`;
- exactly one `PAYMENT_REPORTED` event was persisted;
- event sequences and manual-order note were read back successfully;
- final result: `D1_SQLITE_PAYMENT_SEQUENCE_AND_MANUAL_NOTES=PASS`.

No admin credential bypass or alternate staging authentication path was created.

## UX/UI critical review

Fresh staging captures were reviewed for the public menu, mobile checkout, desktop menu and authenticated customer fixture account. The current candidate has visible Taco Loco branding, clear category navigation, cart access, product/action hierarchy, status badges, and readable checkout/tracking surfaces. Axe scans passed at all tested public and fixture viewports. No material visual or interaction defect was reproducibly demonstrated in this pass, so no speculative UI rewrite was introduced.

## Remaining external coverage

These are not PASS claims:

- real Google account selection and provider session;
- authenticated operator dashboard, payment confirmation and catalog mutation;
- real WhatsApp Web/app handoff, send and return;
- physical-device behavior.

Classification: `PRODUCT_CYCLE_AUTOMATED_PASS_WITH_EXTERNAL_BLOCKERS`.

Production remains `NOT_AUTHORIZED`.
