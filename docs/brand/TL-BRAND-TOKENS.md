# Taco Loco — Brand Tokens

## Color tokens

Values are the digital values printed in the approved manual:

| Token | Value | Use |
| --- | --- | --- |
| `--brand-yellow` | `#FDB913` | secondary accent, prices, selected controls |
| `--brand-green` | `#2DA44A` | primary pattern, brand actions |
| `--brand-red` | `#ED1C24` | limited accent and selected attention states |

Brand colors are not automatically semantic success/error/status colors.

## Pattern

`--brand-pattern-primary` points to `/brand/taco-loco-pattern-green.webp`. The extracted manual swatch is used as a non-repeating, aspect-ratio-preserving `cover` layer because its source edges are not a certified seamless tile. Reusable `brand-pattern` surfaces use a separate decorative pseudo-element so content opacity is unaffected.

## Typography

The existing system stack remains active. Poppins (body/UI) and Bebas Neue (short branded headings) are deferred until approved local font assets are available.

## Surface rules

- Public menu: expressive green patterned hero, neutral catalog and checkout.
- Success and tracking: expressive green patterned hero, clean summary/timeline.
- Admin: restrained logo/accent only; no repeated pattern behind operational rows.
- Minimum contrast target: WCAG AA for relevant text; use solid panels where the pattern could interfere.
- No animation, parallax or runtime service is used for the pattern.
