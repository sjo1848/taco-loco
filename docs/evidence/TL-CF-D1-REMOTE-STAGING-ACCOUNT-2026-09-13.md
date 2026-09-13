# D1 Remote Staging — account and cost guardrail evidence

Date: `2026-09-13`  
Repository: `sjo1848/taco-loco`  
Branch: `migration/cloudflare-native`  
Prior substantive candidate: `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`

## Historical authenticated account checks

- `wrangler whoami`: authenticated Cloudflare account; token values were not recorded.
- `wrangler d1 list`: account API reachable; no Taco Loco D1 database existed at the time of the check.
- no Taco Loco Worker or secrets existed; no deployment was performed.
- Cloudflare API subscription/profile reads returned `403 Authentication error`; billing values were not proven.
- `wrangler r2 bucket list` returned API code `10042`, requiring R2 Dashboard enablement. No bucket was created.
- No remote Worker, D1, R2, Images or billable deployment resources were consumed.

## Historical R2 decision

`R2_FREE_TIER_ACCEPTED` previously established that R2 would have been acceptable under COST-0 while expected workload remained inside the free allocation.

That decision is retained as historical evidence.

## Later superseding Human Decision

`MEDIA_STATIC_ASSETS_INITIAL` now supersedes R2 for the initial Taco Loco media target.

Consequences:
- R2 enablement/checkout is no longer required.
- API code 10042 is historical evidence, not a current blocker.
- R2 billing/subscription evidence is no longer a mandatory gate for the initial release.
- initial media will use Workers Static Assets.
- self-service image upload is deferred.
- Cloudflare Images is deferred unless another requirement independently justifies it.

The remote cost gate, when staging resumes, must establish the approved initial target: Workers + D1 + Static Assets. It must not require evidence for services that are no longer part of the target.

## Current classification

`SUPERSEDED_R2_BLOCKER / LOCAL_STATIC_ASSETS_ADAPTATION_REQUIRED`

No remote provisioning or production action is authorized by this artifact.
