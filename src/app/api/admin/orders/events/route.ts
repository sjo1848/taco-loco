import { AppError } from "@/lib/errors";
import { requireAdmin } from "@/modules/auth/session";
import { orderEventHub, type OrderEventNotification } from "@/modules/orders/live-events";
import { orderRepository } from "@/modules/orders/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OrderSnapshot = {
  id: string;
  orderNumber: number;
  status: string;
  fulfillment: string;
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
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return new Response("Unauthorized", { status: 401 });
    return new Response("Internal Server Error", { status: 500 });
  }

  const url = new URL(request.url);
  const cursor = parseCursor(request.headers.get("last-event-id") ?? url.searchParams.get("after"));
  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let replaying = true;
      let lastSent = cursor;
      let deliveryChain = Promise.resolve();
      const pending = new Map<string, OrderEventNotification>();
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 15000);

      const close = (error?: unknown) => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        cleanup?.();
        if (error) controller.error(error);
        else controller.close();
      };

      const sendNotification = async (notification: OrderEventNotification) => {
        if (closed) return;
        let sequence: bigint;
        try { sequence = BigInt(notification.sequence); } catch { return; }
        if (sequence <= lastSent) return;
        try {
          const order = await orderRepository.findById(notification.orderId);
          if (!closed) controller.enqueue(encoder.encode(sseEvent("order", { order: serializeOrder(order) }, sequence)));
        } catch (error) {
          if (!(error instanceof AppError && error.code === "ORDER_NOT_FOUND")) throw error;
        }
        lastSent = sequence;
      };

      const listener = (notification: OrderEventNotification) => {
        if (replaying) pending.set(notification.sequence, notification);
        else {
          deliveryChain = deliveryChain.then(() => sendNotification(notification)).catch(close);
        }
      };

      try {
        controller.enqueue(encoder.encode("retry: 3000\n\n"));
        cleanup = await orderEventHub.subscribe(listener);
        const replay = await orderRepository.eventsAfter(cursor);
        for (const event of replay) await sendNotification({ sequence: event.sequence.toString(), orderId: event.orderId });
        while (pending.size > 0) {
          const queued = [...pending.values()].sort((left, right) => {
            const leftSequence = BigInt(left.sequence);
            const rightSequence = BigInt(right.sequence);
            return leftSequence === rightSequence ? 0 : leftSequence < rightSequence ? -1 : 1;
          });
          pending.clear();
          for (const notification of queued) await sendNotification(notification);
        }
        replaying = false;
      } catch (error) {
        close(error);
      }

      request.signal.addEventListener("abort", () => close(), { once: true });
    },
    cancel() { cleanup?.(); },
  });

  return new Response(stream, { headers: {
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream; charset=utf-8",
    "X-Accel-Buffering": "no",
  } });
}
