# TL-REL-01 · Seguimiento invitado resiliente

[Contrato en #47](https://github.com/sjo1848/taco-loco/issues/47#issuecomment-7164037069). Base `8c564c80e8e5a6ffcabd6e9c4e61039ea1c65fdb`.

| Requisito | Evidencia |
|---|---|
| 1 · GET invitado y reintento acotado | Chromium a 390 y 1440 px, Workerd y D1 descartable. Tanto 500→200 como error de red→200 generaron dos GET para la referencia afectada y uno para cada otra. Espera de 500 ms cancelable, misma señal, `no-store` y `no-referrer`. Dos 5xx consecutivos y el caso de cuatro fallos simultáneos quedaron en dos intentos inmediatos por referencia. Una notificación de sesión canceló un temporizador de reintento ya armado. |
| 2 · Resultados por referencia | Dos pedidos activos y dos terminales reales en la D1 de prueba. 404 omitido, 401 y 403 sin código ni enlace, 429 visible como no verificable, sin reintento automático en ninguno. Un 200 con JSON inválido para el contrato mostró la fila temporal, con una sola lectura. |
| 3 · Sección temporal, vacíos y sesión | Pedidos verificados conservaron su sección. La prueba de fallo total verificó los dos avisos neutros, sin las leyendas de vacío ni el enlace al menú. El aviso genérico cubrió los 401/403 sin mostrar enlaces, incluso al coincidir con una fila temporal por 429. En el caso mixto se mantuvo un solo botón Reintentar. Reintentar se deshabilitó durante carga y el 200 reemplazó la fila por una tarjeta única. Foco y visibilidad recuperaron las consultas. Durante cambio de cuenta se limpiaron las filas y se abortó una respuesta retenida. Logout local y referencia etiquetada de otra cuenta quedaron sin exposición. |
| 4 · Alcance | Sólo se modificó `CustomerOrders.tsx` en la aplicación. Los cambios de #110 y #111 se integran sobre la base indicada, con sus flujos preservados. Endpoints, backend, D1, almacenamiento, polling individual, 30 s de actualización y presentación restante intactos. |
| 5 · QA y regresiones | 16 escenarios Playwright y respuestas reales 200/204/404 con `no-store`, `no-referrer` y `noindex`. Cero escrituras durante navegación. Los logout explícitos del ensayo se ejecutaron en D1 local. El arnés existente aprobó checkout, retorno simulado, edición de carrito, recompra, claim, permisos, transiciones privadas e idempotencia con cuatro órdenes, cuatro referencias, cuatro eventos de creación, un aviso de pago y cero violaciones FK. Lint, typecheck, 198 tests, audit al umbral high, build Vinext y dry-run local pasaron. El audit reportó ocho avisos moderados presentes en el lockfile intacto. |
| 6 · Diagnóstico histórico | Los dos Ray IDs y ventanas UTC de búsqueda constan abajo. Cloudflare devolvió 403 al consultar los dos registros históricos. La evidencia disponible demuestra los 500 y la ausencia de la tarjeta, con causa del servidor sin confirmar. |
| 7 · Entrega | PR draft con CI y revisión independiente referenciados en #47. Sin merge, activación, cambios de tráfico, recursos ni D1 remota. |

[Estado temporal · 390 px](estado-temporal-390.webp) · [Estado temporal · 1440 px](estado-temporal-1440.webp). Capturas locales con datos sintéticos.

## Ray IDs

Ambos retornaron HTTP 500 en `GET /api/orders/tracking/{token}` desde la vista previa `8711c748-a2f2-4597-820f-c35ad5b16afa` (commit base). La ventana UTC se obtuvo de la creación y última escritura del archivo de cada ensayo. El navegador registró el Ray y el status, con hora exacta de solicitud, outcome, excepción, CPU, wall time y operación D1 todavía desconocidos.

| Ray ID | Ventana UTC del ensayo, 25 de noviembre de 2026 | Resultado |
|---|---|---|
| `a5fe5894da2c1eb4-EZE` | 05:44:49.765–05:45:25.710 | 500 a 390 px y tarjeta activa ausente |
| `a5fe5a706f5375f3-EZE` | 05:46:02.538–05:46:42.723 | 500 a 1440 px y tarjeta activa ausente |

Se ejecutó una consulta histórica por Ray al API de Workers Observability. Ambos accesos devolvieron HTTP 403. Las ventanas son intervalos de captura y los logs históricos conservados carecen de coincidencias por invocación. El handler del backend y sus consultas son idénticos entre la versión activa y la candidata, y el contraste anterior obtuvo 8/8 HTTP 200 por versión. La causa no se atribuye a #93, D1, CPU o al runtime. [Preflight anterior](https://github.com/sjo1848/taco-loco/issues/47#issuecomment-7154159076) · [API de Workers Observability](https://developers.cloudflare.com/api/resources/workers/subresources/observability/subresources/telemetry/methods/query/)

No se generaron nuevas lecturas de tracking remoto para diagnóstico sin confirmar la cuota. Se verificó el deployment activo `4f9d4b47-e753-469b-9105-c1414ca5d088`, Worker `85d98204-7e0a-4adb-b3b7-e0c02e03be35` al 100%. Con esa asignación, la vista previa anterior sigue al 0% de tráfico del Worker.

## Reproducción local

```sh
pnpm build:vinext
TACO_QA_GUEST_TRACKING=1 TACO_QA_GUEST_TRACKING_OUTPUT=output/playwright/tl-rel-01 bash scripts/qa-local-customer-workflows.sh
bash scripts/qa-local-customer-workflows.sh
```

El preflight posterior mantiene como requisito lista completa en 390 y 1440 px, recuperación inyectada local y cero 5xx observados en la ventana remota acotada. Quedan pendientes Google real, WhatsApp físico, aislamiento remoto y transiciones persistidas en staging.
