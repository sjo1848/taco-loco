# TL-UX-POLISH-01

[Contrato en #47](https://github.com/sjo1848/taco-loco/issues/47#issuecomment-7152912523). Base `05f977cb580b5db43b59085ea51cb22f642c03fd`. Comparaciones en Chromium sobre Vinext, Workerd y D1 locales, con las mismas fixtures sintéticas y sin conexiones a proveedores externos.

[320 px](comparativa-320.webp) · [360 px](comparativa-360.webp) · [390 px](comparativa-390.webp) · [430 px](comparativa-430.webp) · [768 px](comparativa-768.webp) · [1440 px](comparativa-1440.webp)

| Requisito | Comprobación |
|---|---|
| A1 | Menú, Pedidos, Carrito y Perfil en ambos breakpoints. Una selección activa, 4 controles en móvil y apertura del carrito desde la navegación. Acciones y fondo inerte verificados en navegador. |
| A2 | Copia de visitante y perfil, enlace Editar perfil, filas Direcciones y Favoritos, revocación al cerrar sesión. El destino `#customer-orders` en Pedidos permanece. La fila antigua del perfil carecía de consumidores en el código. |
| A3 | Tres títulos, regreso Perfil y acceso único al menú en favoritos. Persistencia y recuperación de nombre, CRUD de direcciones, navegación con cambios pendientes, favoritos sincronizados, dos identidades y respuestas obsoletas. |
| A4 | Hero y orden del catálogo conservados. Destacados, una indicación Agotado con el botón deshabilitado y una línea Personalizable. Búsqueda y categorías verificadas. |
| A5 | Cantidad y modificadores conservados. En el navegador se comprobó precio unitario a dos unidades y total en el CTA. |
| A6 | Los dos pasos conservan controles y cierre. Se comprobó el subtotal de 1200 y total DELIVERY de 1500, con envío de 300, además de descarte y recuperación de intentos. |
| A7 | Confirmación de una orden sintética por viewport, texto y orden de acciones verificados con variantes móvil y escritorio. Volver al menú no generó otro POST. WhatsApp se interceptó localmente. |
| A8 | Primeras dos líneas, cantidad restante, importe y un único Ver menú cuando ambas secciones están vacías. Historial, paginación, seguimiento privado y recompra como borrador verificados. |
| A9 | Primera visita sin spotlight. Se conservó la actualización por polling y el cambio de estado persistido en D1 local sin recarga, además del retorno de WhatsApp simulado. |
| A10 | 84 pares de capturas en seis tamaños, sin desborde horizontal. Seis vistas de 390 px sin hallazgos axe WCAG A/AA. Controles táctiles de navegación móvil, fondo inerte, safe area emulada, foco y teclado. Misma cantidad de solicitudes API de menú y portada de perfil en la comparación, cero mutaciones HTTP al navegar. Se conservó la regresión de #109. |

El arnés general verificó RETIRO, DELIVERY, recuperación tras respuesta perdida, claim voluntario, separación de cuentas, revocación, referencias únicas, cuatro eventos de creación para cuatro órdenes, un evento de pago y cero violaciones de claves foráneas. El arnés de perfil pasó cinco recorridos de navegador y nueve controles directos de Workerd con D1. Lint, typecheck, 198 tests, build Vinext, audit al umbral high y Wrangler dry-run local pasaron. Audit reportó ocho avisos moderados, con dependencias intactas.

Para repetir, compilar cada árbol con `pnpm build:vinext` y ejecutar `bash scripts/qa-local-customer-workflows.sh` desde el candidato. Para el perfil visual, usar `TACO_QA_PROFILE_MODE=candidate TACO_QA_PROFILE_OUTPUT=<directorio>`. Para las capturas de la base, ejecutar el mismo arnés del candidato con `TACO_QA_APP_ROOT=<worktree-de-la-base-compilada> TACO_QA_POLISH_BASELINE=1 TACO_QA_PROFILE_ONLY=visual` y las mismas variables de perfil. Los tests crean bases locales descartables.

Google real, WhatsApp físico, aislamiento y transición persistida en staging permanecen pendientes de la validación externa previa.
