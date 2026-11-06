# Taco Loco — Issue #48 approved visual redesign staging evidence

Date: 2026-11-06
Branch: `feature/tl-approved-redesign-48`
Application candidate deployed: `05c8c76e85fed47a7d315f481b15718e29861e8e`
Staging Worker: `taco-loco-staging-20260913`
Staging URL: https://taco-loco-staging-20260913.sjo1848.workers.dev
Deployment version: `3541fadb-626a-461e-8915-c6cbfcde66b1`

## Implemented

- Public app shell changed from a dark responsive website to the approved light, mobile-first menu experience.
- Compact branded header with real Taco Loco logo/pattern, open/closed status and prominent cart CTA.
- Fixed mobile navigation: Menú / Pedidos / Cuenta, with active context and safe-area padding.
- Horizontal category chips, visible search and vertical food-first product cards with lateral Static Asset images.
- Green/cream/yellow/red brand hierarchy with readable neutral content surfaces.
- Product modifiers remain real backend-driven bottom sheets with validation and add-to-cart behavior.
- Cart remains persistent while navigating; quantity controls, checkout options and the primary WhatsApp CTA remain intact.
- Checkout is explicitly split into `1 Carrito` and `2 Tus datos`: the first step keeps details hidden, while the second exposes name, RETIRO/DELIVERY, saved/manual delivery fields and the submit action.
- Category selection is active on initial load and remains synchronized when selecting a horizontal chip; the product sheet recalculates quantity and total before adding.
- Account, tracking and public panels inherit the light visual system; admin tokens are explicitly scoped back to the dark operational surface.
- No database migration, business rule, authentication, order, payment or infrastructure change was introduced.

## Visual evidence

New staging captures were generated locally under `output/playwright/pr49-final/`:

- `menu-360.png`, `menu-390.png`, `menu-430.png`, `menu-768.png`, `menu-1440.png`
- `product-sheet-390.png`, `cart-step-1-390.png`, `checkout-step-2-390.png`
- `account-390.png`, `tracking-invalid-390.png`, `results.json`

The 390px menu shows the branded first screen, visible search, category chips, lateral product image, green add CTA and fixed bottom navigation. The product capture shows the real `Taco x2 común` modifier sheet, required `Salsa a elección`, quantity `2` and recalculated `$20.000` subtotal. The cart capture proves step 1 hides customer details; the checkout capture proves step 2 exposes RETIRO/DELIVERY and the submit action.

## Responsive/browser checks

Chromium staging checks at 360, 390, 430, 768 and 1440 px reported no horizontal overflow. The menu rendered all 31 cards, and the mobile bottom navigation was visible at 390 while hidden in favor of the desktop header at 768/1440. The final candidate loaded the menu successfully in Chromium, Firefox and WebKit; category chips returned `aria-current="location"` for the selected category in both initial and changed states.

## Functional regression

- `pnpm test`: 32 files / 108 tests PASS.
- `pnpm typecheck`: PASS.
- `pnpm build:vinext`: PASS.
- Tracked-source ESLint: 0 errors; only pre-existing ignored/declaration warnings.
- Staging deploy `3541fadb-626a-461e-8915-c6cbfcde66b1`: PASS.
- Staging health/menu/product-sheet/cart step 1/checkout step 2/account/tracking error route: PASS for the bounded browser journey; no order or payment was created.
- Existing real staging Google session, Taco Club, tracking, operator and payment evidence remains valid because the application logic was unchanged.
- No new order or payment was created by visual QA.

## Defect corrected during QA

The first visual pass exposed a native `fieldset` border around the RETIRO/DELIVERY selector after the light theme change. It was replaced with an explicit accessible option group style. The admin surface also received an explicit dark token scope to prevent contrast regression from the public light theme.

## Boundary

This is a staging candidate only. Production remains `NOT_AUTHORIZED`. WhatsApp physical send/return and remote D1 restore remain external gates from the existing release process.
