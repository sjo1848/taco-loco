# Taco Loco — Cloudflare migration

Source repository: `sjo1848/taco-loco-foodtrack` (read-only baseline during migration).  
Destination repository: `sjo1848/taco-loco`.

Migration rule: preserve source unchanged; all Cloudflare-native work happens in the destination repository with durable contracts/evidence.

## Current target architecture

- Next.js/vinext on Cloudflare Workers.
- Cloudflare D1 as the structured/transactional data store.
- Workers Static Assets for initial product media.
- Product media references stored in D1 as public static paths.
- Persisted-event polling replaces the PostgreSQL LISTEN/NOTIFY runtime dependency.

## Initial media scope

`MEDIA_STATIC_ASSETS_INITIAL` is the current Human Decision:
- images are added/replaced by the operator/developer through repository change + deployment;
- admin/customer self-service image upload is deferred;
- R2 enablement/checkout is not required for the initial release;
- Cloudflare Images is deferred unless independently justified later.

## Historical architecture

Earlier migration stages evaluated PostgreSQL + Prisma + Hyperdrive and R2/Images. Those decisions/evidence remain preserved for traceability but are superseded by the current D1 + Static Assets target.

No production cutover is authorized by this branch.
