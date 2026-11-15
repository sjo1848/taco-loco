# S7d — candidato integrado, comparación local

Baseline exacto: `8916dab9e5257b925f634026758d803e6b39cee3`. Se aplicaron en orden los commits de #94, #95 y #96 sobre esa base, resolviendo el mock compartido de `queryD1Raw` y `findForLiveEvent`. Esta evidencia corresponde al candidato integrado, no a la suma de resultados de los PR individuales.

## Revisión independiente y ajuste

La revisión independiente señaló que #96 había reducido los campos de `OrderLine` en el evento SSE. Aunque la interfaz actual usa cuatro campos, se restituyó `lines: true` en la proyección para conservar el contrato completo del stream. El test de ruta ahora comprueba `unitPriceAmount` y el repositorio exige todos los campos de línea. Se mantuvo la reducción de lecturas de historial, actores y usuarios que no forman parte del evento. La revisión también señaló la conversión de `bigint` a `number`; ahora se rechazan conteos fuera de `Number.isSafeInteger`.

## Método

- D1 SQLite local aislada en `/tmp/tl-s7d-integrated/d1`, con 100, 1.000 y 10.000 órdenes sintéticas. Un solo Wrangler/Workerd a la vez. Baseline y candidato leyeron los mismos datos en cada tamaño; ninguna D1 remota fue tocada.
- Por cada versión y tamaño, seis rutas administrativas tuvieron 11 solicitudes, descartando la primera como calentamiento: 10 muestras por celda. Los JSON adjuntos conservan p50, p95, estados y bytes. Esta muestra es útil para dirección, pero no prueba un SLA.
- El replay SSE usó 40 eventos sintéticos de una orden después del cursor 10000, tres streams por versión, con secuencias 10001–10040. Se conservan los resultados crudos por versión.
- `wrangler d1 execute --local --json` devolvió `meta.duration`, pero no `rows_read` en esta configuración local. Por eso no se reporta una medición exacta de filas leídas. `EXPLAIN QUERY PLAN` de Phase A confirma que el agregado recorre `Order` completo; en este fixture examina lógicamente 100/1.000/10.000 órdenes por ejecución. La facturación D1 remota puede diferir y se debe medir con su metadata/Analytics.
- CPU del Worker optimizado: **no medido en Cloudflare**. Los perfiles locales de Phase A atribuyeron 18–44% de muestras activas al query compiler WASM según ruta. La comparación de CPU del proceso SQLite para siete conteos está en Phase A; el SQL del agregado integrado es idéntico. Wall local y duración de spans D1 no equivalen a CPU Worker.

## Latencia local p50 / p95 en ms

| Tamaño | Ruta | Baseline | Integrado |
|---:|---|---:|---:|
| 100 | Cocina contadores | 50,93 / 89,52 | 31,44 / 59,07 |
| 100 | Atención contadores | 35,55 / 44,63 | 24,41 / 33,74 |
| 100 | Atención hoy | 38,53 / 56,09 | 27,55 / 47,74 |
| 1.000 | Cocina contadores | 46,83 / 81,82 | 37,94 / 61,42 |
| 1.000 | Atención contadores | 33,69 / 43,20 | 22,63 / 29,57 |
| 1.000 | Atención hoy | 39,19 / 51,41 | 37,66 / 60,44 |
| 10.000 | Cocina contadores | 63,27 / 99,00 | 35,20 / 50,07 |
| 10.000 | Atención contadores | 48,98 / 63,02 | 31,53 / 35,00 |
| 10.000 | Atención hoy | 55,90 / 79,62 | 43,82 / 55,30 |

Las páginas y rutas de control están en los JSON adjuntos. Historial y Atención anteriores no invocan los nuevos agregados; sus pequeñas oscilaciones en ambos sentidos no se atribuyen a la optimización. A 10.000 pedidos la consulta agregada sigue siendo más rápida en la ruta de Workerd local, pero su costo de escaneo aumenta con el tamaño. La p95 de Atención hoy a 1.000 empeoró en esta muestra pequeña; medir nuevamente en staging antes de declarar mejora universal.

## Consultas y SSE

- Cocina contadores: nueve a tres sentencias D1 observadas por solicitud (incluye dos de sesión). Atención contadores: ocho a tres; Atención hoy: nueve a cuatro. Estos recuentos corresponden al plan de llamadas y trazas locales previas; el código combinado conserva la misma ruta D1.
- Replay SSE, mediana de tres streams: 323 a 162 spans D1; duración acumulada de spans 1.197 a 341 ms; recepción completa de 40 eventos 1.022,02 a 690,51 ms. Primer evento 118,12 a 118,32 ms, sin mejora material. Los 40 IDs se entregaron ordenados en ambos casos.
- Los bytes de stream fueron idénticos: 24.022 B por replay en ambos. Se preservó intencionalmente el payload de líneas. El sondeo en reposo cada 2 segundos y la revalidación de sesión cada 10 segundos no cambiaron.
- En una prueba local adicional, tres streams simultáneos del candidato recibieron cada uno los 40 IDs correctos en orden, sin pérdida ni duplicados; tiempos de recepción completos 2,93–2,97 s. Este resultado demuestra concurrencia funcional local, no capacidad remota ni una mejora de latencia bajo carga. El contador de spans del explorador local no se atribuye por stream en esta prueba.
- Cursor, replay, revocación de sesión y desconexión tienen tests; los tests dirigidos del código combinado cubren el mock unificado y el payload de línea.

## Decisión provisional

No añadir índices: la medición local muestra que el agregado de escaneo completo gana hasta 10.000 filas, mientras un índice nuevo añade costo de escritura y requiere migración. Reabrir si `rows_read`/latencia remota muestran crecimiento inaceptable a mayor volumen.

La documentación de Cloudflare fija 10 ms CPU por request en Workers Free; el staging anterior reportó cifras rotuladas CPU superiores, pero no se confirmó el plan ni se midió la versión optimizada en Cloudflare. No se certifica Free ni se cambia a Paid. Para un piloto comercial en una cuenta confirmada Free, la recomendación provisional es Paid si las mediciones del SHA optimizado siguen por encima de 10 ms o si se acerca al límite diario D1; esa decisión requiere métricas remotas y aprobación de facturación. Issue #62 permanece abierto.
