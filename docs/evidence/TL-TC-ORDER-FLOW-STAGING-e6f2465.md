# Taco Loco — Order Flow Staging Validation

- Worker: `taco-loco-staging-20260913`
- URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`
- D1: `taco-loco-staging-20260913` (`266d23b2-4056-41c0-82d9-4f063ba48d78`)
- Candidate: `e6f2465d827f853690ebc96d65db7030de5c484e`
- Deployment version: `f88fab8a-779b-410c-a7d8-4d0fc7127ef4`
- Classification: `HUMAN_INPUT`

## Proven remotely

- Bindings: `DB`, `ASSETS`, `CF_VERSION_METADATA`; no R2/Images/Hyperdrive/KV.
- D1 migration `0002_order_flow_dimensions.sql`: applied; subsequent check up to date.
- Health and Static Assets: PASS (`/api/health` 200; `/products/taco-carne.jpg` 200 `image/jpeg`). Legacy media proxy: 404.
- Admin login/session/logout: PASS; post-logout session 401. Credential values are not stored.
- Pickup order with `Taco x2 común + Picante` and `Daikiri + Mango`: order `TL-0016`, total `17000`, lines/modifier snapshots/event persisted.
- Idempotent retry: same order ID/number, `reused:true`.
- Admin read and pickup transitions `RECEIVED → CONFIRMED → IN_PREPARATION`: PASS.
- Runtime tail recorded successful Worker invocations; no secrets recorded.

## Pending human input

Current staging settings are `deliveryEnabled=0`, `deliveryFeeAmount=0`. The contract requires an operational fixed delivery fee before validating DELIVERY checkout and the atomic `CONFIRM_PAYMENT_AND_ORDER` journey.

Required input: fixed staging delivery fee in ARS. After it is provided, enable DELIVERY only in existing staging, run the bounded delivery journey, and record the result. This does not authorize production.

Production remains `NOT_AUTHORIZED`.
