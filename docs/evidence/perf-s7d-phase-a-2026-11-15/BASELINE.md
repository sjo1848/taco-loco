# S7d Phase A — baseline de Workers, D1 y SSE

Fecha: 2026-11-15. Commit medido: `8916dab9e5257b925f634026758d803e6b39cee3`.

## Alcance y método

- Se compiló el HEAD de baseline con `pnpm build:vinext` y se aplicaron las migraciones sólo a Wrangler D1 local bajo `/tmp/tl-s7d-baseline/d1`.
- Se sembraron 100, 1.000 y 10.000 pedidos, líneas y eventos sintéticos. No se utilizó ni alteró D1 staging.
- Rutas autenticadas se llamaron únicamente en `http://127.0.0.1:8787` usando una sesión sintética local preinsertada; esa cookie no autentica ningún entorno remoto.
- Cada endpoint tuvo 31 solicitudes, 1 calentamiento descartado y 30 muestras. Los JSON por tamaño preservan p50/p95/máximo de wall y bytes de respuesta.
- `wrangler dev` local activó observabilidad de desarrollo y trazas del adapter Prisma D1. Los spans D1 permiten contar sentencias y medir duración local; el perfil local no es CPU Cloudflare.
- El DevTools CPU Profiler de Wrangler se tomó sobre el Worker local (sin SQL debug), con 30 llamadas autenticadas por ruta, D1 local de 10.000 pedidos. Clasificación por URL/símbolo del profile: query compiler WASM = 44% de muestras activas en Cocina-contadores, 28% en Atención-contadores, 18% en Historial; adapter Prisma/D1 JS = 10%, 14%, 19% respectivamente. El resto pertenece al pipeline/runtime JS, D1 binding/serialización y GC. Es proporción de muestras locales, no ms CPU de producción; símbolos WASM no permiten atribuir funciones internas individuales.
- Las pruebas SQL comparan los siete predicados exactos de `operationalCounts()` contra una agregación condicional que conserva la unión de atención. Se alternó el orden de variantes en 500 iteraciones. Los tiempos `process_cpu` son CPU del proceso Python/SQLite local; no son CPU del Worker ni de D1 remoto.

## Workers — medición real previa en staging

Valores reportados en Issue #93 para Worker `3c8736a0-8b89-43cb-b6bf-3349a4f65aa2`; son mediciones observadas por ruta, no percentiles:

| Ruta | CPU por invocación | Wall | Resultado observado |
|---|---:|---:|---|
| Login válido | 74 ms | 696 ms | 200 |
| Sesión | 101 ms | 376 ms | 200 |
| Pedidos | 250 ms | 682 ms | 200 |
| Contadores Cocina | 136 ms | 682 ms | 200 |
| Contadores Atención | 258 ms | 902 ms | 200 |
| Historial | 289 ms | 708 ms | 200 |
| SSE, conexión de 300 s | 451 ms acumulados | 299.738 s | 19 heartbeats; desconexión intencional; no `exceededCpu` |

La ventana de Analytics del 2026-11-15 reportó 20 éxitos, 1 desconexión de cliente y 0 errores; máximo/p99 de CPU de esa ventana aproximadamente 451 ms. El evento histórico `exceededCpu` de otra versión no tiene ruta identificada y no se atribuye aquí. No fue posible confirmar el plan de cuenta: la lectura devolvió 403 de Cloudflare y el plan queda `UNKNOWN`.

D1 Analytics agregado de esa fecha: 259 lecturas, 6 escrituras, 3.199 filas leídas y 14 escritas. Es agregado diario; no se atribuye por ruta ni a SSE.

## Rutas locales — wall, payload y cantidad de consultas D1

Wall local, ms (Wrangler/workerd local, D1 local; no es CPU). Consultas D1 por una solicitud de sondeo representativa se cuentan desde spans de la traza local; el conteo incluye autenticación de administración.

| Ruta | Tamaño | p50 / p95 ms | Respuesta | Sentencias D1 observadas |
|---|---:|---:|---:|---:|
| Cocina, contadores | 100 | 29,50 / 56,33 | 109 B | 9 (2 auth + 7 conteos) |
| Cocina, contadores | 1.000 | 29,01 / 37,57 | 115 B | 9 |
| Cocina, contadores | 10.000 | 45,08 / 59,83 | 121 B | 9 |
| Cocina, primera página | 100 | 35,04 / 41,98 | 2.054 B | 11 (2 auth + 7 conteos + carga paginada/relación) |
| Cocina, primera página | 1.000 | 35,80 / 49,02 | 11.791 B | 11 |
| Cocina, primera página | 10.000 | 52,31 / 64,39 | 11.797 B | 11 |
| Atención, contadores | 100 | 28,14 / 37,14 | 105 B | 8 (2 auth + 6 conteos) |
| Atención, contadores | 1.000 | 27,88 / 37,29 | 110 B | 8 |
| Atención, contadores | 10.000 | 39,41 / 47,86 | 115 B | 8 |
| Atención, jornada actual | 100 | 32,16 / 38,86 | 4.748 B | 9 (2 auth + 6 conteos + página) |
| Atención, jornada actual | 1.000 | 33,32 / 42,52 | 8.412 B | 9 |
| Atención, jornada actual | 10.000 | 47,76 / 62,82 | 8.481 B | 9 |
| Atención, anteriores | 100 | 16,81 / 20,79 | 51 B | 3 (2 auth + página) |
| Atención, anteriores | 1.000 | 18,10 / 25,99 | 8.304 B | 3 |
| Atención, anteriores | 10.000 | 22,09 / 30,97 | 8.368 B | 3 |
| Historial, primera página | 100 | 16,54 / 24,35 | 6.403 B | 3 (2 auth + página) |
| Historial, primera página | 1.000 | 17,12 / 20,52 | 6.463 B | 3 |
| Historial, primera página | 10.000 | 25,15 / 31,46 | 6.523 B | 3 |

La primera página de Cocina provoca más spans que una sola sentencia de pedidos porque Prisma D1 carga relación(es) aparte. El conteo representativo exacto es 11 spans incluyendo autenticación: 2 lecturas de sesión/usuario, 7 conteos y 2 lecturas para órdenes/líneas.

## Medición SQL: siete conteos vs agregación condicional

La agregación se ejecutó en la D1/SQLite local y produjo exactamente el mismo vector de siete conteos en cada tamaño. Resultados p50 de CPU/wall de proceso (ms, 500 iteraciones alternadas):

| Pedidos | Actual: 7 sentencias, CPU p50 / p95 | Agregado: 1 sentencia, CPU p50 / p95 | Mejora p50 CPU local | Plan actual y agregado |
|---:|---:|---:|---:|---|
| 100 | 0,181 / 0,442 | 0,094 / 0,246 | 48,1% | Conteos actuales usan índice de estado/verificación en varios casos; agregado escanea Order |
| 1.000 | 1,136 / 1,894 | 0,796 / 1,277 | 29,9% | Mismo patrón |
| 10.000 | 17,300 / 25,953 | 8,261 / 14,849 | 52,2% | Mismo patrón |

`EXPLAIN QUERY PLAN` sobre la sentencia real de Prisma capturada del adapter (incluidos su subquery `COUNT`, `LIMIT -1` y `OFFSET 0`) mostró `Order_verificationStatus_createdAt_idx` para los tres conteos combinados, el índice de estado/verificación como cobertura para dos conteos simples, y escaneos completos para los dos predicados `OR` (incidencias y unión de atención). La agregación también hace un escaneo completo, pero elimina siete ejecuciones SQL y resulta más rápida en este SQLite local; su adopción queda condicionada a prueba del `$queryRaw` de Prisma D1 y regresión exacta.

Estos números comparan SQL semánticamente equivalente en SQLite local, no rendimiento de D1 remoto. Las lecturas por consulta de D1 remoto no están disponibles por ruta en este entorno.

## SSE y sobrecarga del detalle

Código: un stream consulta `eventsAfter` cada 2 s y vuelve a validar sesión cada 10 s. Modelo nominal por stream en reposo: 30 consultas de eventos + 6 lecturas de sesión por minuto, más 4 lecturas de inicialización; aproximadamente 184 lecturas durante cinco minutos. El ensayo real previo en staging observó 451 ms CPU y una desconexión de cliente a 300 s, no límite excedido.

El camino actual de notificación llama a `findById()`, que incluye pedido, líneas, creador, actualizador, todos los eventos y actores. El objeto SSE sólo serializa campos del pedido y líneas. Una reproducción local con 10.000 pedidos, un evento replay y 40 eventos históricos sintéticos para el mismo pedido devolvió HTTP 200 y el payload esperado; trace local: 15 spans D1 hasta que el cliente canceló, con 92 ms agregados de duración de spans. El SQL capturado confirma lecturas innecesarias de eventos/actores y del pedido de detalle. El total de duración de spans puede superar el wall por lecturas paralelas y no es CPU.

Una reducción de proyección SSE tiene fundamento; la ganancia en rows-read y CPU Worker debe medirse en comparación posterior y no se da por demostrada aún.

## Reproducir

1. `pnpm build:vinext`
2. `pnpm exec wrangler d1 migrations apply DB --config dist/server/wrangler.json --local --persist-to /tmp/tl-s7d-local/d1`
3. `pnpm exec wrangler dev --config dist/server/wrangler.json --local --persist-to /tmp/tl-s7d-local/d1 --port 8787 --var DEBUG:prisma:driver-adapter:d1`
4. Para cada escenario `N ∈ {100,1000,10000}`:
   - `python3 scripts/perf/seed-local-d1-orders.py --persist-to /tmp/tl-s7d-local/d1 --size N`
   - `node scripts/perf/bench-local-admin-endpoints.mjs --count=31`
   - `python3 scripts/perf/benchmark-local-count-variants.py --persist-to /tmp/tl-s7d-local/d1 --iterations 500`
5. La semilla es sintética, cambia sólo filas con prefijo `perf-s7d-` y rechaza cualquier directorio fuera de `/tmp/tl-s7d-*`. No compartir la cookie sintética con un entorno remoto.

## Recomendación preliminar de plataforma

El staging actual midió 74–289 ms CPU en rutas API y 451 ms para SSE de cinco minutos. Aunque no se observó `exceededCpu` en esa muestra, esas cifras superan 10 ms y evidencian dependencia de la tolerancia ocasional del plan Free. No se puede certificar Free sostenible con ese nivel de CPU. Workers Paid eleva el límite de CPU por solicitud a 30 s por defecto (configurable hasta 5 min) e incluye 10 M requests y 30 M CPU-ms mensuales por US$5/mes; no se propone activarlo porque facturación está fuera de alcance y no hay autorización. La recomendación técnica provisional es **plan Paid antes de un piloto comercial**, condicionada a optimizar y volver a medir el candidato desplegable. Plan actual: `UNKNOWN`.

Fuentes consultadas el 2026-11-15:

- Cloudflare Workers [limits](https://developers.cloudflare.com/workers/platform/limits/) y [pricing](https://developers.cloudflare.com/workers/platform/pricing/).
- Cloudflare D1 [metrics and analytics](https://developers.cloudflare.com/d1/observability/metrics-analytics/) y [pricing](https://developers.cloudflare.com/d1/platform/pricing/).
- Cloudflare [CPU profiling](https://developers.cloudflare.com/workers/observability/dev-tools/cpu-usage/) (DevTools local o perfil de producción desde dashboard/API; el acceso a API de cuenta no está disponible en esta ejecución).
