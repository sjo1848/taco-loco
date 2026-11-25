#!/usr/bin/env bash
# Build the Vinext artifact first. This runner never connects Wrangler to remote D1.
set -euo pipefail
umask 077
qa_root=$(cd "$(dirname "$0")/.." && pwd)
cd "${TACO_QA_APP_ROOT:-$qa_root}"
state=$(mktemp -d)
port=${TACO_QA_PORT:-8845}
config=dist/server/wrangler.json
w=./node_modules/.bin/wrangler
args=(--config "$config" --local --persist-to "$state/d1")
export TACO_QA_LOCAL_URL="http://127.0.0.1:$port"
export TACO_QA_LOCAL_STATE="$state/d1"
echo "Local QA evidence: $state"
worker=''
cleanup() { if [[ -n "$worker" ]]; then kill -- "-$worker" 2>/dev/null || true; fi; }
trap cleanup EXIT
trap 'exit 130' INT TERM
"$w" d1 migrations apply DB "${args[@]}" >"$state/migrations.log"
other_hash=$(node -e 'console.log(require("node:crypto").createHash("sha256").update("c".repeat(64)).digest("hex"))')
hash=$(node -e 'console.log(require("node:crypto").createHash("sha256").update("b".repeat(64)).digest("hex"))')
cat >"$state/fixtures.sql" <<SQL
INSERT INTO Category (id,name,slug,active,sortOrder,createdAt,updatedAt) VALUES ('qa-cat','QA','qa',1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO Product (id,categoryId,name,priceAmount,available,published,featured,sortOrder,createdAt,updatedAt) VALUES ('acacacac-acac-4aca-8aca-acacacacacac','qa-cat','QA Taco',1200,1,1,0,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO ModifierGroup (id,name) VALUES ('qa-salsa','Salsa');
INSERT INTO ModifierOption (id,groupId,name) VALUES ('qa-picante','qa-salsa','Picante'),('qa-suave','qa-salsa','Suave');
INSERT INTO ProductModifierGroup VALUES ('acacacac-acac-4aca-8aca-acacacacacac','qa-salsa',1,1,1);
INSERT INTO MenuSettings (id,businessName,whatsappPhone,whatsappMessage,currency,acceptingOrders,weeklySchedule,deliveryEnabled,deliveryFeeAmount,updatedAt) VALUES ('00000000-0000-0000-0000-000000000001','QA local','10000000000','QA','ARS',1,'[]',1,300,CURRENT_TIMESTAMP);
INSERT INTO Customer (id,email,displayName,active,createdAt,updatedAt) VALUES ('qa-customer','customer@example.com','QA Cliente',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO CustomerSession (id,tokenHash,customerId,expiresAt,createdAt) VALUES ('qa-session','$hash','qa-customer','2099-01-01T00:00:00Z',CURRENT_TIMESTAMP);
INSERT INTO Customer (id,email,displayName,active,createdAt,updatedAt) VALUES ('qa-other','other@example.com','QA Otro',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO CustomerSession (id,tokenHash,customerId,expiresAt,createdAt) VALUES ('qa-other-session','$other_hash','qa-other','2099-01-01T00:00:00Z',CURRENT_TIMESTAMP);
INSERT INTO "Order" (id,orderNumber,customerId,status,fulfillment,source,verificationStatus,paymentStatus,refundStatus,subtotalAmount,totalAmount,publicTrackingToken,createdAt,updatedAt)
VALUES ('aaaaaaaa-1111-4111-8111-111111111111',7,'qa-customer','CANCELLED','DELIVERY','PUBLIC_MENU','VERIFIED','CONFIRMED','REQUIRED',1200,1500,NULL,'2000-01-01T00:00:00.000Z',CURRENT_TIMESTAMP),
('aaaaaaaa-1111-4111-8111-111111111112',8,'qa-customer','RECEIVED','DELIVERY','PUBLIC_MENU','PENDING','PENDING','NOT_REQUIRED',1200,1500,'ddddddddddddddddddddddddddddddddddddddddddd','2000-01-01T00:00:00.000Z',CURRENT_TIMESTAMP),
('aaaaaaaa-1111-4111-8111-111111111115',10,'qa-customer','CANCELLED','DELIVERY','PUBLIC_MENU','PENDING','PENDING','NOT_REQUIRED',1200,1500,'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee','2000-01-01T00:00:00.000Z',CURRENT_TIMESTAMP),
('aaaaaaaa-1111-4111-8111-111111111114',9,'qa-other','READY','PICKUP','PUBLIC_MENU','VERIFIED','NOT_REQUIRED','NOT_REQUIRED',1200,1200,NULL,'2000-01-01T00:00:00.000Z',CURRENT_TIMESTAMP);
WITH RECURSIVE n(i) AS (SELECT 20 UNION ALL SELECT i+1 FROM n WHERE i<30)
INSERT INTO "Order" (id,orderNumber,customerId,status,fulfillment,source,verificationStatus,subtotalAmount,totalAmount,createdAt,updatedAt)
SELECT printf('bbbbbbbb-1111-4111-8111-%012d',i),i,'qa-customer','DELIVERED','PICKUP','PUBLIC_MENU','VERIFIED',1200,1200,'2001-01-01T00:00:00.000Z',CURRENT_TIMESTAMP FROM n;

SQL
if [[ -n "${TACO_QA_PROFILE_MODE:-}" ]]; then
  relogin_hash=$(node -e 'console.log(require("node:crypto").createHash("sha256").update("d".repeat(64)).digest("hex"))')
  cat >>"$state/fixtures.sql" <<SQL
INSERT INTO Category (id,name,slug,active,sortOrder,createdAt,updatedAt) VALUES ('qa-side-cat','Bebidas QA','qa-drinks',1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
UPDATE Product SET featured=1,imageKey='/products/taco-carne.jpg',description='Taco con salsa a elección' WHERE id='acacacac-acac-4aca-8aca-acacacacacac';
INSERT INTO Product (id,categoryId,name,priceAmount,available,published,featured,sortOrder,createdAt,updatedAt) VALUES ('abababab-abab-4aba-8aba-abababababab','qa-side-cat','Limonada QA',600,1,1,0,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO Product (id,categoryId,name,priceAmount,available,published,featured,sortOrder,createdAt,updatedAt) VALUES ('bcbcbcbc-bcbc-4bcb-8bcb-bcbcbcbcbcbc','qa-side-cat','Agua QA',500,0,1,0,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO OrderLine (id,orderId,productName,unitPriceAmount,quantity,modifiersSnapshot) VALUES ('qa-profile-line-a','aaaaaaaa-1111-4111-8111-111111111112','Taco QA',300,2,'[{"group":"Salsa","option":"Picante"}]'),('qa-profile-line-b','aaaaaaaa-1111-4111-8111-111111111112','Limonada QA',400,1,NULL),('qa-profile-line-c','aaaaaaaa-1111-4111-8111-111111111112','Agua QA',200,1,NULL);
INSERT INTO CustomerSession (id,tokenHash,customerId,expiresAt,createdAt) VALUES ('qa-customer-next','$relogin_hash','qa-customer','2099-01-01T00:00:00Z',CURRENT_TIMESTAMP);
INSERT INTO CustomerAddress (id,customerId,label,address,reference,createdAt,updatedAt) VALUES ('qa-home-a','qa-customer','Casa QA','Calle sintética 123','Puerta verde',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),('qa-home-b','qa-other','Dirección B','Calle sintética 456',NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO CustomerFavorite (customerId,productId,createdAt) VALUES ('qa-customer','acacacac-acac-4aca-8aca-acacacacacac',CURRENT_TIMESTAMP),('qa-other','abababab-abab-4aba-8aba-abababababab',CURRENT_TIMESTAMP);
SQL
fi
if [[ "${TACO_QA_GUEST_TRACKING:-}" == "1" ]]; then
  cat >>"$state/fixtures.sql" <<'SQL'
WITH orders(n, token, status) AS (
  VALUES (80,'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr','CONFIRMED'),
         (81,'sssssssssssssssssssssssssssssssssssssssssss','READY'),
         (82,'ttttttttttttttttttttttttttttttttttttttttttt','DELIVERED'),
         (83,'uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu','CANCELLED')
)
INSERT INTO "Order" (id,orderNumber,status,fulfillment,source,verificationStatus,subtotalAmount,totalAmount,publicTrackingToken,createdAt,updatedAt)
SELECT 'rel-01-' || n,n,status,'PICKUP','PUBLIC_MENU','VERIFIED',1200,1200,token,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM orders;
UPDATE "Order" SET publicTrackingToken='vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv' WHERE id='aaaaaaaa-1111-4111-8111-111111111114';
SQL
fi
if [[ "${TACO_QA_PROFILE_MODE:-}" == "candidate" && "${TACO_QA_PROFILE_ONLY:-}" != "visual" ]]; then
  timeout 90 node "$qa_root/scripts/qa-profile-worker-checks.mjs" | tee "$state/profile-worker.log"
fi
"$w" d1 execute DB "${args[@]}" --file "$state/fixtures.sql" >"$state/seed.log"
setsid "$w" dev "${args[@]}" --ip 127.0.0.1 --port "$port" --inspector-port "${TACO_QA_INSPECTOR_PORT:-9285}" --show-interactive-dev-session false >"$state/worker.log" 2>&1 &
worker=$!
for _ in {1..30}; do
  if curl -fsS --max-time 1 "$TACO_QA_LOCAL_URL/api/health" >/dev/null 2>&1; then break; fi
  kill -0 "$worker"
  sleep 1
done
curl -fsS --max-time 5 "$TACO_QA_LOCAL_URL/api/health" >/dev/null
if [[ -n "${TACO_QA_PROFILE_MODE:-}" ]]; then
  timeout 420 node "$qa_root/scripts/qa-customer-profile-v2.mjs" | tee "$state/profile.log"
  exit
fi
if [[ "${TACO_QA_GUEST_TRACKING:-}" == "1" ]]; then
  timeout 180 node "$qa_root/scripts/qa-guest-tracking.mjs" | tee "$state/guest-tracking.log"
  exit
fi
timeout 180 node scripts/qa-customer-workflows.mjs | tee "$state/workflows.log"
schedule=$(node -e 'const n = new Date(Date.now()+12*60*60*1000);const t = (x)=>x.toISOString().slice(11,16); console.log(JSON.stringify(Array.from({length:7},(_,day)=>({day,enabled:true,open:t(n),close:t(new Date(+n+60000))}))))')
"$w" d1 execute DB "${args[@]}" --command "UPDATE MenuSettings SET weeklySchedule='$schedule';" >"$state/closed.log"
timeout 60 node scripts/qa-customer-workflows.mjs --closed | tee -a "$state/workflows.log"
"$w" d1 execute DB "${args[@]}" --json --command 'SELECT count(*) AS orders,count(DISTINCT clientReference) AS refs FROM "Order" WHERE clientReference IS NOT NULL; SELECT count(*) AS events FROM OrderEvent WHERE kind="ORDER_CREATED"; SELECT count(*) AS paymentReports FROM OrderEvent WHERE kind="PAYMENT_REPORTED"; PRAGMA foreign_key_check;' >"$state/ledger.json"
node - "$state/ledger.json" <<'JS'
const assert = require("node:assert/strict");
const rows=JSON.parse(require("node:fs").readFileSync(process.argv[2])).map(q=>q.results);
assert.deepEqual(rows,[[{orders:4,refs:4}],[{events:4}],[{paymentReports:1}],[]]);
console.log("PASS D1 ledger: four orders, four distinct references and four create events; zero FK violations");
JS
