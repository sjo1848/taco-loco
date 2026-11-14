import { AppError } from "@/lib/errors";
import { getActiveAdminSessionHash, isAdminSessionHashActive } from "@/modules/auth/session";
import { orderRepository } from "@/modules/orders/repository";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 2_000;
const SESSION_RECHECK_MS = 10_000;

type OrderSnapshot = {
  id: string;
  orderNumber: number;
  status: string;
  fulfillment: string;
  verificationStatus: string;
  paymentStatus: string;
  refundStatus: string;
  source: string;
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: number;
  createdAt: string;
  lines: unknown[];
};

function parseCursor(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return BigInt(0);
  try { return BigInt(value); } catch { return BigInt(0); }
}

function serializeOrder(order: Awaited<ReturnType<typeof orderRepository.findById>>): OrderSnapshot {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    fulfillment: order.fulfillment,
    verificationStatus: order.verificationStatus,
    paymentStatus: order.paymentStatus,
    refundStatus: order.refundStatus,
    source: order.source,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt.toISOString(),
    lines: order.lines,
  };
}

function sseEvent(event: string, data: unknown, id?: bigint) {
  const idLine = id === undefined ? "" : `id: ${id.toString()}\n`;
  return `${idLine}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: Request) {
  let sessionHash: string | null;
  try {
    sessionHash = await getActiveAdminSessionHash();
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
  if (!sessionHash) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const requestedCursor = request.headers.get("last-event-id") ?? url.searchParams.get("after");
  let cursor: bigint;
  try { cursor = requestedCursor === null ? await orderRepository.latestEventSequence() : parseCursor(requestedCursor); }
  catch { return new Response("Internal Server Error", { status: 500 }); }
  const encoder = new TextEncoder();
  let stopStream = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let lastSent = cursor;
      let lastSessionCheck = Date.now();
      const heartbeat = setInterval(() => {
        if (!closed) {
          try { controller.enqueue(encoder.encode(": heartbeat\n\n")); }
          catch { stopStream(); }
        }
      }, 15000);

      const stop = () => {
        if (closed) return false;
        closed = true;
        clearInterval(heartbeat);
        request.signal.removeEventListener("abort", stopStream);
        return true;
      };
      const close = (error?: unknown) => {
        if (!stop()) return;
        try {
          if (error) controller.error(error);
          else controller.close();
        } catch {
          // The client may have canceled the stream while an awaited D1 read
          // was still in flight.
        }
      };
      stopStream = () => { stop(); };
      request.signal.addEventListener("abort", stopStream, { once: true });
      if (request.signal.aborted) stopStream();
      if (closed) return;

      const ensureSession = async () => {
        if (closed) return false;
        if (await isAdminSessionHashActive(sessionHash)) {
          lastSessionCheck = Date.now();
          return !closed;
        }
        if (!closed) {
          controller.enqueue(encoder.encode(sseEvent("session-expired", {})));
          close();
        }
        return false;
      };

      const sendNotification = async (notification: { sequence: bigint; orderId: string }) => {
        if (closed) return;
        const sequence = notification.sequence;
        if (sequence <= lastSent) return;
        try {
          const order = await orderRepository.findById(notification.orderId);
          if (!await ensureSession()) return;
          if (!closed) controller.enqueue(encoder.encode(sseEvent("order", { order: serializeOrder(order) }, sequence)));
        } catch (error) {
          if (!(error instanceof AppError && error.code === "ORDER_NOT_FOUND")) throw error;
        }
        lastSent = sequence;
      };

      const pump = async () => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode("retry: 3000\n\n"));
          if (!await ensureSession()) return;
          const replay = await orderRepository.eventsAfter(cursor);
          for (const event of replay) await sendNotification(event);
          while (!closed) {
            if (Date.now() - lastSessionCheck >= SESSION_RECHECK_MS && !await ensureSession()) break;
            const events = await orderRepository.eventsAfter(lastSent, 100);
            for (const event of events) await sendNotification(event);
            await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          }
        } catch (error) {
          close(error);
        }
      };

      // Keep the stream's start algorithm synchronous. Awaiting this perpetual
      // polling loop here leaves the start promise pending for the lifetime of
      // the connection; Workers may interpret that as a request that can never
      // produce a response and cancel it. The response body itself keeps the
      // stream alive, while this handled task pumps events until disconnect.
      queueMicrotask(() => { void pump(); });
    },
    cancel() { stopStream(); },
  });

  return new Response(stream, { headers: {
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream; charset=utf-8",
    "X-Accel-Buffering": "no",
  } });
}
