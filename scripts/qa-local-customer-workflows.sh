#!/usr/bin/env bash
# Build the Vinext artifact first. This runner never connects Wrangler to remote D1.
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
state=$(mktemp -d)
port=${TACO_QA_PORT:-8845}
config=dist/server/wrangler.json
w=./node_modules/.bin/wrangler
args=(--config "$config" --local --persist-to "$state/d1")
export TACO_QA_LOCAL_URL="http://127.0.0.1:$port"
echo "Local QA evidence: $state"
worker=''
cleanup() { if [[ -n "$worker" ]]; then kill -- "-$worker" 2>/dev/null || true; fi; }
trap cleanup EXIT
trap 'exit 130' INT TERM
"$w" d1 migrations apply DB "${args[@]}" >"$state/migrations.log"
hash=$(node -e 'console.log(require("node:crypto").createHash("sha256").update("b".repeat(64)).digest("hex"))')
cat >"$state/fixtures.sql" <<SQL
INSERT INTO Category (id,name,slug,active,sortOrder,createdAt,updatedAt) VALUES ('qa-cat','QA','qa',1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO Product (id,categoryId,name,priceAmount,available,published,featured,sortOrder,createdAt,updatedAt) VALUES ('acacacac-acac-4aca-8aca-acacacacacac','qa-cat','QA Taco',1200,1,1,0,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO ModifierGroup (id,name) VALUES ('qa-salsa','Salsa');
INSERT INTO ModifierOption (id,groupId,name) VALUES ('qa-picante','qa-salsa','Picante');
INSERT INTO ProductModifierGroup VALUES ('acacacac-acac-4aca-8aca-acacacacacac','qa-salsa',1,1,1);
INSERT INTO MenuSettings (id,businessName,whatsappPhone,whatsappMessage,currency,acceptingOrders,weeklySchedule,deliveryEnabled,deliveryFeeAmount,updatedAt) VALUES ('00000000-0000-0000-0000-000000000001','QA local','10000000000','QA','ARS',1,'[]',1,300,CURRENT_TIMESTAMP);
INSERT INTO Customer (id,email,displayName,active,createdAt,updatedAt) VALUES ('qa-customer','customer@example.com','QA Cliente',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO CustomerSession (id,tokenHash,customerId,expiresAt,createdAt) VALUES ('qa-session','$hash','qa-customer','2099-01-01T00:00:00Z',CURRENT_TIMESTAMP);
SQL
"$w" d1 execute DB "${args[@]}" --file "$state/fixtures.sql" >"$state/seed.log"
setsid "$w" dev "${args[@]}" --ip 127.0.0.1 --port "$port" --inspector-port "${TACO_QA_INSPECTOR_PORT:-9285}" --show-interactive-dev-session false >"$state/worker.log" 2>&1 &
worker=$!
for _ in {1..30}; do
  if curl -fsS --max-time 1 "$TACO_QA_LOCAL_URL/api/health" >/dev/null 2>&1; then break; fi
  kill -0 "$worker"
  sleep 1
done
curl -fsS --max-time 5 "$TACO_QA_LOCAL_URL/api/health" >/dev/null
timeout 150 node scripts/qa-customer-workflows.mjs | tee "$state/workflows.log"
schedule=$(node -e 'const n = new Date(Date.now()+12*60*60*1000);const t = (x)=>x.toISOString().slice(11,16); console.log(JSON.stringify(Array.from({length:7},(_,day)=>({day,enabled:true,open:t(n),close:t(new Date(+n+60000))}))))')
"$w" d1 execute DB "${args[@]}" --command "UPDATE MenuSettings SET weeklySchedule='$schedule';" >"$state/closed.log"
timeout 60 node scripts/qa-customer-workflows.mjs --closed | tee -a "$state/workflows.log"
"$w" d1 execute DB "${args[@]}" --json --command 'SELECT count(*) AS orders,count(DISTINCT clientReference) AS refs FROM "Order"; SELECT count(*) AS events FROM OrderEvent WHERE kind="ORDER_CREATED"; PRAGMA foreign_key_check;' >"$state/ledger.json"
node - "$state/ledger.json" <<'JS'
const assert = require("node:assert/strict");
const rows=JSON.parse(require("node:fs").readFileSync(process.argv[2])).map(q=>q.results);
assert.deepEqual(rows,[[{orders:4,refs:4}],[{events:4}],[]]);
console.log("PASS D1 ledger: four orders, four distinct references and four create events; zero FK violations");
JS
