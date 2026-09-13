# Taco Loco — Staging WhatsApp number fixed

Date: 2026-09-13  
Classification: `STAGING_WHATSAPP_NUMBER_FIXED`  
Application candidate: `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`  
Execution HEAD: `050ed7278ed93fa43af3f8b6b882117d13bf0d34`

## Scope

Only the existing staging `MenuSettings.whatsappPhone` value was changed. No application source/configuration, candidate, production resource or production data was modified.

- Worker: `taco-loco-staging-20260913`
- URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`
- D1: `taco-loco-staging-20260913`
- D1 ID: `266d23b2-4056-41c0-82d9-4f063ba48d78`

## Data change

- Previous sanitized value: `5491112345678`
- New canonical value: `5492615956912`
- Admin settings read after update: HTTP `200`, exact canonical value present
- Other settings were read, preserved and submitted unchanged because the existing API validates the complete settings object.

## Validation

- Public `/menu`: HTTP `200`, all seven category sections rendered.
- Web handoff before order completion: `https://wa.me/5492615956912` with the expected encoded message.
- Representative order completion: created staging order `TL-0008`; WhatsApp handoff resolved to `phone=5492615956912` and preserved the order number/message.
- WhatsApp destination page showed the Taco Loco staging recipient and the message containing `Pedido: TL-0008`.
- Mobile handoff construction: deployed candidate uses `whatsapp://send?phone=5492615956912&text=...`; the same canonical number is produced by the deployed `buildWhatsAppAppUrl` path from the public `wa.me` base URL.
- Admin `/admin/settings`: displayed `5492615956912`.

## Boundary

Production remains `NOT_AUTHORIZED`. No production deployment, resource creation, cutover or eligibility reopening occurred.
