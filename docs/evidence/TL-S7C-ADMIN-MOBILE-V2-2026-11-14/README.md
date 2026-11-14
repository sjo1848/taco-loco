# S7c Admin Mobile V2 — capturas accesibles y redactadas

- App code desplegado: `a267a8b104770846891ea5a93da535437f08f257`.
- Worker staging: `taco-loco-staging-20260913`, version `12b5963e-4439-4877-b5c6-fef264325590`.
- Capturas fuente: corrida Playwright Chromium autenticada del 2026-11-14, `output/playwright/s7c-final-staging-a267a8b-20261114/report.json`.
- Viewports fuente: móvil 390 px; muestras adicionales 360, 768 y 1440 px.
- Redacción: se cubrieron códigos, nombres/filas de clientes, tiempos, líneas y montos de pedidos; también el teléfono y mensaje de WhatsApp de Configuración. Capturas de Catálogo muestran únicamente contenido público del menú. La cuenta agregada de Atención se conserva como estado visual del tablero.
- Son capturas reales de staging, no maquetas. La redacción altera solamente los píxeles bajo datos variables.

## Evidencia

| Pantalla | Captura |
|---|---|
| Pedidos, cola inicial, 390 px (pedido y datos redactados) | ![Tablero de pedidos móvil con tarjeta y controles de transición](orders-live-redacted-390.png) |
| Cola Por iniciar vacía, 390 px | ![Cola Por iniciar seleccionada](queue-pending-empty-390.png) |
| Cola Preparando vacía, 390 px | ![Cola Preparando seleccionada](queue-preparing-empty-390.png) |
| Cola Listos vacía, 390 px | ![Cola Listos seleccionada](queue-ready-empty-390.png) |
| Atención: encabezados de jornada actual y pendientes anteriores; campos de pedido redactados | ![Bandeja de atención móvil con secciones Nuevos de la jornada y Pendientes anteriores](attention-new-and-older-redacted-390.png) |
| Alta manual, paso 1 Productos | ![Nuevo pedido, selección de productos, búsqueda, categorías y resumen](new-order-step-1-390.png) |
| Alta manual, paso 2 Datos y confirmación | ![Nuevo pedido, formulario de datos y resumen](new-order-step-2-390.png) |
| Historial (datos de filas redactados) | ![Historial móvil y filtro](history-redacted-390.png) |
| Productos | ![Gestión de productos móvil](products-390.png) |
| Edición de producto | ![Formulario móvil de edición de producto](product-edit-390.png) |
| Categorías | ![Gestión móvil de categorías](categories-390.png) |
| Configuración (WhatsApp redactado) | ![Configuración del local móvil con datos de contacto redactados](settings-redacted-390.png) |
| Más | ![Navegación Más y cierre de sesión](more-390.png) |
| 360 px | ![Tablero en viewport de 360 px](orders-360.png) |
| 768 px | ![Formulario de producto en viewport de 768 px](product-form-768.png) |
| 1440 px | ![Formulario de producto en viewport de 1440 px](product-form-1440.png) |

## Límites de evidencia

Estas capturas documentan la sesión autenticada que produjo el informe fuente; no constituyen una nueva autenticación posterior al error 500 de staging.

No se publica captura de detalle/pago: la captura de detalle de la corrida fuente quedó en skeleton de carga y no representa una pantalla válida para inspección. Tampoco se capturó el panel de modificadores. Se requiere repetir esas capturas con login estable. El detalle y confirmación de pago no se declaran visualmente aprobados por este conjunto.

Las capturas de colas muestran estados visuales con cero pedidos al momento de la toma; la tarjeta con datos redactados es evidencia aparte del tablero con un pedido. Las pruebas funcionales de transiciones están detalladas por separado en el comentario de #62 y en el reporte JSON fuente.
