# Taco Loco — instrucciones de migración

## Repositorios

- Fuente histórica y funcional: `sjo1848/taco-loco-foodtrack`.
- Destino de migración: `sjo1848/taco-loco`.
- El repositorio fuente es **read-only** durante esta migración. No modificar ramas, commits, documentación ni configuración allí.

## Baseline

Baseline de migración fijado en `a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48` del repositorio fuente.

## Objetivo

Migrar Taco Loco hacia una arquitectura Cloudflare-native sin alterar comportamiento de negocio durante el traslado inicial.

Target vigente después de las decisiones Human Gate persistidas:
1. preservar el baseline funcional;
2. usar Cloudflare Workers + vinext como runtime;
3. usar D1 para datos estructurados/transaccionales tras la evidencia de compatibilidad;
4. usar Workers Static Assets para imágenes iniciales, con `Product.imageKey` como path público;
5. mantener R2/Images, Hyperdrive y PostgreSQL externo sólo como evidencia histórica o deferred cuando no exista requisito actual;
6. conservar las semánticas transaccionales y la adaptación de LISTEN/NOTIFY antes de cualquier staging/cutover.

## Invariantes

- No escribir en `sjo1848/taco-loco-foodtrack`.
- No agregar funcionalidades de producto durante la migración.
- No cambiar semánticas de producto para facilitar D1 o Static Assets.
- No declarar paridad ni readiness sin SHA y evidencia de CI/test.
- Usar branches y pull requests; `main` debe permanecer inspectable.
- Los cambios de arquitectura deben preservar validación server-side, sesiones, auditoría de pedidos y reglas transaccionales.

## Toolchain

- Node 22 LTS.
- pnpm 11.
- Next.js 16.3 / React 19 baseline.
- Prisma 6 / PostgreSQL baseline.
