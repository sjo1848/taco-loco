# TL-TC-BRAND-VISUAL-01 — Local Visual QA

## Scope

Presentation-only branding on `feature/tl-brand-visual-01`. No database, order, payment, auth, persistence, tracking semantics or Cloudflare infrastructure changes.

## Source and asset

- Approved source: `manual tacoloco.pdf`.
- Pattern: green skull swatch, cropped without manual text or creator credit.
- Asset: `public/brand/taco-loco-pattern-green.webp`, 302×336, approximately 20 KB.
- Tokens: `#FDB913`, `#2DA44A`, `#ED1C24` as printed in the manual.

## Visual evidence

All screenshots were regenerated from the current CSS and dimensions were verified with `file`:

- Menu: `output/playwright/menu-390x844.png`, `output/playwright/menu-1440x900.png`.
- Success: `output/playwright/success-390x844.png`, `output/playwright/success-1440x900.png`.
- Tracking: `output/playwright/tracking-390x844.png`, `output/playwright/tracking-1440x900.png`.
- Admin: `output/playwright/admin-390x844.png`, `output/playwright/admin-1440x900.png`.

Observed: expressive green pattern on public hero/success/tracking, neutral readable catalog/checkout/timeline, restrained green admin accent, no accidental tile seams, no horizontal overflow at reviewed sizes, dark text panels/labels for contrast, and no animated background.

## Automated QA

- `pnpm test -- --reporter=dot`: PASS — 17 test files, 50 tests.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS with 3 pre-existing warnings in unchanged verification/generated declaration files.
- `pnpm build:vinext`: PASS.
- `pnpm build`: known baseline limitation, fails before branding-specific behavior because unchanged `src/app/api/health/route.ts` imports Worker-only `cloudflare:workers` under the conventional Next build. The Cloudflare/vinext build passes; this contract does not alter that runtime boundary.
- Static asset runtime check: PASS — local response `200`, `Content-Type: image/webp`.

## Regression boundary

No schema or migration changes. No production action. `products/` and the source manual remain untracked and untouched.

