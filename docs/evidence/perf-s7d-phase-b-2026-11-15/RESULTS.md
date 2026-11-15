# S7d Phase B — agregación D1 de contadores

Fecha: 2026-11-15. Comparación local reproducible entre baseline `8916dab9e5257b925f634026758d803e6b39cee3` y candidato de Phase B sobre el mismo D1 local aislado con 10.000 pedidos sintéticos.

## Cambio

- Cocina reemplaza siete llamadas `count()` paralelas por una agregación condicional D1.
- Atención reemplaza seis llamadas `count()` por una agregación condicional D1, con los mismos predicados de unión y los mismos límites del día de negocio de Buenos Aires.
- PostgreSQL conserva el camino Prisma anterior.
- No se añadieron índices ni migraciones: la medición local favoreció la consulta agregada pese al escaneo de `Order`; se evita aumentar escrituras o cambiar el esquema sin evidencia.
- El cliente D1 perezoso requiere invocar `$queryRaw` con el `PrismaClient` real como receptor. `queryD1Raw` hace esa delegación sin cambiar la ruta de acceso a modelos.

## Equivalencia funcional

Se ejecutaron, secuencialmente y sin concurrencia entre Workers, baseline y candidato contra el mismo SQLite local. Ocho rutas respondieron HTTP 200 en ambos; el JSON completo coincidió byte-lógicamente tras parseo:

`operations-counts`, `operations-page`, `attention-counts`, `attention-today`, `attention-previous`, `attention-verification-today`, `attention-unconfirmed-today`, `attention-incidents-today`.

Además, una comparación independiente de SQL en las 10.000 filas verificó todos los siete contadores operativos y los buckets de hoy/anteriores de cada tipo de Atención contra los `COUNT(*)` anteriores. Todos coincidieron. La prueba unitaria verifica parámetros temporales de Argentina y los predicados estructurales.

## Consultas D1 por solicitud

Conteo de spans del Worker local, incluyendo autorización de sesión:

| Ruta | Baseline | Candidato | Reducción |
|---|---:|---:|---:|
| Cocina: contadores | 9 (2 auth + 7 conteos) | 3 (2 auth + 1 agregado) | 66,7% |
| Atención: contadores | 8 (2 auth + 6 conteos) | 3 (2 auth + 1 agregado) | 62,5% |
| Atención: jornada actual | 9 (2 auth + 6 conteos + página) | 4 (2 auth + agregado + página) | 55,6% |

Una traza local del endpoint de Cocina mostró tres spans `d1_all`; una de Atención de jornada actual mostró cuatro. Las cifras son número de sentencias, no `rows_read` remoto.

## Wall time local

Cada celda muestra la mediana de tres rondas; cada ronda hizo 31 solicitudes por ruta, descartó la primera como calentamiento y calculó p50/p95 de 30 muestras. Wrangler/Workerd y SQLite locales, misma base, cookie de sesión sintética exclusivamente local. No es CPU de Cloudflare ni un SLA remoto.

| Ruta | Baseline p50/p95 ms | Candidato p50/p95 ms | Cambio p50 |
|---|---:|---:|---:|
| Cocina: contadores | 46,82 / 69,68 | 25,83 / 39,52 | −44,8% |
| Cocina: primera página + contadores | 53,89 / 71,88 | 31,59 / 48,41 | −41,4% |
| Atención: contadores | 42,63 / 57,29 | 29,58 / 42,75 | −30,6% |
| Atención: jornada actual + contadores | 49,71 / 62,93 | 36,98 / 46,28 | −25,6% |
| Atención: anteriores (sin agregación) | 23,37 / 34,84 | 24,51 / 32,38 | +4,9% |
| Historial (sin cambios) | 25,95 / 36,25 | 25,56 / 35,84 | −1,5% |

La pequeña variación de la ruta de pedidos anteriores no demuestra una regresión del cambio (esa ruta no invoca la agregación); queda dentro de la variación del muestreo. No se declara mejora de CPU Worker a partir de wall time.

## Costo SQL local

La comparación SQLite local de Phase A, preservada en el PR #94, midió el vector de siete conteos equivalente: a 10.000 filas, CPU del proceso SQLite p50 bajó de 17,30 ms a 8,26 ms (−52,2%), y p95 de 25,95 ms a 14,85 ms. Esta es CPU del proceso local, no CPU de Worker ni duración de D1 remoto.

## Límites de la conclusión

- La medición de endpoints no separa CPU de Worker de espera D1. No se obtuvo una muestra de perfil CPU de producción/staging para el candidato; se necesita desplegar y observar el SHA exacto para demostrar delta de CPU Worker.
- No se aplicaron cambios de índice ni migraciones remotas.
- No hubo modificaciones de autenticación, SSE, pagos ni reglas de negocio.
- La consulta agregada escanea `Order`; el benchmark en SQLite local fue favorable, pero el costo remoto en D1 debe observarse tras un despliegue de staging autorizado antes de considerarlo definitivo.
- Dos Workers Wrangler conectados simultáneamente al mismo archivo SQLite generaron errores de bloqueo; se descartaron esos recorridos. La comparación válida se hizo secuencialmente, un Worker por vez.

## Reproducción

1. Construir el baseline y el candidato con `pnpm build:vinext`.
2. Ejecutar cada Worker Wrangler por separado con el mismo `--persist-to /tmp/tl-s7d-baseline/d1`.
3. Mantener el conjunto de 10.000 fixtures sintéticos generado por el script local de Phase A; no crear datos en D1 remota.
4. Ejecutar `node scripts/perf/bench-local-admin-endpoints.mjs --count=31` tres veces por versión.
5. Comparar respuestas de los ocho endpoints enumerados y cotejar conteos agregados con los `COUNT(*)` de referencia.

La instrumentación reproducible de Phase A y su baseline están en PR #94.
