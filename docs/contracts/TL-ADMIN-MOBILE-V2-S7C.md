# TL-ADMIN-MOBILE-V2-S7C

Estado: IMPLEMENTATION / STAGING_ONLY
Issue: #62 (parent #47; related #19, #22, #23, #33)
Baseline verificado: `bbeb4a14e3e08d62004ac270c1678f04ae8a330c`

## Diseño aprobado

Este contrato implementa la decisión del propietario del 2026-11-14. La especificación completa de interacción, pantallas, textos, tokens, estados, transiciones y restricciones es el Issue #62 y la solicitud del propietario asociada; no se autoriza una reinterpretación del diseño.

## Invariantes

- Mantener Workers + vinext + D1 + Static Assets y las reglas de dominio actuales.
- Sin migraciones, cambios de esquema, nuevas tablas, recursos pagos, escritura destructiva ni cambios de producción.
- Reutilizar las APIs y servicios autorizados para mutaciones; el servidor sigue validando permisos y transiciones.
- La interfaz de confirmación financiera sólo confirma la decisión explícita del operador; nunca consulta ni simula la acreditación bancaria.
- Datos personales sólo en respuestas autenticadas de administración, con selección explícita de campos.
- Las consultas de operación deben ser paginadas/limitadas por cola y usar agregados acotados; nunca inferir totales globales desde `take: 100`.
- Una sola conexión SSE por tablero, con revalidación de sesión existente y reconciliación sin duplicados.

## Verificación

Responsive 360/390/430/768/1024/1440, Chromium/Firefox/WebKit donde estén disponibles; tests de consultas y rutas protegidas, transiciones permitidas/denegadas, pago negativo y concurrencia; typecheck, lint, tests y build. Revisión de flujos como operador, revisión independiente y evidencia visual actual del candidato.
