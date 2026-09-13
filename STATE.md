# Taco Loco — Current Authoritative Project State
Updated: 2026-09-13
Mode: DELIVERY
Phase: IMPLEMENT / VALIDATE
Status: TECHNICAL_PASS / STATIC_ASSETS_REMOTE_ADMISSION_READY
Active contract: TL-CF-STATIC-ASSETS-01
Prior validated technical candidate: `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`
Static-assets candidate: `4007a5810c998a7c4478dfb4b054c9c612860a1a`
GitHub source convergence baseline: `origin/migration/cloudflare-native@7a600439d7e2736c34ba9a8da63fd06ebf54c6b3`; candidate `5d0a1bf` is an ancestor.
Frozen source: `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`

## Objective
Complete the Cloudflare-native migration without changing Taco Loco product behavior or transactional semantics, using the minimum initial infrastructure compatible with COST-0.

## Active decisions
- Source repo remains read-only.
- Workers/vinext is the target runtime.
- D1 is the target structured/transactional store; local D1 implementation for candidate `5d0a1bf` reached TECHNICAL_PASS with Independent Critic PASS and Integration Review PASS.
- `MEDIA_STATIC_ASSETS_INITIAL`: initial product images are Workers Static Assets versioned with the application deployment.
- `MEDIA_SELF_SERVICE_UPLOAD_DEFERRED`: customers/admin users do not require image upload in the initial release; image additions/replacements are operator-managed on explicit business request.
- D1 stores the public static media path/reference in `Product.imageKey`.
- `R2_FREE_TIER_ACCEPTED` remains historical evidence but is `SUPERSEDED_FOR_INITIAL_MEDIA_TARGET`; R2 enablement, bucket and binding are not required now.
- Cloudflare Images is deferred/not required for the initial media target unless a later requirement independently justifies it.
- Hyperdrive, external PostgreSQL and KV remain superseded/deferred.
- Production cutover requires a future Human Gate.

## Source precedence
1. FALDEO Project Method v1.0 + Harness v1 define operating semantics.
2. This file governs current project state.
3. Active Task Contract governs scope/stop.
4. `STATUS.json` governs live orchestration state.
5. Repo SHA + `docs/evidence/` govern technical claims.
6. Frozen source SHA governs original baseline behavior.
7. Conversation is cache only.

## Validated prior D1 checkpoint
Candidate `5d0a1bf` preserves bounded D1 atomicity, concurrency/idempotency, relative numbering, persisted events/replay, auth/sessions/settings/catalog, transition-race behavior and Worker runtime. Its Independent Critic and Integration Review are PASS.

That candidate is now the baseline for a bounded media adaptation, not the final staging candidate, because the current code still depends on R2/Images and exposes self-service upload.

## Current work
`TL-CF-STATIC-ASSETS-01` must:
- replace the R2 media delivery/proxy path with direct Static Assets;
- remove the initial-runtime `MEDIA_BUCKET` requirement;
- remove/defer the `IMAGES` binding when no remaining requirement needs it;
- remove/disable the initial self-service upload UI/API;
- preserve all unaffected D1/product semantics;
- produce a new exact candidate with affected QA/build/runtime evidence, Independent Critic PASS and Integration Review PASS.

## Engineering evidence
D1 implementation: PROVEN for prior candidate `5d0a1bf`.  
Static Assets implementation: PROVEN for candidate `4007a5810c998a7c4478dfb4b054c9c612860a1a`; local QA/build/runtime PASS.  
Remote validation: UNKNOWN / PAUSED_PENDING_STATIC_ASSETS_ADAPTATION.  
Release/Deployment: UNKNOWN.  
Maintenance/Operations: UNKNOWN.  
Production: NOT_AUTHORIZED.

## Current blockers and classifications
There is no longer an R2 Human Action. R2 Dashboard enablement is cancelled/not required for the initial target.

Independent Critic `PASS` is persisted at `docs/reviews/TL-CF-STATIC-ASSETS-independent-critic-4007a58.md` for exact candidate `4007a5810c998a7c4478dfb4b054c9c612860a1a`, using a fresh independent context. Earlier evidence-only REWORKs were corrected without changing the substantive candidate.

## Next authorized action
Synchronize durable state/evidence and Drive, then reactivate the bounded remote staging contract against Workers + D1 + Static Assets. No remote provisioning or deployment occurs in this local block.

After local candidate PASS + Independent Critic PASS + Integration Review PASS, reactivate `TL-CF-D1-REMOTE-STAGING-01` against Workers + D1 + Static Assets.

Production remains `NOT_AUTHORIZED`.
