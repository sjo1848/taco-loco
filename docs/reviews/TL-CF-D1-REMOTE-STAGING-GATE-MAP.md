# Remote Staging Gate Map — Taco Loco D1 + Static Assets

Prior D1 candidate: `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`  
Remote staging candidate: `PENDING_NEW_STATIC_ASSETS_CANDIDATE`  
Status: `PAUSED / LOCAL_STATIC_ASSETS_ADAPTATION_REQUIRED`

This artifact does not provision Cloudflare resources or authorize production.

| Requirement | Producer | Evidence / artifact | Consumer / classifier | Failure behavior |
|---|---|---|---|---|
| Worker deployed and reachable | bounded preview/staging deployment | deployment URL, version/commit, health response, logs | staging readiness classifier | `UNKNOWN` until real deployment; no staging PASS |
| D1 binding and schema available | Cloudflare D1 binding plus migration | binding identity, migration output, schema checksum | runtime classifier | missing binding/migration failure blocks staging |
| D1 replacement reads | D1-backed Worker catalog/settings/auth queries | authenticated HTTP journey and D1 runtime logs | functional parity classifier | read failure is REWORK/EXTERNAL_BLOCKER, not PASS |
| D1 replacement writes | D1 atomic order/line/event path | order creation, admin transition and persisted rows | transactional semantics classifier | rollback/idempotency/sequence failure blocks staging |
| Auth/admin/session | deployed secrets plus AdminUser/session journey | login, session, admin read/write, logout invalidation | security/functional classifier | auth/session failure blocks staging |
| Main business operations | real Worker routes and D1 data | menu, order intent, admin status workflow, event replay | parity classifier | material behavior drift blocks staging |
| Static media | Workers Static Assets plus D1 `imageKey` | representative product asset resolves directly in deployed menu with correct content type/cache behavior | media classifier | missing/broken asset reference blocks staging |
| Self-service upload | initial release scope | contract/decision proves capability is deferred and no unintended upload surface remains | scope/security classifier | exposed upload path is REWORK |
| Secrets and bindings | Cloudflare configuration/secret store | binding inventory, redacted presence checks | deployment classifier | absent/incorrect required secret blocks staging |
| Logs/runtime | Worker observability | request/error logs and runtime compatibility evidence | operations classifier | missing logs/runtime errors block staging |
| Behavior parity | bounded regression journey against product baseline | exact route/assertion results and comparison evidence | release classifier | material regression outside explicit upload deferral is REWORK |
| Free-tier / USD-0 guardrail | Workers + D1 plan/quotas | authenticated account evidence and usage guardrail | cost classifier | unsafe/mandatory paid requirement becomes HUMAN_GATE |

## Current architecture classifications

- R2: `SUPERSEDED_NOT_REQUIRED_INITIAL`; API 10042/enablement is historical evidence, not a blocker.
- Cloudflare Images: `DEFERRED_NOT_REQUIRED_INITIAL` unless independently justified later.
- Workers Static Assets: `ACTIVE_INITIAL_MEDIA_TARGET`.
- Self-service image upload: `DEFERRED`.
- Hyperdrive/external PostgreSQL: superseded historical architecture.
- Production: `NOT_AUTHORIZED`.

## Entry and exit

Remote staging may resume only after the local Static Assets adaptation has a new candidate, affected validation PASS, Independent Critic PASS and Integration Review PASS. Exit requires each mandatory row to have inspectable evidence, with no mandatory `UNKNOWN` consumed as GREEN.
