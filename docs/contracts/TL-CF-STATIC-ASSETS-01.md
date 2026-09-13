# TL-CF-STATIC-ASSETS-01 — local media adaptation

Status: `ACTIVE`  
Mode: `DELIVERY`  
Phase: `IMPLEMENT / VALIDATE`  
Baseline candidate: `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`  
Target candidate: `4007a5810c998a7c4478dfb4b054c9c612860a1a`

## Objective

Adapt Taco Loco's initial media path from dynamic R2 + Images + self-service upload to operator-managed Workers Static Assets, while preserving all already validated D1, auth, catalog, order and event semantics.

## Canonical inputs

- `docs/evidence/TL-MEDIA-STATIC-ASSETS-DECISION-2026-09-13.md`
- `STATE.md`
- `STATUS.json`
- `INVARIANTS.md`
- prior D1 local evidence for candidate `5d0a1bf`
- current media code/configuration

## Requirements

1. Product images for the initial release are deploy-time static assets, preferably under a stable convention such as `public/products/...`.
2. `Product.imageKey` resolves directly to a public static asset path; no R2-backed media proxy is required.
3. Remove the initial-release dependency on `MEDIA_BUCKET` and R2.
4. Remove the initial-release dependency on the Cloudflare Images binding/optimizer unless another current requirement independently proves it necessary.
5. Remove or disable the admin self-service image upload UI/API from the initial release. Do not leave an unintended upload surface reachable.
6. Preserve product creation/editing, catalog rendering, availability, prices, orders, auth, sessions and event semantics.
7. Preserve historical R2/Images evidence; do not rewrite history.
8. Do not provision or deploy remote Cloudflare resources during this contract.

## Decision latitude

Allowed:

- bounded code/config changes required for Static Assets;
- remove unused R2/Images bindings and aliases;
- remove/disable upload UI/API and R2 media proxy when no longer required;
- adapt image URL resolution;
- add representative static test asset(s);
- add/update tests and evidence.

Forbidden:

- product features unrelated to media adaptation;
- changing D1 transactional semantics;
- R2 enablement;
- remote D1/Worker deployment;
- production deployment/cutover;
- introducing KV, Durable Objects, external storage or another paid dependency.

## Required acceptance

Requirement → Expected Surface → Acceptance → Evidence

- Static media delivery → built Worker static asset output → representative product asset resolves without R2/Images → executable local/runtime evidence.
- Product reference → D1/catalog `imageKey` → public menu renders the static asset path correctly → regression/journey evidence.
- Upload deferral → admin UI/API → no self-service upload control or reachable upload endpoint in initial release → route/UI inspection + test evidence.
- R2 removal → Wrangler/runtime config → no required `MEDIA_BUCKET` binding → build/dry-run evidence.
- Images removal → vinext/Worker config → no required `IMAGES` binding unless separately justified → build/dry-run evidence.
- Regression → product baseline → no material drift outside the explicitly deferred upload capability → functional QA.

## Validation

Run at minimum:

- affected unit tests;
- full existing test suite;
- typecheck;
- changed-file ESLint;
- vinext/Worker build;
- Wrangler dry-run;
- local runtime journey covering public menu with a representative static product image;
- admin product create/edit without upload;
- regression of D1/auth/orders/events sufficient to show the adaptation did not disturb their validated surfaces.

Local result: PASS, persisted at `docs/evidence/TL-CF-STATIC-ASSETS-4007a58.md`.

## Assurance

This is substantive cross-surface work. The exact technical candidate is `4007a5810c998a7c4478dfb4b054c9c612860a1a`.

Independent Critic: mandatory.  
Integration Review: required because Worker configuration, product UI and media routing change together.

Prior D1 evidence may be reused only for unaffected surfaces with explicit traceability.

## Done when

- new candidate has affected QA/build/runtime PASS;
- R2 and Images are not mandatory initial-runtime dependencies;
- self-service upload is deferred and not exposed;
- Independent Critic PASS;
- Integration Review PASS;
- durable state/evidence is synchronized;
- the remote staging contract is reactivated against the new candidate using Workers + D1 + Static Assets.

Production remains `NOT_AUTHORIZED`.
