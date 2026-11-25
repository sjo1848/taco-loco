# TL-UX-POLISH-02

[Contrato en #47](https://github.com/sjo1848/taco-loco/issues/47#issuecomment-7152912523). PR apilado sobre TL-UX-POLISH-01. Comparativas de Guardar cambios en Chromium con Vinext, Workerd y D1 local aislada.

[390 px](comparativa-390.webp) · [1440 px](comparativa-1440.webp)

| Requisito | Comprobación |
|---|---|
| Guardar y volver al carrito | A 390 y 1440 px, guardar cambia cantidad y modificador. El carrito vuelve al paso 1 y tiene foco en el encabezado cuando cambia la línea. |
| Cancelar y volver al carrito | X, Escape, fondo y Atrás descartan el borrador. Conservan cantidad, modificador, longitud de historial y foco en Editar. El componente restaura el scroll anterior del carrito. |
| Edición inválida y ficha desde menú | Quitar el modificador obligatorio y guardar conserva la ficha y muestra el error. Agregar desde el menú mantiene el flujo previo. |
| Historial, apertura directa y recompra | Atrás desde la ficha descarta la edición y recupera la entrada existente. Adelante no reabre la ficha. Cierre único, reapertura y segundo cierre único, recarga, entrada desde Perfil con `?carrito=1` y recompra comprobados en el arnés. |
| Checkout y recuperación | Escape y Atrás durante envío desde Perfil conservan el checkout y la interacción dentro del diálogo. RETIRO, DELIVERY, navegación, WhatsApp simulado y respuesta perdida conservan la referencia. D1 registró cuatro órdenes, cuatro referencias únicas, cuatro eventos de creación, un aviso de pago y cero violaciones de claves foráneas. |
| Controles de A | El arnés de perfil, dirigido en Workerd + D1 y visual en seis tamaños, vuelve a ejecutarse sobre este candidato. El único cambio de aplicación está en `MenuExperience.tsx`. |

Para reproducir, compilar con `pnpm build:vinext` y ejecutar `TACO_QA_EDIT_CAPTURE=<directorio-existente> bash scripts/qa-local-customer-workflows.sh`. Para verificar perfil y responsive, ejecutar el mismo arnés con `TACO_QA_PROFILE_MODE=candidate TACO_QA_PROFILE_OUTPUT=<directorio>`.
