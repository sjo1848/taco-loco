#!/usr/bin/env python3
"""Seed synthetic orders into Wrangler's isolated local D1 SQLite store.

This helper refuses paths outside /tmp/tl-s7d-* and only removes rows carrying
the perf-s7d synthetic ID prefix. It never accepts a remote database target.
"""
from __future__ import annotations

import argparse
import datetime as dt
import glob
import hashlib
import pathlib
import sqlite3

PREFIX = "perf-s7d-"
SESSION_TOKEN = "local-only-perf-session-not-a-secret"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--persist-to", required=True)
    parser.add_argument("--size", type=int, choices=(100, 1000, 10000), required=True)
    args = parser.parse_args()
    persist = pathlib.Path(args.persist_to).resolve()
    if not str(persist).startswith("/tmp/tl-s7d-"):
        raise SystemExit("Refusing to seed outside an isolated /tmp/tl-s7d-* directory")
    matches = [p for p in glob.glob(str(persist / "v3/d1/miniflare-D1DatabaseObject/*.sqlite"))
               if not p.endswith("/metadata.sqlite")]
    if len(matches) != 1:
        raise SystemExit(f"Expected one local Wrangler D1 file, found {len(matches)}")

    connection = sqlite3.connect(matches[0], timeout=20)
    connection.execute("PRAGMA foreign_keys=OFF")
    now = dt.datetime.now(dt.timezone.utc)
    now_iso = now.isoformat(timespec="milliseconds").replace("+00:00", "Z")
    connection.execute('DELETE FROM OrderEvent WHERE id LIKE ?', (PREFIX + "%",))
    connection.execute('DELETE FROM OrderLine WHERE id LIKE ?', (PREFIX + "%",))
    connection.execute('DELETE FROM "Order" WHERE id LIKE ?', (PREFIX + "%",))
    connection.execute("DELETE FROM Session WHERE id=?", (PREFIX + "session",))
    connection.execute("DELETE FROM AdminUser WHERE id=?", (PREFIX + "admin",))

    admin_id = PREFIX + "admin"
    connection.execute(
        'INSERT INTO AdminUser(id,email,passwordHash,active,createdAt,updatedAt) VALUES(?,?,?,?,?,?)',
        (admin_id, "perf-s7d-local@example.invalid", "unused-local-only", 1, now_iso, now_iso),
    )
    connection.execute(
        "INSERT INTO Session(id,tokenHash,userId,expiresAt,createdAt) VALUES(?,?,?,?,?)",
        (PREFIX + "session", hashlib.sha256(SESSION_TOKEN.encode()).hexdigest(), admin_id,
         (now + dt.timedelta(days=1)).isoformat().replace("+00:00", "Z"), now_iso),
    )

    orders, lines, events = [], [], []
    for number in range(1, args.size + 1):
        remainder = number % 20
        status = ("RECEIVED" if remainder in (0, 1, 2) else "CONFIRMED" if remainder == 3
                 else "IN_PREPARATION" if remainder == 4 else "READY" if remainder == 5 else "DELIVERED")
        pending = number % 37 == 0
        created = (now - dt.timedelta(seconds=(args.size - number) * 60)).isoformat(
            timespec="milliseconds").replace("+00:00", "Z")
        order_id = f"{PREFIX}order-{number:05d}"
        orders.append((
            order_id, number, status, "PICKUP", "PUBLIC_MENU", f"Synthetic {number}", None, None, None,
            1000, 0, 1000, None, None, None, created, created, None, None, None,
            "PENDING" if pending else "VERIFIED", None, "REPORTED" if pending else "NOT_REQUIRED",
            None, None, "NOT_REQUIRED", None, None, None, None, None, 0, None, None, None,
        ))
        lines.append((f"{PREFIX}line-{number:05d}", order_id, None, f"Synthetic product {number % 31}",
                      1000, 1, None, None, created))
        events.append((f"{PREFIX}event-{number:05d}", number, order_id, None, status,
                       "synthetic fixture", "ORDER_CREATED", created, None))

    connection.executemany(
        '''INSERT INTO "Order"(id,orderNumber,status,fulfillment,source,customerName,customerPhone,tableLabel,
        notes,subtotalAmount,adjustmentAmount,totalAmount,cancellationReason,confirmedAt,closedAt,createdAt,
        updatedAt,clientReference,createdById,updatedById,verificationStatus,verificationResolvedAt,paymentStatus,
        paymentReportedAt,paymentConfirmedAt,refundStatus,refundRequiredAt,refundedAt,noShowAt,deliveryAddress,
        deliveryReference,deliveryFeeAmount,transferHolderName,publicTrackingToken,customerId)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''', orders)
    connection.executemany(
        "INSERT INTO OrderLine(id,orderId,productId,productName,unitPriceAmount,quantity,modifiersSnapshot,note,createdAt) VALUES(?,?,?,?,?,?,?,?,?)",
        lines,
    )
    connection.executemany(
        "INSERT INTO OrderEvent(id,sequence,orderId,fromStatus,toStatus,reason,kind,createdAt,actorId) VALUES(?,?,?,?,?,?,?,?,?)",
        events,
    )
    connection.commit()
    actual = connection.execute('SELECT COUNT(*) FROM "Order" WHERE id LIKE ?', (PREFIX + "%",)).fetchone()[0]
    print(f"Seeded {actual} synthetic orders, lines, and events in isolated local D1")
    connection.close()


if __name__ == "__main__":
    main()
