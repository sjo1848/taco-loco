#!/usr/bin/env python3
"""Compare current indexed count calls with conditional aggregation on local D1."""
from __future__ import annotations

import argparse
import glob
import json
import pathlib
import sqlite3
import statistics
import time

PREFIX = "perf-s7d-"
COUNT_SQL = [
    ("start", 'SELECT COUNT(*) FROM (SELECT `main`.`Order`.`id` FROM `main`.`Order` WHERE (`main`.`Order`.`status`=? AND `main`.`Order`.`verificationStatus`=? AND `main`.`Order`.`paymentStatus` IN (?,?)) LIMIT ? OFFSET ?) AS `sub`', ("CONFIRMED", "VERIFIED", "NOT_REQUIRED", "CONFIRMED", -1, "0")),
    ("preparing", 'SELECT COUNT(*) FROM (SELECT `main`.`Order`.`id` FROM `main`.`Order` WHERE (`main`.`Order`.`status`=? AND `main`.`Order`.`verificationStatus`=? AND `main`.`Order`.`paymentStatus` IN (?,?)) LIMIT ? OFFSET ?) AS `sub`', ("IN_PREPARATION", "VERIFIED", "NOT_REQUIRED", "CONFIRMED", -1, "0")),
    ("ready", 'SELECT COUNT(*) FROM (SELECT `main`.`Order`.`id` FROM `main`.`Order` WHERE (`main`.`Order`.`status`=? AND `main`.`Order`.`verificationStatus`=? AND `main`.`Order`.`paymentStatus` IN (?,?)) LIMIT ? OFFSET ?) AS `sub`', ("READY", "VERIFIED", "NOT_REQUIRED", "CONFIRMED", -1, "0")),
    ("verification", 'SELECT COUNT(*) FROM (SELECT `main`.`Order`.`id` FROM `main`.`Order` WHERE (`main`.`Order`.`verificationStatus`=?) LIMIT ? OFFSET ?) AS `sub`', ("PENDING", -1, "0")),
    ("unconfirmed", 'SELECT COUNT(*) FROM (SELECT `main`.`Order`.`id` FROM `main`.`Order` WHERE (`main`.`Order`.`status`=?) LIMIT ? OFFSET ?) AS `sub`', ("RECEIVED", -1, "0")),
    ("incidents", 'SELECT COUNT(*) FROM (SELECT `main`.`Order`.`id` FROM `main`.`Order` WHERE (`main`.`Order`.`refundStatus`=? OR `main`.`Order`.`paymentStatus`=?) LIMIT ? OFFSET ?) AS `sub`', ("REQUIRED", "REJECTED", -1, "0")),
    ("attention", 'SELECT COUNT(*) FROM (SELECT `main`.`Order`.`id` FROM `main`.`Order` WHERE (`main`.`Order`.`verificationStatus`=? OR `main`.`Order`.`status`=? OR `main`.`Order`.`refundStatus`=? OR `main`.`Order`.`paymentStatus`=?) LIMIT ? OFFSET ?) AS `sub`', ("PENDING", "RECEIVED", "REQUIRED", "REJECTED", -1, "0")),
]
AGGREGATE_SQL = '''SELECT
SUM(CASE WHEN status='CONFIRMED' AND verificationStatus='VERIFIED' AND paymentStatus IN ('NOT_REQUIRED','CONFIRMED') THEN 1 ELSE 0 END),
SUM(CASE WHEN status='IN_PREPARATION' AND verificationStatus='VERIFIED' AND paymentStatus IN ('NOT_REQUIRED','CONFIRMED') THEN 1 ELSE 0 END),
SUM(CASE WHEN status='READY' AND verificationStatus='VERIFIED' AND paymentStatus IN ('NOT_REQUIRED','CONFIRMED') THEN 1 ELSE 0 END),
SUM(CASE WHEN verificationStatus='PENDING' THEN 1 ELSE 0 END),
SUM(CASE WHEN status='RECEIVED' THEN 1 ELSE 0 END),
SUM(CASE WHEN refundStatus='REQUIRED' OR paymentStatus='REJECTED' THEN 1 ELSE 0 END),
SUM(CASE WHEN verificationStatus='PENDING' OR status='RECEIVED' OR refundStatus='REQUIRED' OR paymentStatus='REJECTED' THEN 1 ELSE 0 END)
FROM "Order"'''


def summary(samples: list[float]) -> dict[str, float]:
    ordered = sorted(samples)
    return {"p50_ms": round(statistics.median(ordered), 4),
            "p95_ms": round(ordered[int(len(ordered) * .95)], 4),
            "mean_ms": round(statistics.mean(ordered), 4)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--persist-to", required=True)
    parser.add_argument("--iterations", type=int, default=250)
    args = parser.parse_args()
    persist = pathlib.Path(args.persist_to).resolve()
    if not str(persist).startswith("/tmp/tl-s7d-"):
        raise SystemExit("Refusing to inspect outside isolated /tmp/tl-s7d-* D1")
    matches = [p for p in glob.glob(str(persist / "v3/d1/miniflare-D1DatabaseObject/*.sqlite"))
               if not p.endswith("/metadata.sqlite")]
    if len(matches) != 1:
        raise SystemExit(f"Expected one local Wrangler D1 file, found {len(matches)}")
    connection = sqlite3.connect(f"file:{matches[0]}?mode=ro", uri=True)
    size = connection.execute('SELECT COUNT(*) FROM "Order" WHERE id LIKE ?', (PREFIX + "order-%",)).fetchone()[0]

    def individual() -> tuple[int, ...]:
        return tuple(int(connection.execute(sql, params).fetchone()[0]) for _, sql, params in COUNT_SQL)

    def aggregate() -> tuple[int, ...]:
        values = connection.execute(AGGREGATE_SQL).fetchone()
        return tuple(int(value or 0) for value in values)

    before = individual()
    after = aggregate()
    if before != after:
        raise SystemExit(f"Count semantics differ: baseline={before}, aggregate={after}")

    samples = {"individual": {"wall": [], "process_cpu": []},
               "aggregate": {"wall": [], "process_cpu": []}}
    # Alternate order per iteration to limit cache/order bias between variants.
    variants = {"individual": individual, "aggregate": aggregate}
    for iteration in range(args.iterations):
        order = ("individual", "aggregate") if iteration % 2 == 0 else ("aggregate", "individual")
        for name in order:
            cpu_start, wall_start = time.process_time_ns(), time.perf_counter_ns()
            variants[name]()
            samples[name]["wall"].append((time.perf_counter_ns() - wall_start) / 1e6)
            samples[name]["process_cpu"].append((time.process_time_ns() - cpu_start) / 1e6)

    report = {
        "synthetic_orders": size,
        "iterations": args.iterations,
        "individual_queries_per_invocation": len(COUNT_SQL),
        "aggregate_queries_per_invocation": 1,
        "exact_result_parity": True,
        "individual": {metric: summary(values) for metric, values in samples["individual"].items()},
        "aggregate": {metric: summary(values) for metric, values in samples["aggregate"].items()},
        "query_plans": {
            name: connection.execute("EXPLAIN QUERY PLAN " + sql, params).fetchall()
            for name, sql, params in COUNT_SQL
        },
        "aggregate_plan": connection.execute("EXPLAIN QUERY PLAN " + AGGREGATE_SQL).fetchall(),
        "metric_scope": "SQLite/Miniflare local process; not Cloudflare Worker CPU or D1 Analytics rows_read",
    }
    print(json.dumps(report, indent=2))
    connection.close()


if __name__ == "__main__":
    main()
