# TL-CF-MIG-01 executable evidence — `ce36a2c81eba3f20aa7e4643a31771e8b85a23af`

Date: 2026-09-12
Candidate: `ce36a2c81eba3f20aa7e4643a31771e8b85a23af`
Source: `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`

- `pnpm lint`: exit 0 (source tree; generated `dist/` kept outside the lint surface)
- `pnpm typecheck`: exit 0
- `pnpm test`: exit 0; 12 files, 30 tests passed
- `pnpm exec vite build`: exit 0; produced `dist/server/index.js` and `dist/server/wrangler.json`
- `pnpm exec wrangler deploy --dry-run --config dist/server/wrangler.json`: exit 0; no upload/deploy
- `pnpm audit --audit-level=high`: exit 0; two moderate advisories remain
- Functional/engineering validation: PASS for the checks above
- Cloudflare resource provisioning, staging, deployment, and operations: UNKNOWN

Artifact hashes from the local Worker build:

```text
101a6f26a49b15dbb8256a44e5b94e4f913ce1cf395303ee50415cbb50eb9397  dist/server/index.js
9bd7c9cb42442ec450a7b3b48be89707ae62178a8df769de450fca1692a92210  dist/server/wrangler.json
```

Raw command result excerpts:

```text
$ pnpm lint
exit 0
$ pnpm typecheck
exit 0
$ pnpm test
Test Files 12 passed (12); Tests 30 passed (30)
$ pnpm audit --audit-level=high
2 vulnerabilities found; Severity: 2 moderate; exit 0
$ pnpm exec vite build
dist/server/wrangler.json 1.57 kB; dist/server/index.js 253.15 kB; exit 0
$ pnpm exec wrangler deploy --dry-run --config dist/server/wrangler.json
Total Upload: 2022.93 KiB / gzip: 590.69 KiB
--dry-run: exiting now. exit 0
```

The candidate is the dependency-repair commit immediately after governance HEAD `fd69a943aae82beb52e42aa9c0b316904bfa84fb`. Governance documents are updated separately and do not replace this substantive candidate identity.
