# TL-TC-ORDER-TRACKING-01 — Stage C Evidence

- Candidate: `1d96410c5b10d5275beaf61943ddde10732ea171`
- Page: `/pedido/[token]`, no login, mobile-first timeline and order summary.
- Polling: active five-second cycle, visibility pause, immediate visible refresh, AbortController/generation cancellation, single-flight protection, 5/10/20/30-second error backoff, reset on success, terminal stop for completed/cancelled/expired/refunded.
- No public SSE or additional infrastructure.
- Deterministic polling policy tests pass; implementation is bounded to one order capability.

Verdict: `TRACKING_STAGE_C_PASS`.
