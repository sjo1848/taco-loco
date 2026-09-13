#!/usr/bin/env bash
set -euo pipefail

app_url="${TACO_LOCO_URL:-http://localhost:8787}"
product_id="${TACO_LOCO_PRODUCT_ID:-acacacac-acac-4aca-8aca-acacacacacac}"
same_reference="${TACO_LOCO_SAME_REFERENCE:-d1-harness-same-reference-20260921}"
distinct_a="${TACO_LOCO_DISTINCT_A:-d1-harness-distinct-a-20260921}"
distinct_b="${TACO_LOCO_DISTINCT_B:-d1-harness-distinct-b-20260921}"
python3 - "$app_url" "$product_id" <<'PY'
import concurrent.futures
import json
import subprocess
import sys

url, product_id = sys.argv[1:]
same_reference = __import__("os").environ.get("TACO_LOCO_SAME_REFERENCE", "d1-harness-same-reference-20260921")
distinct_a = __import__("os").environ.get("TACO_LOCO_DISTINCT_A", "d1-harness-distinct-a-20260921")
distinct_b = __import__("os").environ.get("TACO_LOCO_DISTINCT_B", "d1-harness-distinct-b-20260921")

def request(item):
    index, reference = item
    body = json.dumps({"clientReference": reference, "lines": [{"productId": product_id, "quantity": 1, "modifiers": []}]})
    result = subprocess.run([
        "curl", "--max-time", "15", "-sS", "-w", "\nHTTP %{http_code}",
        "-X", "POST", f"{url}/api/orders/intents",
        "-H", "content-type: application/json", "-H", f"origin: {url}",
        "-H", f"x-forwarded-for: 10.0.2.{index}", "--data", body,
    ], check=True, capture_output=True, text=True)
    return index, reference, result.stdout.strip()

items = [(i, same_reference) for i in range(1, 5)]
items += [(5, distinct_a), (6, distinct_b)]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(request, items))

parsed = []
for index, reference, output in results:
    payload, status = output.rsplit("\nHTTP ", 1)
    parsed.append({"index": index, "reference": reference, "status": int(status), "payload": json.loads(payload)})
    print(json.dumps(parsed[-1], sort_keys=True))

same = [item for item in parsed if item["reference"] == same_reference]
assert sorted(item["status"] for item in same) == [200, 200, 200, 201], same
assert len({item["payload"]["order"]["id"] for item in same}) == 1, same
assert len({item["payload"]["order"]["orderNumber"] for item in same}) == 1, same
distinct = [item for item in parsed if item["reference"] in {distinct_a, distinct_b}]
assert [item["status"] for item in distinct] == [201, 201], distinct
assert len({item["payload"]["order"]["orderNumber"] for item in distinct}) == 2, distinct
print(json.dumps({"assertions": "PASS", "duplicate_requests": 4, "distinct_requests": 2}))
PY
