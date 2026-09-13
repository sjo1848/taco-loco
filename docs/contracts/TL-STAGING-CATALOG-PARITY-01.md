# TL-STAGING-CATALOG-PARITY-01 — Taco Loco staging catalog parity

Status: `ACTIVE`
Mode: `DELIVERY`
Phase: `VALIDATE / RELEASE_PREPARATION`
Application candidate: `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`
Environment: existing bounded staging only
Production: `NOT_AUTHORIZED`

## Human decision

Production release is explicitly deferred. Continue in staging, restore the established Taco Loco catalog from the frozen source, validate the realistic menu/business journey, and only then reopen production authorization.

Future initial public URL preference is `workers.dev` under the COST-0 posture, but this does not authorize production.

## Canonical catalog source

Frozen source repository:
`sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`

Canonical artifact:
`prisma/seed.ts`

The source defines:
- 7 categories: Tacos, Nachos, Quesadillas, Pizzas, Más delicias, Bebidas, Tragos;
- 31 products with exact names, descriptions, prices and sort order;
- modifier groups `Salsa a elección`, `Carne a elección`, `Sabor de daikiri`;
- modifier options for Salsa and Daikiri;
- required single-choice associations for Taco x2 común, Uspallatina, Gordita mexicana and Daikiri.

Do not infer or invent catalog values when the frozen seed provides them.

## Scope

Use the existing staging Worker and staging D1. Reconcile staging catalog data to the frozen source seed.

In scope:
- categories;
- products;
- descriptions;
- prices;
- publish/active state;
- sort order;
- modifier groups/options/associations;
- existing Static Asset reference only where a real current asset is explicitly available;
- representative menu/order validation after catalog load.

Out of scope:
- production resources or deployment;
- custom domain;
- R2/Images;
- self-service image upload;
- migration of production/live customer data;
- recreation of the old seed's demo order;
- changing the staging admin credential merely to match source seed defaults.

## Data safety

Preserve staging evidence/history. Do not delete historical staging orders or events.

Use idempotent upsert/reconciliation semantics where possible. If staging-only fixture products/categories remain, classify them before changing them. Prefer unpublish/archive for noncanonical public fixtures when safe rather than destructive deletion that could break historical references.

The public staging menu after reconciliation should represent the canonical 7-category / 31-product catalog without unintended duplicate public entries.

## Product-image rule

The frozen source catalog does not itself establish an image for every product. Do not invent image mappings.

Keep Workers Static Assets as the media strategy. Missing product images are acceptable for this catalog-parity block unless an explicit existing asset mapping is proven. The representative asset path already validated in remote staging remains valid evidence for the media architecture.

## Validation

After reconciliation, prove at minimum:
- 7 canonical active categories;
- 31 canonical published products;
- exact name/description/price/category/sort-order parity against frozen source;
- required modifier groups/options and four required associations;
- no unintended duplicate public products;
- public menu renders the complete catalog;
- an order can be placed using representative products from multiple categories;
- modifier selection persists for products that require modifiers;
- totals reflect source prices;
- admin catalog reads show the same canonical values;
- auth/session/order/event behavior remains healthy;
- existing staging history is preserved;
- Static Assets representative image still resolves;
- no R2/Images dependency reappears.

A data-only staging reconciliation does not create a new technical candidate. If application code/config changes are required, classify `REWORK`, create a new candidate and rerun affected assurance.

## Exit

PASS when the staging environment has canonical catalog parity and the representative business journey passes with inspectable evidence.

Then persist a staging-catalog evidence artifact and reopen production eligibility as a separate Human Gate.

Production remains `NOT_AUTHORIZED` throughout this contract.