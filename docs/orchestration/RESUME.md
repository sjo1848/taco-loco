# Taco Loco — Resume / Orchestration State

Updated: 2026-09-13

- Repository: `sjo1848/taco-loco`
- Branch: `migration/cloudflare-native`
- Source-convergence baseline: `origin/migration/cloudflare-native@7a600439d7e2736c34ba9a8da63fd06ebf54c6b3`
- Last verified GitHub checkpoint: `origin/migration/cloudflare-native@3671c839e805bcade6ec5ba9e72e5624b08e64ca`
- Prior validated technical candidate: `5d0a1bf582a5bd9f061b7c6121a03d757397fcb4`
- Prior Static-assets candidate: `4007a5810c998a7c4478dfb4b054c9c612860a1a`
- Remote final rework candidate: `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`
- Global mode: `DELIVERY`
- Phase: `IMPLEMENT / VALIDATE`
- State: `REMOTE_STAGING_INTEGRATION_REVIEW / STATIC_ASSETS`
- Active contract: `docs/contracts/TL-CF-D1-REMOTE-STAGING-01.md`
- Production: `NOT_AUTHORIZED`

## Prior D1 checkpoint

Candidate `5d0a1bf` is TECHNICAL_PASS with fresh Independent Critic PASS and Integration Review PASS for the local D1 implementation. Its D1/order/auth/event evidence remains reusable for unaffected surfaces.

It is not the final remote-staging candidate because its media path still uses R2/Images and currently exposes admin self-service upload.

## Current Human Decision

`MEDIA_STATIC_ASSETS_INITIAL`:
- initial media uses Workers Static Assets;
- `Product.imageKey` stores a public static asset path/reference;
- images are managed by the operator/developer through repository change + deployment;
- self-service upload is deferred;
- R2 is not required for the initial release;
- Cloudflare Images is deferred unless independently justified.

`R2_FREE_TIER_ACCEPTED` remains historical evidence but is superseded for the initial media target.

## Current objective

Execute the bounded local `TL-CF-STATIC-ASSETS-01` adaptation:
- direct Static Assets delivery;
- no required R2/Images binding;
- no exposed self-service upload UI/API;
- preserve D1/product semantics;
- produce a new candidate;
- affected QA/build/runtime PASS;
- Independent Critic PASS;
- Integration Review PASS.

Local evidence: `docs/evidence/TL-CF-STATIC-ASSETS-4007a58.md` — PASS.

## Remote staging

`TL-CF-D1-REMOTE-STAGING-01` completed its bounded remote journey for candidate `6eccc3a` after two routine runtime REWORKs. D1 and Worker resources remain provisioned for evidence; no R2/Images resources exist.

No R2 Dashboard action is required. Remote provisioning is authorized only for the minimum D1/Worker validation footprint.

## Next authorized objective

Independent Critic PASS is persisted for exact candidate `6eccc3aa81d351fc3e9e8ee718f781a77a9b48e3`. Perform Integration Review over Worker/D1/Static Assets composition, then classify remote staging. Production remains unauthorized.
