#!/usr/bin/env bash
set -euo pipefail

app_url="${TACO_LOCO_URL:-http://localhost:8787}"
product_id="${TACO_LOCO_PRODUCT_ID:-acacacac-acac-4aca-8aca-acacacacacac}"
python3 - "$app_url" "$product_id" <<'PY'
import concurrent.futures
import json
import subprocess
import sys

url, product_id = sys.argv[1:]

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

items = [(i, "d1-harness-same-reference-20260921") for i in range(1, 5)]
items += [(5, "d1-harness-distinct-a-20260921"), (6, "d1-harness-distinct-b-20260921")]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for result in pool.map(request, items):
        print(json.dumps({"index": result[0], "reference": result[1], "response": result[2]}))
PY
