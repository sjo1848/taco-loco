# Taco Loco

Migración Cloudflare-native del sistema Taco Loco Foodtrack.

## Estado

La fuente funcional histórica permanece intacta en `sjo1848/taco-loco-foodtrack`.
Este repositorio es el destino de la migración y parte del baseline fuente `a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`.

Arquitectura objetivo inicial:

- Cloudflare Workers para runtime de aplicación/API, sujeto a compatibility gate.
- PostgreSQL como fuente transaccional inicial.
- Prisma mantenido inicialmente.
- Hyperdrive para conectividad a PostgreSQL cuando corresponda.
- Cloudflare R2 para media.
- Durable Objects como candidato para reemplazar el realtime basado en PostgreSQL `LISTEN/NOTIFY` + SSE.
- D1 fuera del primer corte de migración.

Ver `docs/MIGRATION-STRATEGY.md`.
