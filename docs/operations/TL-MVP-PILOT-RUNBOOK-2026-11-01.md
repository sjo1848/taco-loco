# Taco Loco — MVP pilot operating runbook

Scope: existing staging/pilot procedure. Production remains `NOT_AUTHORIZED`.

## Opening

1. Confirm the Worker URL and `/api/health` return successfully.
2. Open `/admin/orders` with the staging operator account.
3. Check `MenuSettings`: accepting orders, business hours/status, WhatsApp number, currency, delivery enabled and delivery fee.
4. Review all seven categories, published products, prices, availability, modifiers and representative image paths before opening.
5. Confirm WhatsApp is available on the operator device and the configured number is correct.
6. Record the opening time and operator.

## Order handling

### Pickup

Keep new orders in `PENDING / Pendiente de verificación` until the operator matches the TL reference in WhatsApp and confirms the order. Only confirmed orders enter preparation. Move through preparing, ready and delivered; record no-shows rather than silently deleting them.

### Delivery

Check address, reference and transfer-holder name. Verify the transfer in the bank/app outside Taco Loco before using the single `CONFIRM_PAYMENT_AND_ORDER` action. Do not put a delivery order into preparation while payment is pending. Record rejection, cancellation or refund-required state and preserve the order event history.

### WhatsApp

WhatsApp is a human handoff. Do not claim that a message was delivered or sent. Match the TL code and use the tracking link when available. If WhatsApp fails, keep the order in the admin pending board, use the tracking link manually, and record the incident.

## Monitoring during service

- Review pending verification orders at least every five minutes and before closing.
- Record order received → confirmed, payment reported → confirmed, confirmed → ready and ready → delivered times.
- Inspect the existing Worker logs/observability for 5xx responses, D1 errors and authentication failures; do not add paid observability.
- Check the Cloudflare account dashboard for Workers requests/CPU and D1 reads/writes/storage against the current plan limits. Account quotas are evidence to recheck, not assumptions.
- Treat duplicate client references, missing events, orders stuck pending, repeated D1 errors or admin/session failures as incidents.

## Exceptions and closing

- Cancel only with the operational reason recorded; do not erase evidence.
- For pickup no-show, record the no-show and preserve the order history; do not automatically punish.
- For a confirmed delivery cancelled by Taco Loco, mark refund required and complete the refund manually outside the platform, then record refunded.
- At closing, finish or explicitly close remaining pending orders according to the session decision, reconcile delivered/failed orders, record incidents and preserve the day’s operational notes.
- If the Worker or D1 is unavailable, stop accepting new orders, use the last known menu only if the operator can safely reconcile later, and record every manual order separately. Resume only after health, admin access and order persistence are rechecked.

## Manual pilot records

Keep a restricted daily record of opening/closing, order counts, pending age, payment verification time, cancellations, no-shows, refunds, WhatsApp failures and duplicate-intent incidents. Do not store cookies, OAuth tokens or public tracking tokens in the record.
