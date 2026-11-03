#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
run_id="final-d1-$(date +%s)-$$"
persist_dir="$(mktemp -d "${TMPDIR:-/tmp}/taco-loco-${run_id}.XXXXXX")"
cookie_jar="${TMPDIR:-/tmp}/taco-loco-${run_id}.cookies"
worker_pid=""

cleanup() {
  if [[ -n "$worker_pid" ]]; then
    kill -- "-$worker_pid" 2>/dev/null || kill "$worker_pid" 2>/dev/null || true
    wait "$worker_pid" 2>/dev/null || true
  fi
  rm -rf -- "$persist_dir" "$cookie_jar"
}
trap cleanup EXIT

cd "$root_dir"
pnpm exec wrangler d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to "$persist_dir" >/dev/null

admin_hash="$(node -e 'const c=require("node:crypto");const s=c.randomBytes(16);const h=c.scryptSync("harness-password",s,64,{N:16384,r:8,p:1,maxmem:32*1024*1024});process.stdout.write(`scrypt$${s.toString("base64url")}$${h.toString("base64url")}`)')"
token="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq"

seed_sql=$(cat <<SQL
INSERT INTO Category (id,name,slug,active,sortOrder,createdAt,updatedAt) VALUES ('abababab-abab-4aba-8aba-abababababab','Harness','harness',1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO Product (id,categoryId,name,priceAmount,available,published,featured,sortOrder,createdAt,updatedAt) VALUES ('acacacac-acac-4aca-8aca-acacacacacac','abababab-abab-4aba-8aba-abababababab','Harness Taco',1200,1,1,0,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO AdminUser (id,email,passwordHash,active,createdAt,updatedAt) VALUES ('adadadad-adad-4ada-8ada-adadadadadad','harness@example.com','$admin_hash',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO MenuSettings (id,businessName,whatsappPhone,whatsappMessage,currency,acceptingOrders,statusMessage,weeklySchedule,updatedAt,deliveryEnabled,deliveryFeeAmount) VALUES ('00000000-0000-0000-0000-000000000001','Taco Loco Harness','5492615956912','Hola Taco Loco','ARS',1,NULL,'[]',CURRENT_TIMESTAMP,1,3000);
INSERT INTO "Order" (id,orderNumber,status,fulfillment,verificationStatus,paymentStatus,refundStatus,source,subtotalAmount,adjustmentAmount,totalAmount,clientReference,publicTrackingToken,createdAt,updatedAt) VALUES ('11111111-1111-4111-8111-111111111111',501,'RECEIVED','DELIVERY','PENDING','PENDING','NOT_REQUIRED','PUBLIC_MENU',1000,0,1000,'payment-proof-$run_id','$token',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO OrderLine (id,orderId,productId,productName,unitPriceAmount,quantity,modifiersSnapshot,note,createdAt) VALUES ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','acacacac-acac-4aca-8aca-acacacacacac','Harness Taco',1000,1,'[]','seed note',CURRENT_TIMESTAMP);
INSERT INTO OrderEvent (id,sequence,orderId,fromStatus,toStatus,reason,kind,createdAt,actorId) VALUES ('33333333-3333-4333-8333-333333333333',10,'11111111-1111-4111-8111-111111111111',NULL,'RECEIVED','seed','ORDER_CREATED',CURRENT_TIMESTAMP,NULL);
SQL
)
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to "$persist_dir" --command "$seed_sql" >/dev/null

setsid pnpm exec wrangler dev --config dist/server/wrangler.json --local --persist-to "$persist_dir" --port 8797 --show-interactive-dev-session false >/tmp/taco-loco-${run_id}.worker.log 2>&1 &
worker_pid=$!
for _ in $(seq 1 30); do
  curl --max-time 1 -sS http://localhost:8797/api/health >/dev/null 2>&1 && break
  sleep 1
done

curl --fail-with-body --max-time 15 -sS -c "$cookie_jar" -b "$cookie_jar" -X POST http://localhost:8797/api/auth/login -H 'content-type: application/json' -H 'origin: http://localhost:8797' --data '{"email":"harness@example.com","password":"harness-password"}' >/dev/null

manual_payload='{"fulfillment":"PICKUP","customerName":"Harness","customerPhone":null,"notes":"order manual note","adjustmentAmount":0,"lines":[{"productId":"acacacac-acac-4aca-8aca-acacacacacac","quantity":1,"modifiers":[],"note":"sin cebolla"}]}'
manual_response="$(curl --max-time 15 -sS -c "$cookie_jar" -b "$cookie_jar" -w '\nHTTP %{http_code}' -X POST http://localhost:8797/api/admin/orders -H 'content-type: application/json' -H 'origin: http://localhost:8797' --data "$manual_payload")"
printf '%s\n' "$manual_response"
grep -q '^HTTP 201$' <<<"$manual_response"

first="$(curl --max-time 15 -sS -w '\nHTTP %{http_code}' -X POST "http://localhost:8797/api/orders/tracking/${token}/payment" -H 'origin: http://localhost:8797')"
second="$(curl --max-time 15 -sS -w '\nHTTP %{http_code}' -X POST "http://localhost:8797/api/orders/tracking/${token}/payment" -H 'origin: http://localhost:8797')"
printf '%s\n' "$first" "$second"
test "$(sed '$d' <<<"$first")" = '{"reported":true,"reused":false}'
test "$(sed '$d' <<<"$second")" = '{"reported":true,"reused":true}'

verify_sql=$(cat <<SQL
SELECT COUNT(*) AS payment_events FROM OrderEvent WHERE orderId='11111111-1111-4111-8111-111111111111' AND kind='PAYMENT_REPORTED';
SELECT GROUP_CONCAT(sequence) AS sequences FROM OrderEvent WHERE orderId='11111111-1111-4111-8111-111111111111';
SELECT note FROM OrderLine WHERE orderId=(SELECT id FROM "Order" WHERE notes='order manual note' ORDER BY createdAt DESC LIMIT 1);
SQL
)
verification="$(pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to "$persist_dir" --command "$verify_sql")"
printf '%s\n' "$verification"
grep -q '"payment_events": 1' <<<"$verification"
grep -q '10,12\|12,10' <<<"$verification"
grep -q 'sin cebolla' <<<"$verification"
printf '%s\n' 'D1_SQLITE_PAYMENT_SEQUENCE_AND_MANUAL_NOTES=PASS'
