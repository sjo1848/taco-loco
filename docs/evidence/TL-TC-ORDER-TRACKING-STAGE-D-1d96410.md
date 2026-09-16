# TL-TC-ORDER-TRACKING-01 — Stage D Evidence

- Candidate: `1d96410c5b10d5275beaf61943ddde10732ea171`
- Intent response includes server-created relative path and absolute runtime URL.
- Same `clientReference` reuses the same persisted order and tracking capability.
- Success dialog exposes “Ver estado de mi pedido” while retaining WhatsApp and existing actions.
- WhatsApp message includes TL reference and absolute tracking URL for PICKUP and DELIVERY; tracking is not a mandatory checkout step.
- `sessionStorage` stores the completed-order UX summary only; tracking reload authority remains D1 + OrderEvent.

Verdict: `TRACKING_STAGE_D_PASS`.
