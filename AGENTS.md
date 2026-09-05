# Taco Loco — instrucciones de migración

## Repositorios

- Fuente histórica y funcional: `sjo1848/taco-loco-foodtrack`.
- Destino de migración: `sjo1848/taco-loco`.
- El repositorio fuente es **read-only** durante esta migración. No modificar ramas, commits, documentación ni configuración allí.

## Baseline

Baseline de migración fijado en `a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48` del repositorio fuente.

## Objetivo

Migrar Taco Loco hacia una arquitectura Cloudflare-native sin alterar comportamiento de negocio durante el traslado inicial.

Orden de trabajo:
1. reproducir baseline funcional;
2. mantener PostgreSQL + Prisma como fuente transaccional inicial;
3. mover runtime a Cloudflare Workers sólo con evidencia de compatibilidad;
4. usar R2 para media;
5. aislar/reemplazar PostgreSQL LISTEN/NOTIFY + SSE antes del cutover completo;
6. evaluar D1 únicamente después de alcanzar paridad funcional.

## Invariantes

- No escribir en `sjo1848/taco-loco-foodtrack`.
- No agregar funcionalidades de producto durante la migración.
- No migrar PostgreSQL a D1 en el mismo cambio que el runtime.
- No declarar paridad ni readiness sin SHA y evidencia de CI/test.
- Usar branches y pull requests; `main` debe permanecer inspectable.
- Los cambios de arquitectura deben preservar validación server-side, sesiones, auditoría de pedidos y reglas transaccionales.

## Toolchain

- Node 22 LTS.
- pnpm 11.
- Next.js 16.3 / React 19 baseline.
- Prisma 6 / PostgreSQL baseline.
