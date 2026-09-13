# Integration Review — remote staging candidate 6eccc3a

Verdict: `PASS`  
Date: 2026-09-13  
Contract: `TL-CF-D1-REMOTE-STAGING-01`  
Technical candidate: `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`  
Execution HEAD: `d8b3044257ee8e317aeecf8d5bc0b111d63e225f`  
Effective deploy artifact: `docs/evidence/TL-CF-D1-REMOTE-STAGING-bindings-6eccc3.json`  
Independent context: fresh Terra/Low integration reviewer (`Halley`)

## Composition result

- Candidate `6eccc3a` is an ancestor of governance HEAD `d8b3044`; post-candidate commits are documentation/evidence only.
- The effective deployed composition binds `DB` to the bounded staging D1 database, `ASSETS` to Workers Static Assets and `CF_VERSION_METADATA`; R2, Images, Hyperdrive and KV are absent.
- Remote evidence coherently covers health/D1, auth/session invalidation, order idempotency and transitions, ordered D1-backed SSE replay, logs, static `imageKey` delivery, COST-0 guardrails and the non-production boundary.
- The checked-in local D1 placeholder is acceptable by design; the effective binding artifact records the bounded staging identity without changing the frozen candidate.

No integration blocker found. Production remains `NOT_AUTHORIZED`.
