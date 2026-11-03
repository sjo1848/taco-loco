# Issue #33 — Expanded autonomous staging QA

Date: 2026-11-03  
Repository: `sjo1848/taco-loco`  
Integrated branch: `rework/tl-order-tracking-return-p0`  
Application HEAD: `8cbbc0170edaac69eddeb6d211039bb73eabd2ef`  
Staging Worker: `taco-loco-staging-20260913`  
Staging URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`  
Deployment version: `b8b8629c-e83e-4359-8b0d-777b57372bee`

## Safety boundary

The tests used bounded synthetic data against staging only. No production resource, production database, new migration, paid service, real customer credential, operator credential, Google account or real WhatsApp delivery was used. Existing staging configuration exposes only the approved D1, Static Assets, version metadata and GIS settings.

## Executed coverage

### Public and multibrowser runner

Command:

```text
TACO_LOCO_QA_OUTPUT=output/playwright/issue-33-multibrowser-final pnpm qa:staging
```

Browsers: Chromium, Firefox and WebKit.  Viewports: 360, 390, 430, 768 and 1440 px.

Result: `PASS=55`, `FAIL=0`, `EXTERNAL_BLOCKED=9`.

The nine blocked records are three provider-dependent categories repeated for each browser:

1. Real Google account selection and authenticated provider flow.
2. Authenticated operator workflows requiring a real staging operator credential.
3. Real WhatsApp Web/app handoff, send and return on an external provider/device.

The runner did not convert these into PASS. Synthetic URL construction, fallback UI and tracking-link behavior remain covered separately.

Evidence directory: `output/playwright/issue-33-multibrowser-final/` (local, not committed in bulk).

### Authenticated UI fixture runner

Command:

```text
TACO_LOCO_QA_AUTH_OUTPUT=output/playwright/issue-33-authenticated-final4 pnpm qa:staging:auth-fixtures
```

Result across Chromium, Firefox and WebKit: `PASS=45`, `FAIL=0`, `EXTERNAL_BLOCKED=0`.

This is isolated browser-context UI coverage with intercepted `/api/customer/**` fixtures. It proves the client-side account, address, favorite, history, repeat-order, checkout reachability and logout presentation paths without claiming Google authentication, real D1 identity ownership, or real admin authorization.

Evidence directory: `output/playwright/issue-33-authenticated-final4/` (local, not committed in bulk).

## Corrections included

- PR #44 / merge `d79eb3b`: corrected contrast for account controls.
- PR #45 / merge `8a33e8b`: made fixture logout validation assert the session API `401` and removal of authenticated welcome state.
- PR #46 / merge `8cbbc017`: added an explicit accessible contrast/focus treatment for product favorite controls; this removed the WebKit axe contrast failures observed on the preceding candidate.

The final public run on `8cbbc017` has no automated failures.

## External limits

Still not independently proven by this automated run:

- Google GIS account selection and real customer session persistence.
- Real authenticated operator board, payment confirmation and catalog administration.
- WhatsApp provider send, mobile/deep-link behavior and physical/browser return.

These remain `EXTERNAL_BLOCKED`, not PASS. No production readiness or production authorization follows from this evidence.

## Classification

`AUTOMATED_STAGING_QA_PASS_WITH_EXTERNAL_BLOCKERS`

The technically automatable Issue #33 scope is complete for the deployed candidate. The remaining checks require the explicitly external credentials/provider/device conditions above.

Production: `NOT_AUTHORIZED`.
