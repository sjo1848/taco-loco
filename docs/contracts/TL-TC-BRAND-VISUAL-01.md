# TL-TC-BRAND-VISUAL-01 — Brand Pattern & Public Visual System

## State

`DESIGN_APPROVED / STAGING_ONLY`

## Scope

Apply the approved Taco Loco visual identity to customer-facing menu, order-success and tracking surfaces, with restrained branding on the operational admin board. This contract changes presentation only.

## Constraints

- Production remains `NOT_AUTHORIZED`.
- No database, persistence, payment, authentication, order-state or infrastructure changes.
- Do not add external fonts, UI frameworks, runtime APIs or animation services.
- The green skull pattern is decorative and must not reduce readability or encode state by color alone.
- `products/` and `manual tacoloco.pdf` remain local, untracked user assets and must not be staged.

## Approved source and decisions

- Source: `manual tacoloco.pdf`.
- Primary pattern: green skull pattern.
- Secondary accent: yellow.
- Limited accent: red.
- Public surfaces are expressive; admin surfaces remain operationally neutral.
- Poppins and Bebas Neue are documented as deferred because no approved local font assets exist in the repository.

## Expected surfaces

`public/brand/taco-loco-pattern-green.webp`, shared brand CSS tokens/pattern variants, public menu hero, order-success dialog, customer tracking hero, restrained admin accent, brand documentation and visual evidence.

## Acceptance

- Pattern asset is a clean extracted WebP with no manual text or creator credit.
- Public menu, success and tracking surfaces visibly use the approved green pattern.
- Catalog, checkout, timeline and admin board remain legible and functional.
- No business logic, schema or infrastructure behavior changes.
- Mobile and desktop visual QA passes at the required viewport sizes.
- Local quality gates pass; staging is updated only after review gates.

## Evidence and gates

Requirement → Surface → Acceptance → Evidence: brand source/tokens → docs and CSS → values and usage documented → source/tokens docs; pattern → static asset → clean, cacheable asset → asset inspection/build; public/admin visual hierarchy → components/CSS → visual QA → screenshots and review; regression → existing harness → tests/typecheck/lint/build → command output.

Independent Critic and Integration Review are required before staging. Stop after staging at `HUMAN_BRAND_WORKFLOW_REVIEW`. Production is always out of scope.

