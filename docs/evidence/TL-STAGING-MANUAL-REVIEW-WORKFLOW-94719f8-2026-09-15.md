# Taco Loco — Corrective workflow review evidence

Date: 2026-09-15  
Classification: `STAGING_MANUAL_REVIEW_PASS`

## Finding

Human review identified that `/admin` opened product CRUD instead of the operational order board. This prevented the owner from seeing newly submitted pending orders on the primary admin surface.

## Correction candidates

- `94719f858e999032867a0a71abd2a5e05fa7cd37`: `/admin` redirects authenticated operators to `/admin/orders`.
- `2ef64739727c7ed136d8762e8898f578f12ddc67`: preserves product CRUD as `/admin/products` and updates secondary navigation/cancel links.
- `ea99ca83d7e6831833a97a11e21d5585c0903273`: keeps successful product save on `/admin/products`; this is the exact final candidate validated below.

The final candidate is validated below.

## Local assurance

- Vitest: 38/38 passed.
- Changed-surface ESLint: passed.
- TypeScript typecheck: passed.
- vinext/Worker build: passed.
- No production files, resources or configuration were changed.

## Remote identity

- Worker: `taco-loco-staging-20260913`
- URL: `https://taco-loco-staging-20260913.sjo1848.workers.dev`
- Version: `d6c7627d-9752-4d29-8ab7-0fbdf8091847`
- D1: existing `taco-loco-staging-20260913`
- Candidate: `ea99ca83d7e6831833a97a11e21d5585c0903273`

## Two-client realtime validation

Owner client authenticated and connected to `/api/admin/orders/events?after=41` before customer submissions. Customer client then submitted:

- PICKUP `TL-0021`, event cursor `42`, `RECEIVED`, `verificationStatus=PENDING`, `paymentStatus=NOT_REQUIRED`, total ARS 10,000.
- DELIVERY `TL-0022`, event cursor `43`, `RECEIVED`, `verificationStatus=PENDING`, `paymentStatus=PENDING`, total ARS 10,000.

The final candidate repeated the same scenario from cursor 43: PICKUP `TL-0023` arrived at cursor 44 and DELIVERY `TL-0024` at cursor 45, both without refreshing the owner client.

The SSE stream emitted both events without refreshing the owner client. The board payloads contained the TL reference, fulfillment, total, pending verification marker and non-operational `RECEIVED` state.

## Admin entry and persistence

- Authenticated `GET /admin` returned HTTP 307 with `Location: /admin/orders`.
- `/admin/orders` returned HTTP 200.
- After reload, the server-rendered board contained `TL-0023`, `TL-0024` and `Pendiente de verificación`.
- DELIVERY detail from D1 showed address, reference, `deliveryFeeAmount=3000`, transfer holder, `paymentStatus=PENDING`, `verificationStatus=PENDING`, and total ARS 10,000.
- `/admin/products`, `/admin/products/new`, `/admin/categories` and `/admin/settings` remained HTTP 200.

## Boundary

PENDING orders remained outside kitchen work. Existing payment guard, order events, idempotency, sessions and transitions were not changed. Production remains `NOT_AUTHORIZED`.

## Assurance status

Independent Critic and Integration Review both returned `PASS` against exact candidate `ea99ca8`; review artifacts are `docs/reviews/TL-STAGING-MANUAL-REVIEW-independent-critic-ea99ca8.md` and `docs/reviews/TL-STAGING-MANUAL-REVIEW-integration-review-ea99ca8.md`.
