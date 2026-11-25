# Taco Loco · Navegación y perfil V2

[Contrato de #47](https://github.com/sjo1848/taco-loco/issues/47#issuecomment-7135771628) · [PR #108](https://github.com/sjo1848/taco-loco/pull/108)

Las capturas comparan `a8e85145e84970a7e3944b7fa2c29d3dec70cad2` con el layout de `4c5840a2dbf3aec5c3e6c23c80ceb46a89df17a7` en Chromium, con el mismo catálogo, cuentas y pedidos sintéticos de D1. El siguiente commit de aplicación `ad8b3888a1cc0bc7a1d937e4e3aa4002cbdbf48d` corrige el cierre tras recargar un carrito abierto. Conserva ese layout.

| Viewport | Comparación |
| --- | --- |
| 320 px | [Antes y después](320px.webp) |
| 360 px | [Antes y después](360px.webp) |
| 390 px | [Antes y después](390px.webp) |
| 430 px | [Antes y después](430px.webp) |
| 768 px | [Antes y después](768px.webp) |
| 1440 px | [Antes y después](1440px.webp) |

Las láminas cubren menú con y sin selección, personalización, carrito, ambos tipos de checkout, visitante, perfil, datos, direcciones, favoritos, pedidos y seguimiento. Las tres subsecciones comparan con la portada de cuenta original, donde estaban las preferencias.

| Requisito | Evidencia |
| --- | --- |
| Navegación y carrito | Tabs ordenadas con estado exclusivo, contador leído de la selección de la pestaña, CTA por encima de tabs, fondo inerte con modal y regreso a Menú. Playwright verifica el carrito entre rutas, salida del modal y espacio adicional simulado de safe-area. |
| Perfil | Portada sin formularios, tres subsecciones con sesión y retorno local validado. Workerd con dos sesiones sintéticas prueba persistencia del nombre, reconciliación tras respuesta perdida, precarga en una compra nueva y ausencia de sobreescritura de un intento previo. |
| Protección | Worker compilado ejecutado directamente contra D1 desechable. Nueve controles de origen, sesión, titularidad y validación estricta, incluida escritura Unicode autorizada. Tests de Google simulado en las ramas D1 y no D1 cubren alta, reingreso y conflicto sin reemplazar el nombre. |
| Direcciones y favoritos | Alta, edición, borrado confirmado, selección actualizada en DELIVERY y rechazo de acceso a otra cuenta. Favoritos duplicados sincronizados, una carga inicial compartida, descarte de respuesta tardía tras cambio de cuenta. |
| Catálogo y compra | Categorías sincronizadas con la búsqueda, estado vacío, ficha con CTA accesible y checkout en dos pasos. El servicio conserva la referencia, el fingerprint y el payload. La validación del nombre usa el mismo límite de 160 caracteres Unicode en perfil y checkout público. |
| Posventa | Pedidos, historial, seguimiento, vinculación explícita, recompra por borrador y retorno de WhatsApp simulado. Regresión Workerd D1 con cuatro altas, cuatro referencias distintas, cuatro eventos de creación y cero violaciones FK. |
| Visual y accesibilidad | 60 capturas baseline y 78 del candidato, de 320 a 1440 px. Axe WCAG A/AA sin hallazgos en seis superficies a 390 px. Navegación por teclado y zoom táctil al 125% emulados, pantalla de entrega reducida a 480 px de alto y movimiento reducido. |

## Solicitudes y tamaño

En Chromium a 390 px, Menú visitante mantuvo **3 solicitudes API**. Perfil autenticado pasó de **2 a 1** al mover preferencias fuera de portada. Páginas y assets pasaron de 20 a 22 en Menú y de 22 a 26 en Cuenta durante la captura. El total de JS y CSS bajo `dist/client/_next`, con gzip por archivo, pasó de **268.666 a 276.295 bytes** (+2,8%) al incorporar el shell y las rutas de perfil. Son mediciones locales de los artefactos y las capturas, con cachés de red de cada contexto reiniciadas.

## Reproducción

Compilar con `pnpm build:vinext` y ejecutar `scripts/qa-local-customer-workflows.sh`. Con `TACO_QA_PROFILE_MODE=baseline|candidate` y `TACO_QA_PROFILE_OUTPUT` se toma la matriz visual. Se puede apuntar a la base compilada con `TACO_QA_APP_ROOT`. `TACO_QA_PROFILE_ONLY=functional|visual` permite aislar una fase.

El runner usa D1 local descartable y bloquea salidas externas desde el navegador. El proxy de Wrangler local devolvió `Network connection lost` en pruebas negativas del PATCH. Los controles de seguridad se ejecutan contra el Worker compilado directamente en Workerd, sin ese proxy. El login Google real, el teclado físico y WhatsApp en dispositivo quedan para la validación autorizada.
