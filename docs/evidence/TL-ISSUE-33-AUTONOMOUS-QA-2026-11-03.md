# Issue #33 — Autonomous staging QA

Date: 2026-11-03  
Repository: `sjo1848/taco-loco`  
Branch under test: `rework/tl-order-tracking-return-p0`  
QA candidate: `949c952a02d9670ddca925c4223860b98d3a9afa`  
Staging Worker: `taco-loco-staging-20260913`  
Staging URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`  
Staging deployment version: `e71f6c21-a97a-41a6-bd22-f2558f8056c9`  

## Scope and safety

The runner used Playwright against the real staging Worker with synthetic order data. It did not use production resources, real customer credentials, administrator credentials, Google account selection, or real WhatsApp delivery. No D1 migration or production operation was performed for Issue #33.

Command:

```text
TACO_LOCO_QA_BROWSERS=chromium TACO_LOCO_QA_OUTPUT=output/playwright/issue-33-final8 pnpm qa:staging
```

The local Chrome runtime was available. Firefox/WebKit were not requested in the final run because the installed system runtime was Chromium-only; this is not represented as a PASS.

## Final result

`PASS=24`, `FAIL=0`, `EXTERNAL_BLOCKED=3`.

Automated PASS coverage includes:

- menu, global navigation and catalog at 360, 390, 430, 768 and 1440 px;
- axe accessibility scans at all five viewports;
- anonymous session behavior with expected 401 probes;
- pickup cart and checkout;
- delivery fields, required address and transfer-holder fields;
- synthetic order creation without a duplicate submission retry;
- success state, tracking href shape and tracking navigation;
- tracking deep-link rendering;
- WhatsApp fallback surface and expected `whatsapp://` abort classification;
- public account visitor state;
- admin login surface;
- staging `/api/health` returned HTTP 200 (`{"status":"ok"}`).

External checks deliberately not claimed as PASS:

1. Real Google consent/account selection and authenticated customer workflows: `EXTERNAL_BLOCKED` because no external account was supplied to the runner.
2. Authenticated admin workflows: `EXTERNAL_BLOCKED` because no operator credential was supplied.
3. Real WhatsApp app/Web handoff, message send and physical return: `EXTERNAL_BLOCKED`; the synthetic URL construction, fallback and tracking link were exercised, but no provider/device result was invented.

## Defects found and corrected

- PR #34 / merge `44a7a743febfed72ad6a8547e36581c2a5cd5c94`: added the autonomous QA runner and corrected the invalid GIS accessibility markup.
- PR #35 / merge `9f1eb4dd83d48c752078b2ad07a9f614d046f23c`: removed duplicate Playwright dependency entries.
- PR #36 / merge `9887629368348b444f3854b41393ad7fc6d8b1ad`: corrected the first tracking-navigation wait race.
- PR #37 / merge `ddfc73cb51072b8c42f15754c6acb1b83e3afe6a`: made tracking navigation assertion concurrent.
- PR #38 / merge `8d99eeb5bf2e01dad576575ab6826248d8cba825`: asserted the opaque tracking href and committed navigation.
- PR #40 / merge `a3f1a4279f056a4129e84aaebcb595e50d332556`: stabilized the hydrated success action.
- PR #41 / merge `949c952a02d9670ddca925c4223860b98d3a9afa`: activated the actual tracking anchor after the custom WhatsApp protocol handoff.
- PR #42 / merge `ff9edfa0c954621560ae07df87413eeee96f9287`: classified only expected anonymous bootstrap aborts during navigation cleanup.
- PR #43 / merge `11cb026f58f3b5bb576bb43f979eb457a5ad8d0c`: waits for the actual success notice and tracking link instead of resubmitting an order.

The final run was clean after these harness corrections. No application behavior was changed by the final Issue #33 fixes; the staging application remained deployment version `e71f6c21-a97a-41a6-bd22-f2558f8056c9`.

## Evidence

The final local evidence directory contains the report, screenshots, axe JSON and Playwright traces:

`output/playwright/issue-33-final8/`

Earlier failed runs are retained locally for diagnosis and are not treated as final PASS evidence. They are not production data and are not committed as a bulk artifact.

## Classification

`AUTOMATED_STAGING_QA_PASS_WITH_EXTERNAL_BLOCKERS`

The automatable Issue #33 scope is complete. The three external checks remain explicitly blocked and require a later authorized human/device session; they do not authorize production.

Production: `NOT_AUTHORIZED`.
