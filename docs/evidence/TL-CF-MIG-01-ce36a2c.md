# TL-CF-MIG-01 executable evidence — `ce36a2c81eba3f20aa7e4643a31771e8b85a23af`

Date: 2026-09-12
Candidate: `ce36a2c81eba3f20aa7e4643a31771e8b85a23af`
Source: `sjo1848/taco-loco-foodtrack@a9a9e2c1c70d2a654f7d6b181bf2b18778b49f48`

- `pnpm lint`: exit 0 (source tree; generated `dist/` kept outside the lint surface)
- `pnpm typecheck`: exit 0
- `pnpm test`: exit 0; 12 files, 30 tests passed
- `pnpm build:vinext`: exit 0
- `pnpm audit --audit-level=high`: exit 0; two moderate advisories remain
- Functional/engineering validation: PASS for the checks above
- Cloudflare resource provisioning, staging, deployment, and operations: UNKNOWN

The candidate is the dependency-repair commit immediately after governance HEAD `fd69a943aae82beb52e42aa9c0b316904bfa84fb`. Governance documents are updated separately and do not replace this substantive candidate identity.
