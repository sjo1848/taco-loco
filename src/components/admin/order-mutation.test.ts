import { expect, it, vi } from "vitest";
import { readPersistedOrder, sendOrderMutation } from "./order-mutation";

let id = 0;
const nextPath = () => "/api/admin/orders/test-" + ++id;
const snapshot = (status: string) => ({ id: "test-" + id, status, verificationStatus: "VERIFIED",
  paymentStatus: "NOT_REQUIRED", refundStatus: "NOT_REQUIRED", createdAt: "2026-11-22T00:00:00Z",
  orderNumber: 1, fulfillment: "PICKUP", totalAmount: 1200, lines: [] });
const payload = { toStatus: "DELIVERED" };

it("reads the committed state after a lost response without sending a second PATCH", async () => {
  const path = nextPath();
  const request = vi.fn().mockRejectedValueOnce(new DOMException("Timed out", "TimeoutError"))
    .mockResolvedValueOnce(Response.json(snapshot("DELIVERED")));
  await expect(sendOrderMutation(path, payload, request)).resolves.toEqual({
    kind: "persisted", order: snapshot("DELIVERED"),
  });
  expect(request.mock.calls.map(([, init]) => init.method ?? "GET")).toEqual(["PATCH", "GET"]);
});

it("reads the unchanged state after a server error and does not retry the write", async () => {
  const path = nextPath();
  const request = vi.fn().mockResolvedValueOnce(new Response("Gateway failure", { status: 500 }))
    .mockResolvedValueOnce(Response.json(snapshot("READY")));
  await expect(sendOrderMutation(path, payload, request)).resolves.toEqual({
    kind: "persisted", order: snapshot("READY"),
  });
  expect(request).toHaveBeenCalledTimes(2);
});

it("reports unknown while reconciliation is unavailable and supports a read-only recovery", async () => {
  const path = nextPath();
  const request = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(Response.json(snapshot("DELIVERED")));
  await expect(sendOrderMutation(path, payload, request)).resolves.toEqual({ kind: "unknown" });
  await expect(readPersistedOrder(path, request)).resolves.toMatchObject({ kind: "persisted" });
  expect(request.mock.calls.map(([, init]) => init.method ?? "GET")).toEqual(["PATCH", "GET", "GET"]);
});


it("reconciles a nominal success response missing the requested order fields", async () => {
  const path = nextPath();
  const request = vi.fn().mockResolvedValueOnce(Response.json({ status: "DELIVERED" }))
    .mockResolvedValueOnce(Response.json(snapshot("DELIVERED")));
  await expect(sendOrderMutation(path, payload, request)).resolves.toEqual({
    kind: "persisted", order: snapshot("DELIVERED"),
  });
});


it("keeps a delayed commit read-only even when the caller remounts", async () => {
  const path = nextPath();
  const request = vi.fn().mockRejectedValueOnce(new Error("timeout"))
    .mockResolvedValueOnce(Response.json(snapshot("READY")))
    .mockResolvedValueOnce(Response.json(snapshot("DELIVERED")));
  await expect(sendOrderMutation(path, payload, request)).resolves.toMatchObject({ order: { status: "READY" } });
  await expect(sendOrderMutation(path, payload, request)).resolves.toMatchObject({ order: { status: "DELIVERED" } });
  expect(request.mock.calls.map(([, init]) => init.method ?? "GET")).toEqual(["PATCH", "GET", "GET"]);
});
