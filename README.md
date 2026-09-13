# Taco Loco

Migración Cloudflare-native del sistema Taco Loco Foodtrack.

## Estado actual

La fuente funcional histórica permanece intacta en `sjo1848/taco-loco-foodtrack`.
Este repositorio es el destino de la migración y conserva trazabilidad con el baseline fuente `a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`.

Arquitectura objetivo inicial vigente:

- Cloudflare Workers + vinext para aplicación/API.
- Cloudflare D1 para datos estructurados y transaccionales.
- Workers Static Assets para imágenes de productos.
- `Product.imageKey` como referencia/path público al asset estático.
- Imágenes gestionadas por el operador/desarrollador mediante cambio de repositorio + deploy.
- Autoservicio de carga de imágenes diferido para una futura iteración.

No forman parte del target inicial:

- VPS
- PostgreSQL externo / Hyperdrive
- R2
- Cloudflare Images
- KV
- Durable Objects

Las decisiones anteriores PostgreSQL/Hyperdrive/R2 se conservan en contratos/evidencia histórica; no son el objetivo vigente.

Producción sigue `NOT_AUTHORIZED`.

Ver `STATE.md`, `docs/MIGRATION-STRATEGY.md` y los contratos activos.
