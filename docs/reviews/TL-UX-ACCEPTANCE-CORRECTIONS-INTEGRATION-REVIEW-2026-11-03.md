# Integration Review — UX acceptance corrections

Candidate: `49287d9525d9966b0116c1e6fa31614c1cb61024`  
Base: `29531325f3ccff8deddebd6935c28979a50395af`  
PR: #32 (draft)

## Result

`READY_FOR_STAGING_AUTHORIZATION`

The change is confined to public navigation/checkout handoff, customer order input, admin filtering, and related CSS. It preserves guest checkout, tracking, customer/admin session boundaries, payment workflow, SSE, and the existing D1/PostgreSQL data model.

## Required staging checks

1. Open menu/account/tracking at 360, 390, 430, 768 and 1440 px with real staging data.
2. Confirm cart persistence while navigating and checkout name/address behavior for guest and authenticated customer sessions.
3. Confirm desktop popup, mobile app handoff and fallback copy/manual-open behavior without claiming message delivery.
4. Confirm admin date boundaries in `America/Argentina/Buenos_Aires`, custom ranges, combined status/queue filters and retained pending orders.
5. Repeat the existing Taco Pay, tracking and WhatsApp human checks only on the deployed candidate where affected.
