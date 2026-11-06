# Taco Loco — Issue #48 approved visual redesign staging evidence

Date: 2026-11-06
Branch: `feature/tl-approved-redesign-48`
Application candidate deployed: `07461ef015db3b96d629c4c2de5d2105d86a600c`
Staging Worker: `taco-loco-staging-20260913`
Staging URL: https://taco-loco-staging-20260913.sjo1848.workers.dev
Deployment version: `ef3d56af-90a3-481a-b45f-cf6d1d4844dd`

## Implemented

- Public app shell changed from a dark responsive website to the approved light, mobile-first menu experience.
- Compact branded header with real Taco Loco logo/pattern, open/closed status and prominent cart CTA.
- Fixed mobile navigation: Menú / Pedidos / Cuenta, with active context and safe-area padding.
- Horizontal category chips, visible search and vertical food-first product cards with lateral Static Asset images.
- Green/cream/yellow/red brand hierarchy with readable neutral content surfaces.
- Product modifiers remain real backend-driven bottom sheets with validation and add-to-cart behavior.
- Cart remains persistent while navigating; quantity controls, checkout options and the primary WhatsApp CTA remain intact.
- Account, tracking and public panels inherit the light visual system; admin tokens are explicitly scoped back to the dark operational surface.
- No database migration, business rule, authentication, order, payment or infrastructure change was introduced.

## Visual evidence

New staging captures were generated locally under `output/playwright/brand-v1-staging/`:

- `final-menu-390.png`, `final-menu-768.png`, `final-menu-1440.png`
- `final-cart-390.png`
- `final-product-sheet-390.png`

The 390px menu shows the branded first screen, visible search, category chips, lateral product image, green add CTA and fixed bottom navigation. The settled cart capture shows the two-step checkout sheet, editable line, name field, RETIRO/DELIVERY controls and primary CTA without overlay bleed. The product capture shows the real `Taco x2 común` modifier sheet and required `Salsa a elección` state.

## Responsive/browser checks

Chromium staging checks at 360, 390, 430, 768 and 1440 px reported no horizontal overflow. The menu rendered all 31 cards, and the mobile bottom navigation was visible at 390 while hidden in favor of the desktop header at 768/1440. Chromium, Firefox and WebKit remain covered by the existing browser harness; the new candidate was additionally inspected in Chromium after deployment.

## Functional regression

- `pnpm test`: 32 files / 108 tests PASS.
- `pnpm typecheck`: PASS.
- `pnpm build:vinext`: PASS.
- Tracked-source ESLint: 0 errors; only pre-existing ignored/declaration warnings.
- Staging health: PASS.
- Existing real staging Google session, Taco Club, tracking, operator and payment evidence remains valid because the application logic was unchanged.
- No new order or payment was created by visual QA.

## Defect corrected during QA

The first visual pass exposed a native `fieldset` border around the RETIRO/DELIVERY selector after the light theme change. It was replaced with an explicit accessible option group style. The admin surface also received an explicit dark token scope to prevent contrast regression from the public light theme.

## Boundary

This is a staging candidate only. Production remains `NOT_AUTHORIZED`. WhatsApp physical send/return and remote D1 restore remain external gates from the existing release process.
