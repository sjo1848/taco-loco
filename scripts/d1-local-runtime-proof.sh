#!/usr/bin/env bash
set -euo pipefail

worker_url="${D1_PROOF_URL:-http://localhost:8788}"
echo "D1 proof worker: $worker_url"
curl --fail-with-body --max-time 15 -sS "$worker_url/rollback"
echo
