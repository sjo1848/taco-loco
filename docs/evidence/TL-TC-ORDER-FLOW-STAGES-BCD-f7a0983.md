# TL-TC-ORDER-FLOW-01 — Cross-runtime workflow guard evidence

- Exact substantive candidate: `f7a0983e4738c05ff854c7d928920d20f1c92cea`
- Rework from: `3bdd52a883d5b6959e448aa9901e4ac6394249a3`
- Production: `NOT_AUTHORIZED`; remote resources untouched.

PostgreSQL workflow actions now use conditional `updateMany` predicates matching D1: payment report/reject, refund transitions and pending expiry cannot overwrite a concurrently changed row; the affected-row count is checked. The D1 transition already uses the equivalent conditional payment guard.

Validation: 12 files / 37 tests PASS, changed-file ESLint PASS, generated-cache-isolated typecheck PASS, and vinext Worker build PASS. A true concurrent PostgreSQL provider proof is not claimed in this local environment; the implementation is bounded by conditional writes and remains pending independent review/staging validation.
