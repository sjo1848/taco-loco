# S7d Phase C — proyección mínima de pedidos en SSE

Fecha: 2026-11-15. Baseline `8916dab9e5257b925f634026758d803e6b39cee3`; candidato independiente Phase C sobre la misma base de código, build y base SQLite local aislada.

## Cambio y garantías

El stream usaba `findById()` para cada evento y cargaba también creador, actualizador, historial completo de eventos y actores. El payload sólo consume la orden actual y sus líneas.

Se agregó `findForLiveEvent()` con una selección explícita de los campos que usa la serialización SSE y de las cuatro propiedades de línea usadas por Cocina/Atención (`quantity`, `productName`, `modifiersSnapshot`, `note`). El detalle administrativo sigue usando `findById()` sin cambios.

No se alteraron:

- cursor `Last-Event-ID`/`after`, evento `ready`, replay ni orden de `OrderEvent.sequence`;
- autorización, revalidación/revocación de sesión, intervalo de sondeo de 2 s ni heartbeat;
- eventos emitidos por secuencia, estados de pedidos o rutas de mutación.

Las pruebas SSE existentes de replay, secuencia, desconexión y revocación se ejecutaron contra el nuevo método. Una prueba de repositorio fija explícitamente el `select` mínimo y el test de ruta confirma que el detalle completo no es invocado.

## Reproducción de replay

- D1 local bajo `/tmp/tl-s7d-baseline/d1`; 10.000 órdenes sintéticas.
- Se añadieron únicamente a esa base 40 eventos `OrderEvent` sintéticos para una orden; secuencias 10.001–10.040. No se escribió a staging ni a producción.
- Baseline y candidato se levantaron **secuencialmente**, un Worker local a la vez, sobre la misma base y con la misma cookie sintética local.
- Se abrieron cinco streams independientes por versión con `after=10000`; cada lectura esperó los 40 eventos, comprobó secuencias y canceló el stream.

## Medición

| Métrica por replay de 40 eventos | Baseline | Candidato | Cambio |
|---|---:|---:|---:|
| Spans de sentencias D1, mediana de 5 rondas | 323 | 162 | −49,8% |
| Duración acumulada de spans D1, mediana local | 1.061 ms | 326 ms | −69,3% |
| Tiempo total observado hasta recibir el replay, mediana | 960,56 ms | 738,68 ms | −23,1% |
| Primer evento recibido, mediana | 112,81 ms | 100,60 ms | −10,8% |
| Bytes de los 40 frames `order` serializados | 23.960 B | 18.400 B | −23,2% |

Los spans y wall time son mediciones de Wrangler/Workerd y D1 SQLite locales, no CPU del Worker Cloudflare ni latencia remota. La disminución de spans/D1 es una métrica directa de llamadas y trabajo SQL en este fixture; la reducción de CPU remoto aún debe verificarse con el candidato desplegado.

## Paridad de eventos

Baseline y candidato emitieron los mismos 40 IDs en el mismo orden (10.001–10.040). Los 13 campos de orden serializados coincidieron, y los campos de línea usados por la interfaz coincidieron para los 40 eventos. Se eliminaron de cada línea cinco campos no usados por el stream (`id`, `orderId`, `productId`, `unitPriceAmount`, `createdAt`). No se eliminaron datos requeridos para Cocina o Atención.

## Límite del alcance

El sondeo en reposo continúa cada 2 segundos y la comprobación de sesión cada 10 segundos. Esta fase reduce el costo cuando hay replay/eventos, pero **no cambia** las lecturas periódicas de una conexión ociosa. La línea base calcula aproximadamente 184 lecturas D1 por stream en 5 minutos; los resultados de esta fase no reducen esa cifra. Cambiar intervalo/polling afectaría frescura y requiere métricas remotas por deployment antes de decidirlo.

No se realizó despliegue, consulta de D1 remota ni cambio de facturación. Para el estado del plan Free/Paid, las limitaciones y la recomendación, ver Phase A y medir de nuevo el SHA optimizado en staging cuando exista autorización. Con la evidencia disponible no se certifica que Free sea suficiente; la recomendación Paid antes de piloto sigue siendo provisional, condicionada a la medición optimizada.
