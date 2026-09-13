# Remote Staging Gate Map — Taco Loco D1 Candidate

Candidate: `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`  
Status: `PREPARED / REMOTE_EXECUTION_NOT_AUTHORIZED`

This is a local gate-satisfiability artifact. It does not provision Cloudflare resources, deploy a Worker, activate billing, or authorize production.

| Requirement | Producer | Evidence / artifact | Consumer / classifier | Failure behavior |
|---|---|---|---|---|
| Worker deployed and reachable | bounded preview/staging deployment | deployment URL, version/commit, health response, logs | staging readiness classifier | `UNKNOWN` until real deployment; no staging PASS |
| D1 binding and schema available | Cloudflare D1 binding plus migration | binding identity, migration output, schema checksum | runtime classifier | missing binding/migration failure blocks staging |
| PostgreSQL replacement reads | D1-backed Worker catalog/settings/auth queries | authenticated HTTP journey and D1 runtime logs | functional parity classifier | read failure is REWORK/EXTERNAL_BLOCKER, not PASS |
| PostgreSQL replacement writes | D1 atomic order/line/event path | order creation, admin transition and persisted rows | transactional semantics classifier | rollback/idempotency/sequence failure blocks staging |
| Auth/admin/session | deployed secrets plus AdminUser/session journey | login, session, admin read/write, logout invalidation | security/functional classifier | auth or session failure blocks staging |
| Main business operations | real Worker routes and D1 data | menu, order intent, admin status workflow, event replay | parity classifier | material behavior drift blocks staging |
| R2/media | R2 binding and test object path | upload, object read, replacement/deletion evidence | media classifier | unknown until real binding; feature path remains unproven |
| Images, if contract-required | Images binding/configuration | transformation/validation evidence | media classifier | classify `NOT_APPLICABLE` only with contract-backed justification; otherwise UNKNOWN |
| Secrets and bindings | Cloudflare configuration and secret store | binding inventory, redacted secret presence checks | deployment classifier | absent/incorrect secret blocks staging |
| Logs/runtime | Worker observability | request/error logs and runtime compatibility evidence | operations classifier | missing logs or runtime errors blocks staging |
| Behavior parity | bounded regression journey against product baseline | exact route/assertion results and comparison evidence | release classifier | material regression is REWORK |
| Free-tier / USD-0 guardrail | account plan, quotas, alerts/limits | authenticated account evidence and usage guardrail | cost classifier | UNKNOWN or unsafe overage becomes HUMAN_ACTION/HUMAN_GATE before production |

## Known external classifications

- R2 account enablement: `HUMAN_ACTION` only if Cloudflare Dashboard enablement is required for the later remote validation.
- D1 account/binding/secrets/preview authorization: `UNKNOWN` until authenticated remote evidence exists; a missing already-decided permission is `HUMAN_ACTION`.
- Hyperdrive/external PostgreSQL: superseded historical architecture, not a staging dependency for this D1 target.
- Production: `NOT_AUTHORIZED`; this map does not grant a production gate.

## Entry and exit

Entry requires the local technical candidate, Independent Critic PASS, Integration Review PASS, and no unresolved local contract defect. Exit requires each mandatory row to have a producer and inspectable evidence, with no mandatory `UNKNOWN` consumed as GREEN. Remote execution remains a separate authorized action.
