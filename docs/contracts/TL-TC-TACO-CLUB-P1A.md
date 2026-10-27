# TL-TC-TACO-CLUB-P1A — Google identity and customer sessions

Status: `LOCAL_TECHNICAL_PASS / STAGING_BLOCKED_HUMAN_INPUT`  
Mode: `DELIVERY`  
Phase: `IMPLEMENT / VALIDATE`  
Production: `NOT_AUTHORIZED`

## Objective

Add the minimum optional customer identity structure for Taco Club using Google Identity Services preparation, while preserving guest checkout, public tracking, WhatsApp-return recovery and administrator authentication.

## Canonical inputs

- GitHub Issue #5: Google Sign-In optional customer accounts and secure sessions.
- Existing admin auth: `AdminUser` + `Session` + `taco_loco_session`.
- Existing guest order/tracking contract and P0 candidate `de368359...`.
- Google GIS server verification guidance: verify signature/JWK, `aud`, `iss`, `exp`, verified email and use `sub` as stable identity.

## Implemented scope

- Additive PostgreSQL and D1 models: `Customer`, `CustomerIdentity`, `CustomerSession`.
- Nullable `Order.customerId` with index and `ON DELETE SET NULL`.
- Separate customer session cookie and session table; admin session remains untouched.
- Google ID-token verifier prepared for RS256/JWK validation, with issuer/audience/expiry/signature/email checks.
- Google config endpoint and `/cuenta` button prepared but disabled unless both `GOOGLE_SIGN_IN_ENABLED=true` and a valid `GOOGLE_CLIENT_ID` are present.
- Same-origin and double-submit CSRF checks on the Google login endpoint.
- D1 customer/identity creation uses one batch; PostgreSQL uses one transaction; uniqueness conflicts recover the winning identity.
- The browser refreshes its GIS CSRF bootstrap after an expired or superseded token.
- No Google access/refresh tokens, no localStorage credentials, no order history/claim, no rewards.

## Requirements → surfaces → acceptance → evidence

| Requirement | Surface | Acceptance | Evidence |
|---|---|---|---|
| Guest remains first-class | Existing menu/order/tracking code | No guest route or API requires customer auth | Existing regression + unchanged order/tracking surfaces |
| Identity keyed by Google `sub` | `CustomerIdentity(provider, providerSubject)` | Same `sub` reuses Customer; email alone never links | `google-identity.test.ts`, unique composite index |
| Sessions isolated from admin | `CustomerSession`, `taco_loco_customer_session` | Separate cookie/table; expiry/revocation paths exist | `customer-session.ts`, typecheck/tests |
| Google verification server-side | `google-identity.ts`, Google auth route | RS256/JWK, `iss`, `aud`, `exp`, verified email checked | verifier tests |
| Feature disabled by default | config route/component | No Client ID or explicit flag means disabled and no GIS script load | config tests |
| Additive persistence | PostgreSQL/D1 migrations | Fresh/local migration succeeds; existing Order rows remain nullable | Prisma validation + D1 migration/apply evidence |
| No production/provider action | wrangler/config | No OAuth binding, secret, remote migration or deployment | repository/config inspection |

## Non-goals

- No guest-order claim or history (#6).
- No favorites, addresses or repeat order (#7).
- No points, rewards or promotions (#8).
- No email/password, magic links, OAuth access scopes, WhatsApp Business API or production deployment.

## Human Input / stop condition

Staging GIS validation requires a real Google OAuth Web Client ID, authorized origin/redirect configuration, consent-screen/domain decisions and a test account. These values are not invented or committed. Stop before remote deployment until supplied/authorized.

## Handoff

After Independent Critic and Integration Review PASS, prepare a draft PR. The next authorized action is Human Input for staging OAuth configuration, followed by bounded staging validation. Production remains unauthorized.
