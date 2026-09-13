# TL-MEDIA-STATIC-ASSETS-DECISION — initial media strategy

Date: 2026-09-13  
Status: `APPROVED_HUMAN_DECISION`  
Decision ID: `MEDIA_STATIC_ASSETS_INITIAL`

## Decision

The initial Taco Loco release will use Cloudflare Workers Static Assets for product images instead of R2.

- Application/runtime: Cloudflare Workers + vinext.
- Structured and transactional data: Cloudflare D1.
- Initial product media: Workers Static Assets, versioned with the application repository/deployment.
- `Product.imageKey` stores a public static asset path/reference, for example `/products/taco-carne.webp`.
- Product images are added or replaced operationally by the project operator/developer only when an explicit business request exists.
- Customer/admin self-service image upload is deferred to a future product increment.

## Superseded initial-media decisions

`R2_FREE_TIER_ACCEPTED` remains valid historical evidence that R2 was acceptable under COST-0, but it is `SUPERSEDED_FOR_INITIAL_MEDIA_TARGET` by this decision.

For the initial release:

- R2 enablement/checkout is not required.
- No R2 bucket or `MEDIA_BUCKET` binding is required.
- Cloudflare Images binding/transformations are not required unless a future requirement independently justifies them.
- No runtime upload, replacement or deletion API is required for end users/admin users.

## Trade-off accepted

Changing a product image requires an operator-controlled repository change and a new deployment. This is accepted for the initial release because image changes are expected to be infrequent and explicitly requested.

## Assurance consequence

The previously validated D1 candidate `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4` remains valid evidence for the unaffected D1/order/auth/event surfaces, but it is not the final staging candidate because its current media path still uses R2/Images and exposes self-service upload.

A bounded local adaptation must produce a new technical candidate and rerun affected QA/build/media evidence before remote staging resumes.

Production remains `NOT_AUTHORIZED`.
