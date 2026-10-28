# Taco Club P1a — atomic challenge and current-head gate

Current PR HEAD before this work: `c6bada89774848cf14aaad777b4bf8abeae9864c`.  
New exact candidate: `48744dd5850ece461f3c2841b401da6797467b0a`.  
CI run: `40713513428` (`success`, exact candidate).  
Staging deployment: completed after explicit authorization. Worker version `2b0a11a7-cb99-45c1-930b-e2240a62419a`.
D1 staging: `0005_google_auth_challenge.sql` applied and verified on `taco-loco-staging-20260913` (`266d23b2-4056-41c0-82d9-4f063ba48d78`).

## Implementation

`GoogleAuthChallenge` stores only a hashed nonce, expiry and nullable `consumedAt`. The config endpoint persists the hash and returns the nonce for GIS. The auth POST verifies the signed Google nonce, then executes a conditional database update matching hash, unconsumed state and expiry. Only `count === 1` proceeds to identity/session creation. Cookie deletion remains cleanup only and is not the atomic boundary.

## Local D1 evidence

- Migration `0005_google_auth_challenge.sql` applied to isolated local D1.
- Two parallel conditional updates produced one `changed=1` and one `changed=0`; final state was one row, one consumed challenge.
- Two parallel local D1 identity inserts for the same provider/subject resulted in one identity linked to one customer; one request hit the provider UNIQUE constraint and another local process hit `SQLITE_BUSY`. This proves database constraint behavior, not complete application conflict recovery under provider contention.
- Application conflict recovery remains covered by the deterministic unit harness; real staging/provider concurrency is not claimed.

## QA

- 27 test files / 75 tests: PASS.
- Typecheck: PASS.
- Lint: PASS with three pre-existing warnings.
- `build:vinext`: PASS.
- CI: PASS for exact candidate, including PostgreSQL migration/seed, lint, typecheck, tests, audit and vinext build.

## Staging smoke evidence

- `/api/health`: HTTP 200.
- `/menu`: HTTP 200.
- `/cuenta`: HTTP 200.
- Anonymous `/api/customer/auth/session`: HTTP 401.
- Google config: enabled, public client ID present, CSRF and nonce lengths 64; values were not persisted.
- Cookies observed by name only: `taco_loco_google_csrf`, `taco_loco_google_nonce`.
- Remote schema verification: `GoogleAuthChallenge` table, unique nonce-hash index and expiry/consumption indexes present.
- A real Google account selection has not yet been completed; no authenticated PASS is claimed.

## Remaining gates

- HUMAN_INPUT: select the authorized Google account in the already-open Google chooser. This is the only human interaction needed for the browser proof.
- Real D1 identity conflict recovery under parallel provider writes remains unproven; the local evidence observed `UNIQUE` and `SQLITE_BUSY` and is not promoted to a concurrency PASS.
- Challenge cleanup policy is not yet production-ready: consumed/expired rows are retained by the current implementation. A bounded cleanup decision is required before integration; no cleanup job or extra infrastructure was introduced in staging.

## Gates

Production remains `NOT_AUTHORIZED`; PR #9 remains draft and no merge or P1b work was performed.
