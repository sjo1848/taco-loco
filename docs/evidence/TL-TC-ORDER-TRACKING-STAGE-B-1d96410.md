# TL-TC-ORDER-TRACKING-01 — Stage B Evidence

- Candidate: `1d96410c5b10d5275beaf61943ddde10732ea171`
- Central projection: `src/modules/orders/public-tracking.ts` derives current stage and public timeline from one `Order` plus `OrderEvent[]`.
- Public API: `GET /api/orders/tracking/[token]`; token-only lookup, generic 404, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag`.
- Public cursor: opaque SHA-256 token+sequence cursor; raw D1 sequence is never returned. Matching cursor yields 204; invalid/unsafe cursors fall back to a full projection without sending them to D1 as sequence values.
- Privacy: allow-listed output excludes internal IDs, token, client reference, actors/admins, contact/address/transfer data, raw statuses, reasons, notes and D1 sequence semantics.
- Tests cover stage precedence, event order/deduplication, no-show filtering, large safe values, unsafe adapter values, opaque cursor shape and route cursor guard.

Verdict: `TRACKING_STAGE_B_PASS`.
