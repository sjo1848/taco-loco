# Taco Loco — Cloudflare migration

Source repository: `sjo1848/taco-loco-foodtrack` (read-only baseline during migration).
Destination repository: `sjo1848/taco-loco`.

Migration rule: preserve source unchanged; all Cloudflare-native work happens here through branches and pull requests.

Initial target architecture:
- Next.js application migrated to Cloudflare Workers after compatibility verification.
- PostgreSQL remains the transactional source of truth initially.
- Prisma stays initially, adapting connectivity through Hyperdrive where compatible.
- R2 remains the media target.
- PostgreSQL `LISTEN/NOTIFY` + SSE is treated as a migration hotspot and will be replaced or isolated before a full Workers cutover.
- D1 is explicitly out of scope for the first migration stage.

No production cutover is authorized by this branch.
