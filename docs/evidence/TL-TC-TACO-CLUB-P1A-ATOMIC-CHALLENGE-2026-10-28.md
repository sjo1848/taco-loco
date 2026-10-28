# Taco Club P1a — atomic challenge and current-head gate

Current PR HEAD before this work: `c6bada89774848cf14aaad777b4bf8abeae9864c`.  
New exact candidate: `48744dd5850ece461f3c2841b401da6797467b0a`.  
CI run: `40713513428` (`success`, exact candidate).  
Staging deployment: not performed for this candidate.

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

## Gates

The candidate has not been deployed to staging because applying `0005` and deploying are external writes requiring explicit authorization. Authenticated browser evidence is still pending. Production remains `NOT_AUTHORIZED`.
