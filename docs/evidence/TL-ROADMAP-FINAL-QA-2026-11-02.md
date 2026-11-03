# Taco Loco — QA final del candidato compuesto

Fecha: 2026-11-02  
Rama: `integration/tl-roadmap-final-20261102`  
HEAD: `1b568a91d0c7f32bdb1b7cf53073265af876edce`  
Base: `rework/tl-order-tracking-return-p0`  
PR: #29

## Verificación de integración

- HEAD local y remoto coinciden.
- Base remota verificada: `5d422c7fb731144971293ebce3446f7c5bb6d5ca`.
- PR #29 permanece draft y mergeable CLEAN.
- CI `quality`: PASS.
- El diff funcional contiene la composición de PR #18 y #28 más el override de seguridad descrito abajo.

## QA funcional

- Suite: 32 archivos / 107 tests PASS.
- Typecheck: PASS.
- ESLint sobre archivos versionados: 0 errores; 5 warnings preexistentes.
- `build:vinext`: PASS.
- D1/SQLite aislado: migraciones 0006 y 0007 PASS; las cuatro tablas esperadas existen.
- Harness de regresión: notas manuales preservadas, primer reporte de pago `reused=false`, segundo `reused=true`, un único evento `PAYMENT_REPORTED`, secuencias `10,12`.
- Se mantienen cubiertas por la suite/evidencia integrada: checkout RETIRO/DELIVERY, sesión Taco Club, aislamiento por cliente, favoritos, direcciones, recompra revisable, tracking, reporte/confirmación de transferencia, administración y catálogo.

## QA visual Playwright

Capturas nuevas conservadas en `output/playwright/final-qa/`:

- Menú: `menu-360.png`, `menu-390.png`, `menu-430.png`, `menu-768.png`, `menu-1440.png`.
- Checkout: `checkout-360.png`, `checkout-1440.png`.
- Cuenta: `account-360.png`, `account-1440.png`.
- Tracking/error boundary: `tracking-360.png`.
- Administración: `admin-login-1440.png`.

Se revisaron overflow, legibilidad, controles, jerarquía de CTA, patrón de marca, selección RETIRO/DELIVERY y estado de visitante. No se detectó defecto visual material en estos recorridos.

La ruta de tracking se comprobó con token sintético inválido y respondió 404 genérico; no se presenta como una reconstrucción de un pedido real local sin una D1 de prueba persistente.

## Seguridad y dependencias

La auditoría de producción detectó `fflate@0.7.3` vulnerable transitivamente por `vinext -> @vercel/og -> satori`. Se agregó el override versionado `fflate: 0.7.5` en `pnpm-workspace.yaml` y se regeneró el lockfile.

Resultado posterior: `pnpm audit --prod --audit-level=high` reporta 0 vulnerabilidades.

No se versionaron secretos, tokens, cookies, credenciales ni datos de clientes.

## D1 staging procedure

No se ejecutó remoto. Para staging: respaldo/exportación verificada antes de aplicar 0006/0007; aplicar migraciones canónicas; consultar tablas/índices y versión aplicada; ejecutar smoke de preferencias/ledger; conservar exportación y evidencia. La recuperación remota destructiva no fue probada y requiere decisión humana separada.

## Clasificación

`READY_FOR_STAGING_AUTHORIZATION`

Condiciones restantes: autorización agrupada para migración/deployment en staging, revisión/aceptación humana visual y validación física de WhatsApp. Producción permanece `NOT_AUTHORIZED`.
