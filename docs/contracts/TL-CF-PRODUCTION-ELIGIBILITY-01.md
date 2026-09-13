# TL-CF-PRODUCTION-ELIGIBILITY-01

Status: `PREPARED / HUMAN_GATE_PENDING`
Mode: `DELIVERY`
Phase: `RELEASE_PREPARATION`
Candidate: `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`
Production: `NOT_AUTHORIZED`

## Purpose

Prepare the production decision after remote staging PASS. This contract does not authorize production provisioning, deployment or cutover.

## Entry evidence

- Remote staging: `REMOTE_INTEGRATION_PASS`.
- Independent Critic: `PASS`.
- Integration Review: `PASS`.
- Worker + D1 + Static Assets: proven remotely.
- Auth/session, orders/idempotency/transitions, events/replay and observability: PASS.
- Initial COST-0 architecture remains Workers Free + D1 Free + Workers Static Assets.
- R2, Images, Hyperdrive, external PostgreSQL and KV are not required.

## Proposed initial production shape

Use separate production resources from staging:

```text
Client
  -> production Worker
       -> production D1
       -> Workers Static Assets
```

Do not promote the staging database in place. Keep staging isolated.

## Initial URL recommendation

For the zero-cost first release, use a stable `workers.dev` production URL. A custom domain is optional and may be evaluated later.

## Data decision required

Before production release choose one:

- `FRESH_PRODUCTION_BOOTSTRAP`: start a new production D1 from canonical migrations and intentional initial business data.
- `EXISTING_DATA_MIGRATION_REQUIRED`: if real existing live data must be preserved, create a separate data-migration contract before release.

Staging test data must not become production data by default.

## Release eligibility guardrails

Production release must preserve:
- exact candidate identity;
- separate staging and production resources;
- no mandatory paid-plan dependency;
- no R2/Images dependency;
- reversible release posture;
- bounded production smoke validation before public use;
- production remains unauthorized until the Human Gate resolves.

## Human Gate

Resolve these decisions explicitly:

1. Authorize or reject production release of candidate `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`.
2. Accept `workers.dev` as the initial zero-cost production URL, or defer release pending another URL decision.
3. Choose fresh production bootstrap or declare that existing live data must be migrated.
4. Accept keeping the current staging Worker/D1 available during the initial production period.

## Stop condition

`HUMAN_GATE / PRODUCTION_RELEASE_AUTHORIZATION`

No production action is authorized by this contract.