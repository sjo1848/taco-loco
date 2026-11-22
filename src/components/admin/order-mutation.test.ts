import { expect, it, vi } from "vitest";
import { readPersistedOrder, sendOrderMutation } from "./order-mutation";

const path = "/api/admin/orders/test";
const payload = { toStatus: "DELIVERED" };

it("reads the committed state after a lost response without sending a second PATCH", async () => {
  const request = vi.fn().mockRejectedValueOnce(new DOMException("Timed out", "TimeoutError"))
    .mockResolvedValueOnce(Response.json({ status: "DELIVERED" }));
  await expect(sendOrderMutation(path, payload, request)).resolves.toEqual({
    kind: "persisted", order: { status: "DELIVERED" },
  });
  expect(request.mock.calls.map(([, init]) => init.method ?? "GET")).toEqual(["PATCH", "GET"]);
});

it("reads the unchanged state after a server error and does not retry the write", async () => {
  const request = vi.fn().mockResolvedValueOnce(new Response("Gateway failure", { status: 500 }))
    .mockResolvedValueOnce(Response.json({ status: "READY" }));
  await expect(sendOrderMutation(path, payload, request)).resolves.toEqual({
    kind: "persisted", order: { status: "READY" },
  });
  expect(request).toHaveBeenCalledTimes(2);
});

it("reports unknown while reconciliation is unavailable and supports a read-only recovery", async () => {
  const request = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ status: "DELIVERED" }));
  await expect(sendOrderMutation(path, payload, request)).resolves.toEqual({ kind: "unknown" });
  await expect(readPersistedOrder(path, request)).resolves.toMatchObject({ kind: "persisted" });
  expect(request.mock.calls.map(([, init]) => init.method ?? "GET")).toEqual(["PATCH", "GET", "GET"]);
});
