# Taco Club P1c + P2 + Taco Pay — integration evidence

Date: 2026-11-02
Base: `5d422c7fb731144971293ebce3446f7c5bb6d5ca`
Local composed branch: `integration/taco-loco-roadmap-20261101`

## Composition

The local composition includes P1c preferences/repeat capability, the benefits-disabled P2 ledger, and manual Taco Pay reporting. Schema and service conflicts between the independent PRs were resolved explicitly. P1c repeat now returns a current proposal only; no order is created until the existing checkout is submitted. The proposal contains no tracking token, delivery address, or transfer-holder data.

Taco Pay PostgreSQL and D1 paths both return `reused=false` on the first effective report and `reused=true` on a valid retry. D1 event insertion is guarded against duplicate `PAYMENT_REPORTED` events.

## Local evidence

- `pnpm typecheck`: PASS
- `pnpm test`: PASS — 32 files, 107 tests
- affected-file ESLint: PASS
- `pnpm build:vinext`: PASS
- local D1 migrations `0001` through `0007`: PASS in isolated persistence directory
- `git diff --check`: PASS
- `pnpm audit --audit-level=high`: no high/critical finding; 2 moderate vulnerabilities reported by the dependency audit and retained as a residual maintenance risk

## Boundaries

- No remote D1 migration, deployment, merge, provider integration, reward activation, or production change.
- Guest checkout, public tracking, WhatsApp return and admin workflow remain in the composed route graph.
- Physical WhatsApp validation remains `P0_HUMAN_DEVICE_VALIDATION_PENDING`.
