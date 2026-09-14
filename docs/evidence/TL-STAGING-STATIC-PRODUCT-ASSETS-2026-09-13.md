# Taco Loco — Static product assets integrated in staging

Date: 2026-09-13  
Classification: `STAGING_STATIC_ASSETS_READY`  
Technical candidate: `f896b6b7f3af22987aaf42097be1aacebeea556a`  
Execution/governance HEAD: `1e3a6bc94ae50ce4fe4884ab693f51457f1433f6`

## Scope

The 26 existing product WebP files from the repository-root `products/` source folder were incorporated into `public/products/` using `/products/<product-id>.webp`. The target seed assigns those paths for matching IDs. Five canonical products have no supplied asset and retain the existing staging placeholder.

No R2, Cloudflare Images, upload API, new binding or production resource was introduced.

## Local evidence

- Static assets added: `26`
- Total static asset size: approximately `4.8 MiB`
- Tests: `12` files / `31` tests PASS
- `pnpm run build:vinext`: PASS
- Wrangler dry-run: PASS; 26 WebP files present in `dist/client/products`; bindings remain D1 + Static Assets + version metadata
- Generic `next build` remains unsuitable for this Worker project because its pre-existing `/api/health` collection attempts to load `cloudflare:workers`; the contract build path `build:vinext` passed.

## Remote staging evidence

- Worker: `taco-loco-staging-20260913`
- URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`
- Deployment version: `e38f7071-779c-4933-945f-08c69d120d44`
- D1: `taco-loco-staging-20260913` (`266d23b2-4056-41c0-82d9-4f063ba48d78`)
- Worker health: HTTP `200`
- Public menu: HTTP `200`
- Real product assets: `26/26` HTTP `200`, `image/webp`
- Canonical published products: `31`
- Products using real static assets: `26`
- Products retaining temporary `/products/taco-carne.jpg`: `5`
- Products without `imageKey`: `0`
- Admin catalog read: HTTP `200`, 26 real mappings and 5 placeholders

The staging D1 updates were data-only `imageKey` changes. Existing orders, events, WhatsApp configuration and production authorization were not changed.

## Boundary

Production remains `NOT_AUTHORIZED`. No production deployment, cutover, DNS, paid resource, R2 or Images action occurred.

## Next action

Human reviews the existing staging menu with the real product imagery. Additional product assets can be added later under the same convention when supplied.
