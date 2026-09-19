# TL-TC-BRAND-VISUAL-01 — Staging Evidence

Date: 2026-09-19  
Branch: `feature/tl-brand-visual-01`  
Technical candidate: `23c1a6622f0b91d3a0ca2a95b0585a01acaef27c`  
Production: `NOT_AUTHORIZED`

## Deployment

- Worker: `taco-loco-staging-20260913`
- URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`
- Deployment version: `989ad8ef-48aa-4c57-a3c7-f94fff7ffd5d`
- D1: existing `taco-loco-staging-20260913` (`266d23b2-4056-41c0-82d9-4f063ba48d78`)
- Remote resources created: none
- Production resources modified: none

The deployment used the exact visual candidate and a temporary local Wrangler configuration. The temporary configuration was not committed and exposed only `DB`, `ASSETS`, and `CF_VERSION_METADATA`; no R2, Images, KV, Hyperdrive or other binding was configured.

## Remote checks

| Requirement | Result | Evidence |
| --- | --- | --- |
| Worker reachable | PASS | Existing `workers.dev` URL responded over HTTPS |
| Health runtime | PASS | `GET /api/health` returned HTTP 200 and `x-vinext-build-id` |
| Brand asset | PASS | `GET /brand/taco-loco-pattern-green.webp` returned HTTP 200, `image/webp`, 302×336, 17,026 bytes |
| Cache/runtime headers | PASS | Cloudflare response included `etag`, `cf-cache-status`, and public asset headers |
| Public menu | PASS | HTML returned Taco Loco content; deployed CSS references `/brand/taco-loco-pattern-green.webp` |
| Binding scope | PASS | Wrangler dry-run and deploy listed only D1, Static Assets and version metadata |
| No production impact | PASS | Existing staging Worker/D1 only; no production URL, D1 or DNS action |

## Local visual assurance reused

The exact candidate was locally reviewed at 390×844, 1440×900 and corresponding success, tracking and admin surfaces. Evidence is in `docs/evidence/TL-TC-BRAND-VISUAL-01-local-qa.md` and the committed screenshot packet under `output/playwright/`.

- Public menu: expressive green pattern hero, neutral catalog, readable search and CTA.
- Success: branded confirmation header with neutral order summary and clear actions.
- Tracking: branded hero with neutral timeline and summary.
- Admin: restrained green accent only; operational board remains neutral and legible.

## Classification

`STAGING_VISUAL_VALIDATION_PASS`

This staging pass does not authorize production. The next gate is human visual review of the staging Worker at mobile and desktop sizes.
