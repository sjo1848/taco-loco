# Taco Loco — seguimiento y acciones rápidas

Fecha: 2026-11-06
Composición: `integration/tl-ux-followup-20261106`
HEAD: `50cf8bd5bdb385d038a7b380fc9bbcd8d12b2ac2`
Worker staging: `taco-loco-staging-20260913`
URL: https://taco-loco-staging-20260913.sjo1848.workers.dev
Deployment: `bf85aa87-bdd8-4231-9af5-3bd083fb1fa4`

## Seguimiento

- Primera visita por token abre un spotlight accesible sobre `Estado actual`.
- El resto de la pantalla queda atenuado sin bloquear navegación ni acciones.
- `Entendido` cierra el spotlight y guarda sólo una marca local por token.
- La recarga conserva el estado cerrado; no se usa como credencial ni se expone el token en logs.
- El polling existente activa una animación breve sólo cuando cambia `currentStage`.
- `prefers-reduced-motion` elimina la animación y mantiene una indicación estática.
- No se inventan estados y el copy no afirma que WhatsApp haya enviado el mensaje.

Capturas nuevas:

- `output/playwright/ux-followup-20261106/tracking-spotlight-390.png`
- `output/playwright/ux-followup-20261106/tracking-settled-390.png`

## Administración

- Cada fila mantiene `Ver detalle` independiente.
- Pedidos con `verificationStatus=PENDING` sólo muestran `Revisar pedido/pago`.
- Estados confirmados, en preparación y listos muestran únicamente la siguiente transición permitida.
- Las acciones llaman al PATCH administrativo existente, con autorización, validación, auditoría y SSE intactos.
- La respuesta actualiza la fila y muestra `Actualizado`; los errores no mutan el estado local.

Validación staging con datos sintéticos:

- Pedido `TL-0070`, cliente `UX Quick Actions QA`: confirmado desde detalle y avanzado desde el listado a `IN_PREPARATION` con `Iniciar preparación`.
- La fila mostró `Marcar listo` después de la transición.
- Los pedidos pendientes mostraron `Revisar pedido/pago`, sin acción que pueda saltar la verificación manual.

Capturas:

- `output/playwright/ux-followup-20261106/admin-pending-quick-action.png`
- `output/playwright/ux-followup-20261106/admin-confirmed-quick-action.png`
- `output/playwright/ux-followup-20261106/admin-quick-action-updated.png`

## QA

- `pnpm test`: 32 archivos / 110 tests PASS.
- `pnpm typecheck`: PASS.
- Tracked-source ESLint: 0 errores; sólo warning preexistente de `src/types/wasm.d.ts` ignorado.
- `pnpm build:vinext`: PASS.
- `git diff --check`: PASS.
- `/api/health`: PASS.

Limitación: el retorno físico desde WhatsApp sigue siendo una validación externa pendiente; las pruebas de navegador no se presentan como envío real confirmado.

Producción: `NOT_AUTHORIZED`.
