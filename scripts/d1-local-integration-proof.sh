#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
port="${TACO_LOCO_PROOF_PORT:-8797}"
rollback_port="${TACO_LOCO_ROLLBACK_PORT:-8798}"
run_id="$(date +%s)-$$"
persist_dir="$(mktemp -d "${TMPDIR:-/tmp}/taco-loco-d1-proof-${run_id}.XXXXXX")"
server_pid=""
rollback_pid=""
cleanup() {
  if [[ -n "$server_pid" ]]; then kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; fi
  if [[ -n "$rollback_pid" ]]; then kill "$rollback_pid" 2>/dev/null || true; wait "$rollback_pid" 2>/dev/null || true; fi
  rm -rf -- "$persist_dir"
}
trap cleanup EXIT

cd "$root_dir"
pnpm run build:vinext >/tmp/taco-loco-d1-proof-build-${run_id}.log 2>&1
pnpm exec wrangler d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to "$persist_dir" >/tmp/taco-loco-d1-proof-migrate-${run_id}.log 2>&1
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to "$persist_dir" --command "INSERT OR IGNORE INTO Category (id,name,slug,active,sortOrder,createdAt,updatedAt) VALUES ('abababab-abab-4aba-8aba-abababababab','Harness','harness',1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP); INSERT OR IGNORE INTO Product (id,categoryId,name,priceAmount,available,published,featured,sortOrder,createdAt,updatedAt) VALUES ('acacacac-acac-4aca-8aca-acacacacacac','abababab-abab-4aba-8aba-abababababab','Harness Taco',1000,1,1,0,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);" >/tmp/taco-loco-d1-proof-seed-${run_id}.log 2>&1

pnpm exec wrangler dev --config d1/verification/proof-wrangler.jsonc --local --persist-to "$persist_dir" --port "$rollback_port" --show-interactive-dev-session false >/tmp/taco-loco-d1-proof-rollback-${run_id}.log 2>&1 &
rollback_pid=$!
for _ in $(seq 1 30); do curl --max-time 1 -sS "http://localhost:${rollback_port}/rollback" >/tmp/taco-loco-d1-proof-rollback-result-${run_id}.json 2>/dev/null && break; sleep 1; done
python3 -c 'import json, pathlib, sys; result=json.loads(pathlib.Path(sys.argv[1]).read_text()); assert result["batch"] == "DB.batch" and result["failed"] and result["remaining"] == 0, result; print(json.dumps({"rollback_assertions": "PASS", "remaining": result["remaining"]}))' "/tmp/taco-loco-d1-proof-rollback-result-${run_id}.json"

pnpm exec wrangler dev --config dist/server/wrangler.json --local --persist-to "$persist_dir" --port "$port" --show-interactive-dev-session false >/tmp/taco-loco-d1-proof-worker-${run_id}.log 2>&1 &
server_pid=$!
for _ in $(seq 1 30); do curl --max-time 1 -sS "http://localhost:${port}/api/health" >/dev/null 2>&1 && break; sleep 1; done

export TACO_LOCO_URL="http://localhost:${port}"
export TACO_LOCO_SAME_REFERENCE="d1-harness-same-${run_id}"
export TACO_LOCO_DISTINCT_A="d1-harness-a-${run_id}"
export TACO_LOCO_DISTINCT_B="d1-harness-b-${run_id}"
./scripts/d1-local-concurrency-proof.sh

pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to "$persist_dir" --command "SELECT COUNT(*) AS orders FROM \"Order\" WHERE clientReference LIKE 'd1-harness-%-${run_id}';" >/tmp/taco-loco-d1-proof-verify-${run_id}.log 2>&1
grep -q '"orders": 3' /tmp/taco-loco-d1-proof-verify-${run_id}.log
echo "D1_LOCAL_INTEGRATION_PROOF=PASS"
