# Taco Loco — Flujos de trabajo de alto nivel

Estado: `PRODUCT_FLOW_BASELINE / HUMAN_REVIEW`

Producción: `NOT_AUTHORIZED`

## 1. Propósito

Este documento define el flujo operativo de Taco Loco desde que una persona entra al menú hasta que el pedido se entrega o cancela. También identifica mejoras posibles y separa dos problemas distintos:

- proteger el sistema contra spam, duplicados y automatización abusiva;
- evitar que un pedido falso o hecho "en joda" llegue a cocina como si fuera un pedido real.

No autoriza implementación ni producción. Sirve como baseline de producto para discutir y priorizar cambios en staging.

## 2. Baseline actualmente probado

El staging actual ya demuestra:

- menú público con categorías, productos, precios, imágenes y modificadores;
- persistencia del pedido antes del handoff a WhatsApp;
- numeración `TL-xxxx`;
- idempotencia mediante `clientReference`;
- estados operativos persistidos;
- historial de eventos y replay;
- autenticación y panel administrativo;
- handoff a WhatsApp con número de pedido;
- flujo de estados actual:

```text
RECEIVED
  -> CONFIRMED
      -> IN_PREPARATION
          -> READY
              -> DELIVERED
```

Con cancelación permitida desde los estados operativos previos a cierre.

El punto débil principal es que el backend puede persistir el pedido antes de saber si el usuario efectivamente envió el mensaje de WhatsApp. Por lo tanto, hoy un usuario puede generar un pedido aparentemente real y abandonar el flujo antes de contactar al negocio.

## 3. Principio de diseño recomendado

La intención de compra y el pedido operativo no deben tratarse como la misma cosa.

Un click en "Confirmar pedido" significa:

> El cliente manifestó una intención y el sistema generó una referencia.

No debería significar automáticamente:

> Cocina tiene un pedido real para preparar.

Por eso conviene introducir una etapa explícita de verificación previa a la cola operativa.

## 4. Flujo objetivo de cliente

### 4.1 Descubrimiento

```text
QR / link
  -> menú
  -> categorías
  -> productos
  -> detalle / modificadores
```

Objetivo: mínima fricción. No pedir datos personales antes de que el cliente haya decidido comprar.

### 4.2 Selección

```text
producto
  -> cantidad
  -> modificadores requeridos
  -> carrito
  -> subtotal / total estimado
```

El sistema debe impedir continuar cuando falta una selección obligatoria.

### 4.3 Confirmación inicial

El cliente revisa el pedido y pulsa una acción equivalente a "Continuar pedido".

En ese momento el sistema debe:

- congelar productos, precios, cantidades y modificadores;
- generar una referencia única;
- impedir duplicados por reintentos;
- registrar una intención pendiente de verificación;
- abrir WhatsApp con el detalle y la referencia.

## 5. Verificación de intención

### 5.1 Recomendación MVP

Introducir un concepto previo a la operación, por ejemplo:

```text
PENDING_CONTACT / PENDING_VERIFICATION
```

Ese estado o dimensión de verificación no debe aparecer en la misma cola que los pedidos que cocina tiene que preparar.

Flujo:

```text
Cliente confirma carrito
  -> intención persistida
  -> WhatsApp se abre con TL-xxxx
  -> cliente envía mensaje
  -> Taco Loco recibe TL-xxxx
  -> operador verifica contacto
  -> pedido entra a la cola operativa
```

Si nunca llega el mensaje de WhatsApp, la intención permanece fuera de cocina y expira.

### 5.2 Separar verificación y operación

Hay dos alternativas de diseño.

#### Alternativa A — Nuevo estado previo

```text
PENDING_VERIFICATION
  -> RECEIVED
  -> CONFIRMED
  -> IN_PREPARATION
  -> READY
  -> DELIVERED
```

Ventaja: simple de entender.

Desventaja: mezcla verificación comercial con estado operativo.

#### Alternativa B — Dimensión de verificación separada

```text
verificationStatus:
PENDING | VERIFIED | EXPIRED | REJECTED

orderStatus:
RECEIVED | CONFIRMED | IN_PREPARATION | READY | DELIVERED | CANCELLED
```

Recomendación: **Alternativa B**.

Permite mantener limpio el lifecycle operativo actual y distinguir claramente:

- intención abandonada;
- intento sospechoso;
- pedido verificado;
- pedido operativo.

## 6. Flujo operativo del foodtruck

Una vez verificado, el pedido entra al circuito real.

```text
VERIFIED
  -> RECEIVED / NUEVO
  -> CONFIRMED / CONFIRMADO
  -> IN_PREPARATION / PREPARANDO
  -> READY / LISTO
  -> DELIVERED / ENTREGADO
```

La interfaz debería priorizar operación y no CRUD.

Vista recomendada:

```text
PENDIENTES DE VERIFICAR

NUEVOS        PREPARANDO       LISTOS
TL-0012       TL-0010          TL-0008
3 min         8 min            14 min
$20.000       $17.000          $13.000
```

Productos, categorías y settings siguen siendo funciones administrativas secundarias.

## 7. Flujo de cancelación

El pedido nunca debe borrarse para ocultar un problema.

```text
pedido activo
  -> CANCELLED
  -> motivo obligatorio
  -> evento persistido
```

Motivos sugeridos:

- cliente canceló;
- producto sin stock;
- no se pudo verificar al cliente;
- pago no confirmado;
- pedido sospechoso / falso;
- problema operativo.

Esto permite medir dónde se pierden pedidos y distinguir fraude de problemas reales del negocio.

## 8. Riesgos de pedidos falsos

Se deben tratar escenarios diferentes.

### 8.1 Abandono normal

El cliente arma el pedido, toca continuar y luego no envía WhatsApp.

No necesariamente es fraude. Debe terminar como intención expirada, no como cancelación operativa.

### 8.2 Pedido "en joda"

Una persona genera uno o varios pedidos deliberadamente sin intención de compra.

### 8.3 Spam automatizado

Un bot intenta generar muchas intenciones.

### 8.4 Duplicado accidental

El cliente pulsa varias veces o reintenta por mala conexión.

### 8.5 Cliente real que no retira

El pedido fue confirmado, preparado y luego abandonado. Este riesgo es más costoso que una simple intención falsa porque ya consumió materia prima y tiempo.

## 9. Defensa por capas

No conviene resolver todo con una sola barrera porque cada control agrega fricción.

### Capa 1 — Idempotencia

Objetivo: evitar duplicados técnicos.

Estado actual: ya existe y debe mantenerse.

No evita pedidos falsos, pero impide multiplicarlos por reintentos involuntarios.

### Capa 2 — Rate limiting

Objetivo: frenar abuso volumétrico.

Estado actual: existe protección básica.

Limitación: el mecanismo actual es una protección blanda y no debe considerarse una prueba de identidad ni de intención real.

Mejora futura:

- límite por IP / fingerprint razonable;
- ventana temporal;
- escalamiento ante patrones anómalos;
- no bloquear clientes legítimos por una única señal.

### Capa 3 — Verificación por WhatsApp

Objetivo: que un pedido sólo llegue a operación si existe una acción humana adicional.

MVP recomendado:

- sistema genera la referencia;
- abre WhatsApp;
- el cliente envía el mensaje;
- el operador ve la referencia recibida;
- operador marca la intención como verificada.

Ventaja: usa el canal que Taco Loco ya necesita, sin introducir un login obligatorio para clientes.

### Capa 4 — Expiración automática

Las intenciones no verificadas deben vencer después de un tiempo configurable.

Ejemplo conceptual:

```text
PENDING
  -> VERIFIED
  -> EXPIRED
  -> REJECTED
```

Una expiración de aproximadamente 10–15 minutos es un punto inicial razonable para probar, no una regla definitiva.

### Capa 5 — Captura de teléfono

Opción futura: pedir nombre y teléfono antes de abrir WhatsApp.

Ventajas:

- facilita matching entre intención y conversación;
- permite contactar ante dudas;
- mejora trazabilidad.

Desventajas:

- aumenta fricción;
- el teléfono escrito no prueba por sí solo que el usuario sea dueño del número.

Recomendación: no volverlo obligatorio en el primer ajuste salvo que la operación demuestre que el matching por referencia no alcanza.

### Capa 6 — Challenge anti-bot

Si aparece abuso automatizado real, agregar una barrera invisible o progresiva para requests sospechosos.

Debe activarse por riesgo, no necesariamente mostrarse a cada cliente desde el inicio.

### Capa 7 — Pago o anticipo

Es la defensa más fuerte contra pedidos falsos de alto costo.

Opciones:

- sin pago previo para pedidos normales;
- anticipo para pedidos que superen determinado monto;
- pago completo previo;
- pago previo obligatorio sólo para clientes o patrones de riesgo.

El pago no debería introducirse sólo por miedo al fraude si reduce demasiado la conversión. Conviene medir primero cuántos pedidos problemáticos existen realmente.

## 10. Propuesta de política anti-pedidos-falsos

### Nivel normal

```text
Carrito
  -> intención
  -> WhatsApp
  -> verificación manual
  -> operación
```

Sin pago anticipado.

### Nivel de riesgo medio

Señales posibles:

- repetición rápida de intenciones;
- varios abandonos desde la misma fuente;
- monto alto;
- historial previo de no retiro.

Respuesta:

- pedir confirmación adicional;
- confirmar teléfono;
- no pasar a preparación inmediatamente.

### Nivel de riesgo alto

Ejemplos:

- pedido de importe excepcional;
- reincidencia de no retiro;
- actividad automatizada evidente.

Respuesta posible:

- anticipo o pago previo;
- rechazo manual;
- bloqueo temporal de abuso.

## 11. Pago dentro del flujo futuro

Una evolución posible:

```text
PENDING_VERIFICATION
  -> VERIFIED
  -> PAYMENT_PENDING
  -> PAID / PAYMENT_CONFIRMED
  -> CONFIRMED
  -> IN_PREPARATION
```

No todos los pedidos necesitan obligatoriamente esta etapa.

Para la primera versión comercial se puede mantener transferencia/alias con confirmación manual y medir la necesidad de automatizar.

## 12. Mensajería de WhatsApp

WhatsApp debe seguir siendo un canal de comunicación, no la base de datos principal.

El mensaje inicial debería incluir:

- nombre Taco Loco;
- referencia `TL-xxxx`;
- productos y cantidades;
- modificadores;
- total estimado;
- instrucción clara para enviar el mensaje y validar el pedido.

Ejemplo conceptual:

```text
Hola Taco Loco, quiero confirmar el pedido TL-0012.

2 x Taco x2 común
  Salsa: Guacamole
1 x Gaseosa 1,5 L

Total: $25.000

Envío este mensaje para confirmar mi pedido.
```

La frase final hace explícita la acción de validación.

## 13. Flujo de preparación y retiro

### Confirmación

El operador revisa disponibilidad y acepta.

### Preparación

El pedido pasa a cocina.

### Listo

El operador puede generar un mensaje:

```text
Tu pedido TL-0012 está listo para retirar.
```

Inicialmente puede ser "copiar mensaje / abrir WhatsApp" sin automatización completa.

### Entrega

El operador marca `DELIVERED`.

Este evento cierra el ciclo y sirve para métricas.

## 14. Casos excepcionales que deben estar definidos

### Negocio cerrado

No permitir crear una intención operativa si el negocio no acepta pedidos. Puede ofrecerse WhatsApp sólo como consulta.

### Producto quedó sin stock durante el checkout

Revalidar disponibilidad antes de persistir el pedido.

### WhatsApp no abre

Mantener la intención pendiente y ofrecer fallback claro.

### Cliente manda WhatsApp pero el pedido expiró

Permitir al operador reactivar/verificar manualmente si todavía tiene sentido.

### Pedido confirmado pero cliente cambia algo

Registrar el cambio; no sobrescribir silenciosamente el pedido original sin trazabilidad.

### Cliente no retira

Cerrar con motivo específico y conservar historial para futura política de riesgo.

## 15. Métricas mínimas recomendadas

Para decidir futuras mejoras se debería medir:

- intenciones creadas;
- intenciones verificadas;
- intenciones expiradas;
- intenciones rechazadas por sospecha;
- tasa intención -> verificación;
- pedidos confirmados;
- pedidos cancelados;
- no-retirados;
- tiempo intención -> verificación;
- tiempo confirmación -> preparación;
- tiempo preparación -> listo;
- tiempo listo -> entregado;
- monto promedio;
- porcentaje de pedidos que requieren intervención manual.

Sin estas métricas sería fácil agregar fricción contra un problema que quizás ocurra poco.

## 16. Roadmap de mejora de flujo

### Etapa A — Verificación previa

Prioridad alta.

- separar intención de pedido operativo;
- cola "Pendientes de verificar";
- confirmar manualmente cuando llega WhatsApp;
- expiración automática;
- registrar motivo de rechazo.

### Etapa B — Consola operativa

Prioridad alta.

- columnas Nuevos / Preparando / Listos;
- edad del pedido;
- acciones de estado de un toque;
- alertas por pedidos demorados;
- separar gestión de catálogo de operación diaria.

### Etapa C — Riesgo y antifraude progresivo

Prioridad media.

- patrones de abuso;
- mejora de rate limiting;
- challenge anti-bot sólo cuando corresponda;
- historial de no-retiro;
- reglas para pedidos grandes.

### Etapa D — Pago

Prioridad condicionada a necesidad real.

- alias / transferencia;
- confirmación manual;
- anticipo por monto o riesgo;
- luego evaluar automatización.

### Etapa E — WhatsApp automatizado

Prioridad futura.

Con WhatsApp Business API/webhooks se podría:

- detectar automáticamente la llegada de la confirmación;
- asociar número de teléfono real con la intención;
- actualizar la verificación sin intervención manual;
- enviar estados automáticamente.

Esto no es necesario para validar el MVP operativo.

## 17. Decisiones de producto todavía abiertas

Antes de implementar el nuevo flujo conviene resolver explícitamente:

1. ¿La referencia `TL-xxxx` se asigna al crear la intención o sólo después de verificarla?
2. ¿Las intenciones pendientes aparecen en una bandeja separada del panel principal?
3. ¿Cuánto tiempo debe vivir una intención sin verificar?
4. ¿Se pide nombre antes de WhatsApp?
5. ¿Se pide teléfono antes de WhatsApp o se evita esa fricción?
6. ¿A partir de qué monto tendría sentido pedir anticipo?
7. ¿Cómo se clasifica un pedido no retirado?
8. ¿Qué señales justifican challenge/bloqueo y cuáles sólo generan una alerta?

## 18. Recomendación inicial

Para Taco Loco la siguiente mejora de mayor valor no es agregar más infraestructura ni automatizar pagos inmediatamente.

La recomendación es:

```text
MENU
  -> CARRITO
  -> INTENCION PENDIENTE
  -> WHATSAPP CON TL-xxxx
  -> VERIFICACION HUMANA
  -> NUEVO
  -> CONFIRMADO
  -> PREPARANDO
  -> LISTO
  -> ENTREGADO
```

Con:

- idempotencia para duplicados;
- rate limiting para abuso básico;
- expiración para abandonos;
- verificación por mensaje de WhatsApp antes de entrar a cocina;
- pago/anticipo sólo cuando monto o riesgo lo justifiquen;
- métricas para decidir cuándo hace falta endurecer el sistema.

Este enfoque reduce pedidos falsos sin convertir el checkout en un proceso pesado para el cliente legítimo.
