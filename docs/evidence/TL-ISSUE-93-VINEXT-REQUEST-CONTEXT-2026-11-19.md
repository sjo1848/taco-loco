# Issue #93 — Vinext request context mitigation

Candidate base: `2a07424e5104d2f510e7af365fc82963b04ae53d` (PR #102). This runtime change is a separate PR. It is not part of #102 and does not authorize its merge.

## Mechanism under test

`/menu` is a dynamic App Router page. Vinext calls `ensureAppRouteModulesLoaded` before the page's server code. In `vinext@1.0.0-beta.9`, that function keeps an in-flight `Promise.all(loads)` on the route object and returns it to concurrent requests. In `vinext@1.4.5`, `shareIsolatePromise` registers the load with the creating request's `waitUntil` and returns a request-tagged promise. This matches the load path covered by [vinext#4567](https://github.com/cloudflare/vinext/pull/4567) and the V8 condition described in [workerd#8228](https://github.com/cloudflare/workerd/issues/8228).

The historical `/menu` exception said a promise was created by a request that ended. The minified stack includes vinext `cacheComponents`; no source map identifies the specific promise. The test below proves mitigation of the route-load mechanism, **not** the exact cause of that incident.

## Deterministic reproduction

`scripts/perf/vinext-route-context.mjs` adapts Cloudflare's `workerd-promise-context` fixture to the App Router route loader shared by `/menu`. It bundles each installed vinext version with Vite, starts the same local Miniflare/workerd, enables `--allow-natives-syntax --no-maglev`, and forces TurboFan optimization before two requests join a gated route-module load. Each joining request then performs its own service-binding fetch, which workerd rejects if it resumes in the wrong request context.

Run from this branch after installing dependencies, with a separate checkout of the unmodified #102 HEAD and its dependencies installed:

```sh
node scripts/perf/vinext-route-context.mjs /path/to/baseline-checkout
```

Observed twice on Node 22.13.0, Wrangler 4.129.0 / local workerd 1.20260903.1, compatibility date `2026-09-05` and `nodejs_compat` in both variants:

| Vinext | TurboFan primed / creator compiled / joiners | Joiner results |
| --- | --- | --- |
| 1.0.0-beta.9 | true / true / 2 | 500, 500; cross-request I/O error |
| 1.4.5 | true / true / 2 | 200, 200; `upstream ok` |

No remote D1 access, accounts, orders or secrets are involved in this test. It does not reproduce an entire Taco Loco page render or prove that the earlier remote isolate failed at this exact load.

## Compatibility evidence

The upgrade also requires `@vitejs/plugin-rsc@0.5.37` and React/RSC 19.3.1. The new bundler resolves `@/lib/db` directly to `db.worker.ts`; its `queryD1Raw` export is added without changing query semantics. Vinext 1.4.5 enforces a Suspense boundary around the existing `/cuenta` client component using `useSearchParams`; without it, `/cuenta` returned HTTP 500 locally. After the boundary, 10 sequential and 20 parallel requests returned 200. The required CI audit found a newly published high-severity advisory in transitive `effect@3.21.0` from Prisma build tooling; the workspace override to patched `effect@^3.22.1` resolved to `3.22.4` and passed `pnpm audit --audit-level=high`. Three moderate advisories remain and are outside the high-severity gate.

On identical isolated local D1 fixtures, Playwright produced identical accessibility snapshots for menu, product customization, cart and checkout steps; the account visitor view had the same settled content. Health and public menu status returned 200; unauthenticated admin and customer session/operations/attention routes returned 401 in both variants. Both served 200 sequential and 100 parallel `/menu` requests, but that earlier load did **not** force V8 optimization and was inconclusive for the reported mechanism. Full suite: 176 tests, typecheck, lint, vinext build, audit at high severity and Wrangler dry-run passed in the experimental worktree. Exact PR CI must still pass after commit.

## Staging gate and rollback

Keep #102 draft. First obtain CI `quality` and an independent review for this separate runtime PR. Verify staging binding/configuration and preserve active version `5afd1fc9-1c0c-41eb-8ae5-9b60094b7bfd`. Upload the reviewed runtime candidate as an inactive version of the **existing staging Worker** and inspect its Version URL. Exercise public menu, account, cart/checkout without submitting orders, admin auth/authorization and SSE using legitimate session, CPU, Worker errors and the version ID. No D1 writes are needed.

Promote to active staging only if the version URL has no material regression and the target is confirmed. If active errors appear, restore `5afd1fc9-1c0c-41eb-8ae5-9b60094b7bfd` with Wrangler version deployment and confirm `/menu`, session, Cocina, Atención and SSE. A successful trial supports adopting a mitigation for a demonstrated class of failure; it does not establish the exact root cause of the historical `/menu` incident. Cloudflare Builds branch and deploy target remain a separate Human Gate for merging #102.
