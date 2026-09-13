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
  if [[ -n "$server_pid" ]]; then kill -- "-$server_pid" 2>/dev/null || kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; fi
  if [[ -n "$rollback_pid" ]]; then kill -- "-$rollback_pid" 2>/dev/null || kill "$rollback_pid" 2>/dev/null || true; wait "$rollback_pid" 2>/dev/null || true; fi
  rm -rf -- "$persist_dir"
}
trap cleanup EXIT

cd "$root_dir"
pnpm run build:vinext >/tmp/taco-loco-d1-proof-build-${run_id}.log 2>&1
pnpm exec wrangler d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to "$persist_dir" >/tmp/taco-loco-d1-proof-migrate-${run_id}.log 2>&1
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to "$persist_dir" --command "INSERT OR IGNORE INTO Category (id,name,slug,active,sortOrder,createdAt,updatedAt) VALUES ('abababab-abab-4aba-8aba-abababababab','Harness','harness',1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP); INSERT OR IGNORE INTO Product (id,categoryId,name,priceAmount,available,published,featured,sortOrder,createdAt,updatedAt) VALUES ('acacacac-acac-4aca-8aca-acacacacacac','abababab-abab-4aba-8aba-abababababab','Harness Taco',1000,1,1,0,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);" >/tmp/taco-loco-d1-proof-seed-${run_id}.log 2>&1
admin_hash="$(node -e 'const c=require("node:crypto"),s=c.randomBytes(16),h=c.scryptSync("harness-password",s,64,{N:16384,r:8,p:1,maxmem:32*1024*1024}); process.stdout.write(`scrypt$${s.toString("base64url")}$${h.toString("base64url")}`)')"
weekly_schedule='[{"day":0,"enabled":true,"open":"10:00","close":"22:00"},{"day":1,"enabled":true,"open":"10:00","close":"22:00"},{"day":2,"enabled":true,"open":"10:00","close":"22:00"},{"day":3,"enabled":true,"open":"10:00","close":"22:00"},{"day":4,"enabled":true,"open":"10:00","close":"22:00"},{"day":5,"enabled":true,"open":"10:00","close":"22:00"},{"day":6,"enabled":true,"open":"10:00","close":"22:00"}]'
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to "$persist_dir" --command "INSERT OR REPLACE INTO AdminUser (id,email,passwordHash,active,createdAt,updatedAt) VALUES ('adadadad-adad-4ada-8ada-adadadadadad','harness@example.com','$admin_hash',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP); INSERT OR REPLACE INTO MenuSettings (id,businessName,whatsappPhone,whatsappMessage,currency,acceptingOrders,statusMessage,weeklySchedule,updatedAt) VALUES ('00000000-0000-0000-0000-000000000001','Taco Loco Harness','5492615956912','Hola Taco Loco','ARS',1,NULL,'$weekly_schedule',CURRENT_TIMESTAMP); INSERT OR REPLACE INTO \"Order\" (id,orderNumber,status,fulfillment,source,subtotalAmount,adjustmentAmount,totalAmount,clientReference,createdAt,updatedAt) VALUES ('bdbdbdbd-bdbd-4bdb-8bdb-bdbdbdbdbdbd',100,'RECEIVED','PICKUP','PUBLIC_MENU',1000,0,1000,'d1-harness-transition-${run_id}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP); INSERT OR REPLACE INTO OrderLine (id,orderId,productId,productName,unitPriceAmount,quantity,createdAt) VALUES ('bcbcbcbc-bcbc-4bcb-8bcb-bcbcbcbcbcbc','bdbdbdbd-bdbd-4bdb-8bdb-bdbdbdbdbdbd','acacacac-acac-4aca-8aca-acacacacacac','Harness Taco',1000,1,CURRENT_TIMESTAMP); INSERT OR REPLACE INTO OrderEvent (id,sequence,orderId,toStatus,reason,createdAt) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',100,'bdbdbdbd-bdbd-4bdb-8bdb-bdbdbdbdbdbd','RECEIVED','Harness seed',CURRENT_TIMESTAMP);" >/tmp/taco-loco-d1-proof-admin-seed-${run_id}.log 2>&1

setsid pnpm exec wrangler dev --config d1/verification/proof-wrangler.jsonc --local --persist-to "$persist_dir" --port "$rollback_port" --show-interactive-dev-session false >/tmp/taco-loco-d1-proof-rollback-${run_id}.log 2>&1 &
rollback_pid=$!
for _ in $(seq 1 30); do curl --max-time 1 -sS "http://localhost:${rollback_port}/rollback" >/tmp/taco-loco-d1-proof-rollback-result-${run_id}.json 2>/dev/null && break; sleep 1; done
python3 -c 'import json, pathlib, sys; result=json.loads(pathlib.Path(sys.argv[1]).read_text()); assert result["batch"] == "DB.batch" and result["failed"] and result["remaining"] == 0, result; print(json.dumps({"rollback_assertions": "PASS", "remaining": result["remaining"]}))' "/tmp/taco-loco-d1-proof-rollback-result-${run_id}.json"

setsid pnpm exec wrangler dev --config dist/server/wrangler.json --local --persist-to "$persist_dir" --port "$port" --show-interactive-dev-session false >/tmp/taco-loco-d1-proof-worker-${run_id}.log 2>&1 &
server_pid=$!
for _ in $(seq 1 30); do curl --max-time 1 -sS "http://localhost:${port}/api/health" >/dev/null 2>&1 && break; sleep 1; done

export TACO_LOCO_URL="http://localhost:${port}"
export TACO_LOCO_SAME_REFERENCE="d1-harness-same-${run_id}"
export TACO_LOCO_DISTINCT_A="d1-harness-a-${run_id}"
export TACO_LOCO_DISTINCT_B="d1-harness-b-${run_id}"
./scripts/d1-local-concurrency-proof.sh

cookie_jar="$persist_dir/cookies.txt"
curl --fail-with-body --max-time 15 -sS -o /dev/null -w '%{http_code}' "$TACO_LOCO_URL/menu" | grep -q '^200$'
login_response="$(curl --max-time 15 -sS -c "$cookie_jar" -b "$cookie_jar" -w '\nHTTP %{http_code}' -X POST "$TACO_LOCO_URL/api/auth/login" -H "content-type: application/json" -H "origin: $TACO_LOCO_URL" --data '{"email":"harness@example.com","password":"harness-password"}')"
printf '%s\n' "$login_response"
printf '%s\n' "$login_response" | grep -q '"ok":true'
session_response="$(curl --max-time 15 -sS -c "$cookie_jar" -b "$cookie_jar" -w '\nHTTP %{http_code}' "$TACO_LOCO_URL/api/auth/session")"
printf '%s\n' "$session_response"
printf '%s\n' "$session_response" | grep -q '"authenticated":true'
settings_response="$(curl --max-time 15 -sS -c "$cookie_jar" -b "$cookie_jar" -w '\nHTTP %{http_code}' "$TACO_LOCO_URL/api/admin/settings")"
printf '%s\n' "$settings_response"
printf '%s\n' "$settings_response" | grep -q 'Taco Loco Harness'
curl --fail-with-body --max-time 15 -sS -c "$cookie_jar" -b "$cookie_jar" -X PATCH "$TACO_LOCO_URL/api/admin/settings" -H "content-type: application/json" -H "origin: $TACO_LOCO_URL" --data "{\"businessName\":\"Taco Loco Harness Updated\",\"whatsappPhone\":\"5492615956912\",\"whatsappMessage\":\"Hola Taco Loco\",\"currency\":\"ARS\",\"acceptingOrders\":true,\"statusMessage\":\"Harness\",\"weeklySchedule\":$weekly_schedule}" | grep -q 'Taco Loco Harness Updated'
python3 - "$TACO_LOCO_URL" "$cookie_jar" <<'PY'
import concurrent.futures, json, subprocess, sys
url, cookie_jar = sys.argv[1:]
def transition(_):
    return subprocess.run(["curl", "--max-time", "15", "-sS", "-o", "/dev/stdout", "-w", "\nHTTP %{http_code}", "-b", cookie_jar, "-X", "PATCH", f"{url}/api/admin/orders/bdbdbdbd-bdbd-4bdb-8bdb-bdbdbdbdbdbd", "-H", "content-type: application/json", "-H", f"origin: {url}", "--data", '{"toStatus":"CONFIRMED"}'], check=True, capture_output=True, text=True).stdout
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    outputs = list(pool.map(transition, range(2)))
statuses = sorted(int(output.rsplit("\nHTTP ", 1)[1]) for output in outputs)
assert statuses == [200, 409], (statuses, outputs)
print(json.dumps({"transition_race": "PASS", "statuses": statuses}))
PY
sse_output="$persist_dir/sse.txt"
curl --max-time 3 -sS -N -b "$cookie_jar" "$TACO_LOCO_URL/api/admin/orders/events?after=99" >"$sse_output" 2>/dev/null || test "$?" = 28
grep -q 'event: order' "$sse_output"
grep -q '^id: ' "$sse_output"
echo "sse_cursor_replay_assertions=PASS"
logout_status="$(curl --max-time 15 -sS -o /dev/null -w '%{http_code}' -c "$cookie_jar" -b "$cookie_jar" -X POST "$TACO_LOCO_URL/api/auth/logout" -H "origin: $TACO_LOCO_URL")"
test "$logout_status" = 200
session_status="$(curl --max-time 15 -sS -o /dev/null -w '%{http_code}' -c "$cookie_jar" -b "$cookie_jar" "$TACO_LOCO_URL/api/auth/session")"
test "$session_status" = 401
echo "catalog_settings_auth_session_assertions=PASS"

pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to "$persist_dir" --command "SELECT COUNT(*) AS orders FROM \"Order\" WHERE clientReference LIKE 'd1-harness-%-${run_id}'; SELECT COUNT(*) AS lines FROM OrderLine WHERE orderId IN (SELECT id FROM \"Order\" WHERE clientReference LIKE 'd1-harness-%-${run_id}'); SELECT COUNT(*) AS events FROM OrderEvent WHERE orderId IN (SELECT id FROM \"Order\" WHERE clientReference LIKE 'd1-harness-%-${run_id}');" >/tmp/taco-loco-d1-proof-verify-${run_id}.log 2>&1
grep -q '"orders": 3' /tmp/taco-loco-d1-proof-verify-${run_id}.log
grep -q '"lines": 3' /tmp/taco-loco-d1-proof-verify-${run_id}.log
grep -q '"events": 3' /tmp/taco-loco-d1-proof-verify-${run_id}.log
echo "D1_LOCAL_INTEGRATION_PROOF=PASS"
