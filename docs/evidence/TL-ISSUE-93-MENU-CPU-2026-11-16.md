# Issue #93 — CPU del menú público

## Alcance y evidencia remota previa

- Worker staging: `taco-loco-staging-20260913`; versión `cdb0e7d0-188f-4981-88ba-27debd414a04`, candidato Git `e19013b820b667ed52b054a7b9b20d15cdd5089e`.
- Workers Analytics registró 28 invocaciones `exceededResources` entre 03:56 y 03:57 UTC. En una tanda de 60 solicitudes secuenciales a `/menu` se observó un HTTP 503. El muestreo Tail de `/menu` en ese deployment dio CPU p50 13 ms, p95 25 ms, rango 10–28 ms (26 muestras); 16/26 superaron 10 ms. `/api/menu/status` dio p50 2 ms, p95 4 ms (19 muestras anteriores). Analytics no expuso la URL de cada una de las 28 invocaciones, por lo que su ruta individual sigue sin confirmarse. Un 503 y los recursos excedidos coinciden temporalmente, pero no hay `cf-ray` común que demuestre que sean el mismo evento.
- La respuesta `/menu` es dinámica, con `Cache-Control: no-store` y `cf-cache-status: BYPASS`. No se registró error persistente después de esa ventana; una muestra posterior de 24 solicitudes devolvió 200.

## Perfil local aislado

Se construyeron dos árboles con el mismo toolchain: el SHA original y este parche. Se ejecutaron en Workerd local, cada uno con una copia independiente de la misma D1/SQLite sintética: 32 productos publicados, una categoría, sin datos de clientes. Los dos devolvieron HTTP 200, 31 productos sintéticos visibles y exactamente 41.749 bytes de HTML. No se tocó D1 remota.

| Medida, mismo catálogo y equipo | Original `e19013b` | Formateador reutilizado |
| --- | ---: | ---: |
| 30 GET `/menu`, warmup de 10, wall p50 | 43,81 ms | 29,97 ms |
| 30 GET `/menu`, wall p95 | 80,20 ms | 44,02 ms |
| Perfil Workerd/DevTools, 10 GET, CPU muestreada activa total | 524 ms | 245 ms |

El perfil añade sobrecarga: los 524 y 245 ms son **comparables entre builds**, pero no representan CPU remota ni una predicción exacta de CPU por solicitud. La reducción de CPU muestreada activa fue 53,2%; la de latencia local p50, 31,6%. El constructor `Intl.NumberFormat` repetido por tarjeta era el costo controlable dominante: en Node local, 3.200 construcciones con formato tardaron 1.220 ms frente a 22 ms con una instancia reutilizada. El Worker original renderizaba una instancia nueva por tarjeta y por precio del menú.

El acceso público en Workers ya utiliza dos consultas D1 crudas y no carga Prisma/WASM en la ruta de lectura del catálogo. En SQLite aislado, la consulta JOIN sobre 32 productos devolvió 32 filas, con CPU p50 de 0,072 ms y p95 de 0,153 ms en 1.000 ejecuciones; el plan usa los índices de `Category`, `Product`, `ProductModifierGroup` y `ModifierOption`, con ordenamiento temporal para algunos términos. Esta medida SQLite no equivale a la latencia de D1 remota. El perfil Workerd concentra el tiempo activo en SSR y el componente del menú, además del overhead del runtime; no prueba que Prisma/WASM sea el origen de los 503.

## Staging del parche

Se desplegó exclusivamente el commit de aplicación `d56cfd39f4a833b269c9a2c64a21ede5a8e4a6e2` como versión `59a8fcbf-2019-42a3-baff-35498533a2f2`, conservando `cdb0e7d0-188f-4981-88ba-27debd414a04` para rollback. El dry-run verificó el binding D1 exacto, Static Assets y las variables existentes; no se ejecutaron migraciones.

Dos tandas de 60 GET públicos a `/menu` devolvieron 120/120 HTTP 200; 20 GET a `/api/menu/status` devolvieron 20/20 HTTP 200. Workers Analytics registró 144 invocaciones de la versión nueva y 144 `success` en la ventana medida. Tail capturó 35 GET `/menu` del mismo deployment: 35 `ok`, CPU p50 16 ms, p95 26 ms, máximo 78 ms; 35/35 superaron 10 ms. En `/api/menu/status`, 15 eventos `ok` tuvieron CPU p50 2 ms y p95 3 ms. Las ventanas remotas anterior y posterior no tienen condiciones idénticas de carga, por lo que no demuestran una mejora causal de CPU. Sí demuestran que la muestra posterior no repitió los errores HTTP 503 ni el outcome `exceededResources`.

Una variante adicional que separaba shell y catálogo en dos solicitudes se probó localmente y se **descartó**: reducía CPU por invocación, pero incrementaba la latencia combinada y retiraba las tarjetas del HTML inicial. No se publicó ni se desplegó esa variante.

El check GitHub `quality` del commit de aplicación pasó. Cloudflare Builds marcó fallo para el PR sin publicar una nueva versión; el build vinext y el dry-run locales sí pasaron. El endpoint de suscripciones de la cuenta devuelve 403, por lo que el plan efectivo sigue `UNKNOWN`. El endpoint de Workers Observability para recuperar la ruta de cada error histórico también devuelve 403; la atribución individual de las 28 invocaciones sigue `UNKNOWN`.

## Control y decisión

El parche conserva el HTML, la moneda, el catálogo y la validación de checkout. Pasaron 43 archivos/160 pruebas, typecheck, lint sin errores y build vinext. La muestra remota de 120 GET sin fallo es una mejora de estabilidad observada en esa ventana, **no una garantía de estabilidad en Workers Free**: la CPU de `/menu` continúa sobre 10 ms de manera habitual. Si vuelven `exceededResources` o 503 de forma recurrente, conservar el bloqueo del piloto y evaluar rollback. Workers Paid ofrece un presupuesto CPU mayor, pero no se autorizó facturación y no se ha confirmado el plan actual.
