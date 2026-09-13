# D1 Remote Staging — account and cost guardrail evidence

Date: `2026-09-13`  
Repository: `sjo1848/taco-loco`  
Branch: `migration/cloudflare-native`  
Substantive candidate: `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`  
Execution HEAD observed during recovery: `569369ee8f72ac80f45b8c9baf6ee1c156f9349d`

## Authenticated account checks

- `wrangler whoami`: authenticated account `30e8fad45f7bc1cd5bddad87e18b1aec`; token values not recorded.
- Wrangler version: `4.129.0`.
- `wrangler d1 list`: account API reachable; no Taco Loco D1 database exists. Existing listed databases belong to unrelated HMS projects and were not touched.
- `wrangler deployments list --name taco-loco`: Worker does not exist; no deployment was performed.
- `wrangler secret list --name taco-loco`: Worker does not exist; no secret operation was performed.
- Cloudflare API account read: account type `standard`; no billing values recorded.
- Cloudflare API subscription/profile reads: `403 Authentication error`; billing/plan state remains `UNKNOWN`.
- `wrangler r2 bucket list`: failed with API code `10042`, “Please enable R2 through the Cloudflare Dashboard.” No bucket was created.
- Browser channel: unavailable in this runtime, so Dashboard enablement could not be performed.

## Cost guardrail

The current validation has consumed no remote Worker, D1, R2, Images or billable deployment resources. No paid plan or billing activation was requested.

Reference limits used for the gate map, not as account proof:

- Workers Free: 100,000 requests/day and 10 ms CPU per invocation — [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [limits](https://developers.cloudflare.com/workers/platform/limits/).
- D1 Workers Free: 5 million rows read/day, 100,000 rows written/day and 5 GB total storage; exceeding daily limits returns errors rather than silently proving GREEN — [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).
- R2 free allocation: 10 GB-month storage, 1 million Class A and 10 million Class B operations/month; R2 is not currently enabled in this account — [R2 pricing](https://developers.cloudflare.com/r2/pricing/).
- Images Free transformations: 5,000 unique transformations/month; excess new transformations fail without charge, while Images storage/delivery is paid-only — [Images pricing](https://developers.cloudflare.com/images/pricing/).

## Persisted Human Gate

`R2_FREE_TIER_ACCEPTED`: R2 is accepted under COST-0 while expected Taco Loco workload remains materially inside the free allocation. Potential overage capability is accepted; paid-plan upgrades, mandatory recurring cost or expected material overage require a new Human Gate.

## Classification

`HUMAN_ACTION`: enable R2 through the Cloudflare Dashboard, then recheck account entitlement, billing/plan state and provider behavior through an authenticated runtime channel before provisioning. No remote resource is PASS before that evidence exists.
