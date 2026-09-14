# TL-TC-ORDER-FLOW-01 — Staging Verification, Delivery & Operational Flow

**Artifact type:** Bounded Task Contract  
**Method:** FALDEO Project Method v1.0 + Project Harness Minimum v1.0  
**Status:** `READY_FOR_EXECUTION / STAGING_ONLY`  
**Parent design:** `TL-HLD-001 — HUMAN_REVIEW_CLOSED / READY_FOR_TASK_CONTRACT`  
**Production:** `NOT_AUTHORIZED`

---

## 1. Objective

Implementar en staging el nuevo flujo de pedido de Taco Loco separando intención, verificación y operación, manteniendo fricción mínima para el cliente y preservando idempotencia, historial, snapshots y estados existentes.

---

## 2. Scope — IN

- `deliveryMode = RETIRO | DELIVERY`.
- `TL-xxxx` se asigna cuando el cliente envía el pedido.
- Pedidos no verificados permanecen `PENDING` y nunca entran a cocina.
- RETIRO no solicita nombre ni teléfono general y no exige pago previo.
- DELIVERY solicita dirección obligatoria, referencia opcional, tarifa fija configurable y titular de la transferencia.
- DELIVERY exige verificación manual del pago antes de entrar a operación.
- Admin operativo: `PENDIENTES | NUEVOS | PREPARANDO | LISTOS`.
- Las transiciones normales del operador requieren una sola acción.
- Al cierre de jornada, `PENDING` no resueltos se cierran como `EXPIRED`.
- `NO_SHOW` se registra por pedido, sin identidad adicional ni penalización automática.
- Delivery pagado cancelado: `refundStatus` permite `REQUIRED -> REFUNDED` con devolución manual.
- Todo cambio relevante genera evidencia/evento auditable.

---

## 3. Scope — OUT

- Producción o migración productiva.
- WhatsApp Business Cloud API, webhooks o automatización de mensajes.
- Integración bancaria o conciliación automática de transferencias.
- Carga de comprobantes.
- Login, registro, OTP, nombre general, teléfono obligatorio o scoring de identidad.
- Geocodificación, mapas, cálculo por distancia o múltiples zonas de delivery.
- Tarifa dinámica de delivery.
- Fraud scoring, bloqueos o penalizaciones automáticas por no-show.
- Automatización de devoluciones.

---

## 4. Domain contract

```text
verificationStatus = PENDING | VERIFIED | EXPIRED | REJECTED
paymentStatus      = NOT_REQUIRED | PENDING | REPORTED | CONFIRMED | REJECTED
orderStatus        = RECEIVED | CONFIRMED | IN_PREPARATION | READY | DELIVERED | CANCELLED
refundStatus       = NOT_REQUIRED | REQUIRED | REFUNDED
```

La implementación puede usar entidades separadas o una estructura equivalente, pero debe preservar esta semántica.

---

## 5. Customer flow — RETIRO

```text
Menú
-> carrito
-> RETIRO
-> enviar pedido
-> TL-xxxx
-> WhatsApp preparado
-> cliente envía
-> operador correlaciona TL-xxxx
-> CONFIRMAR PEDIDO
-> operación
```

No solicitar datos personales adicionales en el flujo normal.

---

## 6. Customer flow — DELIVERY

```text
Menú
-> carrito
-> DELIVERY
-> dirección + referencia opcional
-> tarifa fija
-> total final
-> enviar pedido
-> TL-xxxx
-> datos de transferencia
-> titular
-> WhatsApp preparado
-> operador verifica impacto
-> CONFIRMAR PAGO Y PEDIDO
-> operación
```

El cliente no carga comprobante.

---

## 7. Admin operational flow

- `PENDIENTES` queda separado de la cola de cocina.
- RETIRO muestra `TL-xxxx`, edad, detalle, modificadores, total y **CONFIRMAR PEDIDO**.
- DELIVERY agrega dirección, referencia, costo de envío, total final y titular informado; la acción primaria es **CONFIRMAR PAGO Y PEDIDO**.
- Pago no encontrado, rechazo, cancelación y devolución son acciones excepcionales.
- `NUEVOS -> PREPARANDO -> LISTOS -> ENTREGADOS` mantiene una sola acción principal por transición.

---

## 8. Data and migration constraints

- No destruir ni reinterpretar pedidos o eventos históricos.
- Campos nuevos compatibles con datos legacy mediante nullable/default semánticamente seguro o estrategia equivalente.
- Preservar `clientReference` e idempotencia.
- Preservar `OrderEvent`, secuencia, replay/SSE y snapshots.
- `deliveryFee` configurable desde administración; no hardcodear un importe comercial.
- No provisionar R2, Images, Hyperdrive, KV, VPS ni nuevos servicios.

---

## 9. Acceptance criteria

- `PENDING` nunca aparece en PREPARANDO/LISTOS.
- RETIRO puede confirmarse sin nombre, teléfono ni pago.
- DELIVERY no puede confirmarse sin `paymentStatus = CONFIRMED`.
- `TL-xxxx` es consistente entre sistema y mensaje de WhatsApp.
- Titular de transferencia visible en WhatsApp y admin.
- Tarifa de delivery incluida en total final y proveniente de settings.
- Confirmar pago + pedido de DELIVERY requiere una sola acción.
- Cierre de jornada cierra PENDING sin afectar pedidos confirmados.
- `NO_SHOW` queda auditado por pedido.
- Delivery pagado cancelado puede quedar `REFUND_REQUIRED` y luego `REFUNDED`.
- Reintentos siguen siendo idempotentes.
- Pedidos históricos y eventos existentes permanecen intactos.
- Catálogo, auth, admin y assets continúan funcionando.
- Producción permanece `NOT_AUTHORIZED`.

---

## 10. QA scenarios

1. RETIRO feliz completo.
2. DELIVERY feliz completo con transferencia verificada.
3. Abandono antes de WhatsApp.
4. WhatsApp no abre.
5. Doble click / retry con mismo `clientReference`.
6. DELIVERY sin titular de transferencia.
7. DELIVERY con pago reportado pero no encontrado.
8. Cierre de jornada con PENDING activos.
9. Mensaje recibido después del cierre de jornada.
10. Cancelación de delivery pagado y devolución manual.
11. `NO_SHOW` en RETIRO.
12. Regresión de SSE/replay, historial, catálogo, auth y assets.

---

## 11. Assurance path

- Implementación sólo en staging.
- Tests determinísticos y regresiones locales primero.
- QA staging sobre flujo público y admin.
- Independent Critic obligatorio.
- Integration Review obligatorio por impacto cross-surface.
- Persistir evidencia y actualizar `STATE / STATUS / RESUME / EVIDENCE-INDEX`.
- No abrir Production Gate.

---

## 12. Stop conditions

- Detener y escalar si el cambio exige tocar producción.
- Detener y escalar si preservar idempotencia o eventos requiere romper contratos existentes.
- Detener y documentar si separar PENDING de operación exige una migración material inesperada.
- No agregar identidad, pagos automáticos ni infraestructura externa para problemas fuera de este contrato.

---

## 13. Execution sequence

| Stage | Entrega |
|---|---|
| A | Modelo de dominio y migración staging-compatible |
| B | Checkout público RETIRO/DELIVERY |
| C | Verificación, pago manual y consola operativa admin |
| D | Cierre de jornada, no-show y refund tracking |
| E | QA, Independent Critic, Integration Review y evidencia durable |

---

## 14. Human input before final manual review

- Definir el importe operativo inicial de delivery en settings de staging.
- Validar con el dueño que la tarjeta de aprobación muestra suficiente información de un vistazo.

Estos inputs no bloquean el desarrollo del modelo ni del flujo; bloquean únicamente la validación manual final de negocio.

---

## 15. Authorization boundary

Este Task Contract autoriza trabajo técnico únicamente en **staging**. No autoriza producción, integraciones bancarias, WhatsApp API ni recolección adicional de identidad.

**Producción permanece `NOT_AUTHORIZED`.**