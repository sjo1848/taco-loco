# Taco Loco — composición final local

Fecha: 2026-11-02  
Rama: `integration/tl-roadmap-final-20261102`  
Base común verificada: `5d422c7fb731144971293ebce3446f7c5bb6d5ca`  
Candidato técnico: `2fcb3931b567afca7d0cd470cfc159d0dc67e6b5`

## Composición

La rama contiene la composición funcional de PR #18 y la composición UX/UI de PR #28, sin duplicar sus commits. Se preservan las capacidades de Taco Club P1c, ledger P2, Taco Pay manual, tracking, checkout invitado, administración y las superficies UX de Issues #19–#24.

## Correcciones materiales

- `resolveCurrentProductLines` conserva `OrderLine.note` para pedidos manuales y recompra.
- La ruta de pedidos manuales serializa `BigInt` antes de responder JSON al administrador.
- El reporte D1 de pago asigna la secuencia con una subconsulta escalar y crea el evento sólo cuando la actualización gana (`changes() = 1`). Esto evita eventos duplicados y el `orderId NULL` observado en el reintento SQLite.
- `scripts/d1-final-regression-proof.sh` crea una D1 local aislada, aplica las migraciones, ejecuta pedido manual y dos reportes de pago, y verifica las invariantes.

## QA determinista

- Typecheck: PASS.
- Tests: PASS — 32 archivos, 107 tests.
- ESLint sobre archivos fuente versionados: PASS con 5 warnings preexistentes y 0 errores. El `pnpm lint` global no se usa como señal verde porque el árbol `tmp/` no rastreado del entorno de trabajo es escaneado por ESLint; no fue modificado ni eliminado.
- `build:vinext`: PASS.
- Prueba SQLite/D1 aislada: PASS — `D1_SQLITE_PAYMENT_SEQUENCE_AND_MANUAL_NOTES=PASS`; primer reporte `reused=false`, reintento `reused=true`, un `PAYMENT_REPORTED`, secuencias `10,12`, nota de línea preservada.
- No se aplicaron migraciones remotas, no se desplegó y no se modificó producción.

## QA visual y funcional

La composición fue inspeccionada en navegador real sobre el servidor local con snapshots y capturas nuevas de menú/checkout y cuenta en 360, 390, 430, 768 y 1440 px. Se verificó ausencia de overflow, jerarquía de CTA, legibilidad del patrón de marca, carrito, selección RETIRO/DELIVERY y estados de cuenta. Las capturas del conector de navegador no pudieron persistirse en el workspace por una restricción de ruta; las capturas históricas versionadas/no rastreadas no fueron sobrescritas.

Las superficies funcionales restantes se cubren por los tests y evidencias específicas ya integradas: catálogo, checkout, favoritos, direcciones, recompra revisable, tracking, reporte de transferencia, administración y eventos. No se afirma una nueva prueba de proveedor remoto para esas superficies.

## Revisión consolidada

Los reviews previos de PR #18 y PR #28 siguen siendo válidos para sus superficies sin cambios. Esta composición agrega una revisión dirigida a las dos regresiones descritas y a la integración D1/SQLite; no reemplaza la aceptación humana visual ni la validación física de WhatsApp.

## Límites y siguiente frontera

- CI remoto del candidato compuesto debe ejecutarse después de publicar la rama.
- Staging requiere autorización posterior; no se ejecutó.
- La validación física de WhatsApp continúa pendiente.
- La aceptación visual humana integral continúa pendiente.
- Recompensas/beneficios económicos siguen desactivados sin reglas comerciales aprobadas.
- Producción permanece `NOT_AUTHORIZED`.
