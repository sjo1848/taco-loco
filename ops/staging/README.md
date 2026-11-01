# Taco Loco staging deployment procedure

This directory contains a versioned, secret-free staging configuration template. It is not a production configuration and does not authorize a deployment.

## Prepare

1. Build the exact reviewed candidate with `pnpm build:vinext`.
2. Copy `wrangler.staging.example.jsonc` to an untracked local file.
3. Replace the D1 name/ID and the public Google OAuth client ID. Do not commit the resulting file.
4. Keep `GOOGLE_SIGN_IN_ENABLED` false unless a bounded staging Google-auth validation is explicitly authorized.
5. Store private values, if ever required, through Wrangler secrets; never put them in this file.

## Inspect before deployment

Run a dry-run against the prepared local config:

```sh
pnpm exec wrangler deploy --config /path/to/wrangler.staging.jsonc --dry-run --outdir tmp/staging-dry-run
```

Verify that only `DB`, `ASSETS` and `CF_VERSION_METADATA` are bound, the D1 identity is the intended staging database, and no R2, Images, Hyperdrive, KV or production resource appears. A dry-run is not deployment evidence.

## Deployment boundary

Deployment, secret writes, migrations and production changes require a separate explicit authorization. Never use the tracked root `wrangler.jsonc` as staging configuration: it intentionally contains local placeholder D1 values.
