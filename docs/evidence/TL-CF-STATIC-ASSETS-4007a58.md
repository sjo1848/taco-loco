# TL-CF-STATIC-ASSETS-4007a58 — local implementation evidence

Candidate: `4007a5810c998a7c4478dfb4b054c9c612860a1a`  
Baseline: `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`  
Contract: `TL-CF-STATIC-ASSETS-01`  
Scope: local only; no Cloudflare resource was provisioned.

## Requirement → implementation → acceptance → evidence

| Requirement | Implementation | Acceptance | Evidence |
|---|---|---|---|
| Static product media | `public/products/taco-carne.jpg`, public `Product.imageKey`, `resolveStaticProductAsset` | valid `/products/...` reference serves directly through Assets | local Worker `GET /products/taco-carne.jpg` → `200 image/jpeg`; response bytes matched committed asset |
| Public rendering | `ProductCard` uses direct static path and `next/image` remains `unoptimized` | image URL is not rewritten through an API proxy; invalid keys render no image | `static-assets.test.ts`, source inspection, build output |
| Operator-managed replacement | Product form stores `imageKey`/`imageAlt` text; workflow documented | create/edit works without multipart upload | `ProductForm.tsx`, operator workflow artifact, typecheck/build |
| Upload deferral | upload UI, upload route and media pipeline removed | no supported self-service upload surface remains | local `POST /api/admin/media/products` → `404`; route absent; full build route list |
| R2/Images removal | Wrangler/Vite config and Worker types contain only DB, Assets and metadata | initial runtime has no `MEDIA_BUCKET`, R2 or `IMAGES` requirement | regenerated `worker-configuration.d.ts`; `wrangler deploy --dry-run` binding inventory |
| D1/product semantics | only media dependency graph changed | prior D1/auth/order/event evidence remains reusable | prior candidate `5d0a1bf` evidence and unchanged suite |

## Validation results

- `pnpm test`: PASS — 12 files, 31 tests.
- `pnpm typecheck`: PASS.
- changed-file ESLint: PASS.
- `pnpm build:vinext`: PASS; generated route list contains no media upload/proxy route.
- `pnpm db:migrate:d1:local`: PASS — `0001_initial.sql`, 22 commands.
- `pnpm exec wrangler types`: PASS; generated bindings are `DB`, `ASSETS`, `CF_VERSION_METADATA`.
- `pnpm exec wrangler deploy --dry-run`: PASS, no deployment; binding inventory has no R2/Images.
- local Worker runtime: PASS — static asset `200 image/jpeg`; legacy upload/proxy paths `404`.

## Cost-0 dependency graph

`Workers + D1 + Workers Static Assets`.

No R2, Cloudflare Images, Hyperdrive, external PostgreSQL, KV, Durable Objects, VPS or paid plan is required by this candidate.

## Assurance boundary

This is a substantive media/config/UI adaptation. Independent Critic and Integration Review are required for this exact candidate. Production remains `NOT_AUTHORIZED`; remote staging remains paused until both reviews PASS and durable state is synchronized.
