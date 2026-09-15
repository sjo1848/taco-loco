# TL-TC-ORDER-FLOW-01 — Final cross-runtime no-show guard evidence

- Exact substantive candidate: `ce081a40e886d2fbf7afeaf1c04321001faeff0d`
- Rework from: `f7a0983e4738c05ff854c7d928920d20f1c92cea`
- Production: `NOT_AUTHORIZED`; remote resources untouched.

PostgreSQL `MARK_NO_SHOW` now requires `fulfillment=PICKUP` and `noShowAt IS NULL`, matching D1 and preventing duplicate/concurrent no-show writes. The previously added conditional payment/refund/expiry guards remain in place.

Validation: 12 files / 37 tests PASS, changed-file ESLint PASS, generated-cache-isolated typecheck PASS, and vinext Worker build PASS. A true concurrent PostgreSQL provider run is not claimed locally.
