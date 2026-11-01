# Taco Loco — local D1 recovery drill — 2026-11-01

Classification: `LOCAL_RECOVERY_DRILL_PASS`.

- Source: local D1 `taco-loco-local`; no remote flag used.
- Export: non-empty SQL with schema and data; SHA-256 `7145fe88d812af1ee3a30daa00a26642ace1700f2b8d73f648b40eb2db955d9c`.
- Recovery target: separate local persistence directory and synthetic database identity `taco-loco-mvp-recovery-drill`; no remote resource.
- Verified after import: 16 application/system tables, 1 order, 1 event, 1 product.
- Historical migration ledger was preserved through `0005_google_auth_challenge.sql`.
- Finding: the raw Wrangler export orders `Order` before its later `Customer` DDL; the isolated import required a disposable prelude/ordering adjustment. This does not prove remote restore behavior and does not authorize a remote restore.
