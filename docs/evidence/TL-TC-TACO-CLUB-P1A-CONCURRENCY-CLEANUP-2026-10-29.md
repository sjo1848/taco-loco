# Taco Club P1a — identity contention and challenge cleanup diagnosis

Date: 2026-10-29  
Application candidate under staging: `48744dd5850ece461f3c2841b401da6797467b0a`  
Staging deployment remains `2b0a11a7-cb99-45c1-930b-e2240a62419a`.

## Identity conflict recovery

The D1 identity writer uses a batch containing `Customer` and `CustomerIdentity` inserts. The unique `(provider, providerSubject)` constraint remains the authoritative duplicate-prevention boundary.

Current behavior:

- `UNIQUE`/`P2002`/`D1_CUSTOMER_IDENTITY_CONFLICT` is classified as an identity race and followed by a lookup of the winning identity.
- `SQLITE_BUSY`/database-lock errors are not classified as a successful identity race and are propagated. This avoids claiming recovery when the winning transaction may not yet be observable.
- Local deterministic concurrency tests prove one winner and one unique identity in the harness.
- An isolated local D1 parallel write observed one `UNIQUE` failure and one `SQLITE_BUSY`; this is provider/SQLite behavior evidence, not an application recovery PASS.
- No real-provider parallel identity write was executed against staging, and no such PASS is claimed.

## GoogleAuthChallenge cleanup

The challenge contains only a hash, timestamps and a nullable consumption timestamp. The current implementation atomically consumes through a conditional update, but does not automatically delete consumed or expired rows.

Recommended bounded policy for a subsequent implementation review:

1. Keep a ten-minute expiry and never persist the plaintext nonce.
2. On challenge issuance, perform a bounded cleanup of at most 100 rows matching `consumedAt IS NOT NULL OR expiresAt <= now`, using an indexed query and deletion by selected IDs.
3. Treat cleanup failure as non-fatal to login, while recording only a sanitized operational metric/log without token values.
4. Add a low-volume maintenance path for staging/manual cleanup; do not introduce a new paid service or infrastructure.
5. Validate the bounded deletion path on both PostgreSQL and D1 before changing the deployed candidate.

This policy is proposed, not implemented or deployed in this checkpoint. Until implemented and tested, challenge retention remains an integration/release-review item rather than a Human Gate or a PASS.

## Local assurance

- `pnpm test -- --runInBand`: 27 files / 75 tests PASS.
- `pnpm typecheck`: PASS.
- No production resource, staging migration or Worker deployment was changed by this diagnosis.

## Human boundary

The controlled browser was restored and the first real Google login was observed without persisting identity values:

- `/cuenta` rendered the authenticated welcome state.
- Browser session endpoint returned HTTP 200.
- Reload preserved the authenticated state and the same anonymized customer identity fingerprint.
- Logout returned HTTP 401 and the UI returned to the visitor state.
- A second login opened the Google account chooser again; its selection/return has not yet completed, so re-login is not claimed PASS.
- The delayed second attempt produced HTTP 403 from `/api/customer/auth/google` with the UI message that the access session had expired. A fresh challenge was issued and the chooser was reopened; this is an expected bounded-challenge expiry path, not a duplicate-customer result.

Sanitized D1 aggregate after this bounded check: 2 customers, 2 identities, 4 active sessions, 4 challenge rows, 1 live challenge. No emails, provider subjects, cookies or tokens were persisted.

The controlled browser is currently stopped at the Google account chooser. The next human interaction is selecting the authorized account and completing the Google return flow. Credentials, cookies and tokens must not be sent in chat or persisted in evidence.
