import { AppError } from "@/lib/errors";
import { requireAdmin } from "@/modules/auth/session";
import { orderRepository } from "@/modules/orders/repository";

export const dynamic = "force-dynamic";

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
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let lastSent = cursor;
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 15000);

      const close = (error?: unknown) => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        if (error) controller.error(error);
        else controller.close();
      };

      const sendNotification = async (notification: { sequence: bigint; orderId: string }) => {
        if (closed) return;
        const sequence = notification.sequence;
        if (sequence <= lastSent) return;
        try {
          const order = await orderRepository.findById(notification.orderId);
          if (!closed) controller.enqueue(encoder.encode(sseEvent("order", { order: serializeOrder(order) }, sequence)));
        } catch (error) {
          if (!(error instanceof AppError && error.code === "ORDER_NOT_FOUND")) throw error;
        }
        lastSent = sequence;
      };

      try {
        controller.enqueue(encoder.encode("retry: 3000\n\n"));
        const replay = await orderRepository.eventsAfter(cursor);
        for (const event of replay) await sendNotification(event);
        while (!closed) {
          const events = await orderRepository.eventsAfter(lastSent);
          for (const event of events) await sendNotification(event);
          await new Promise<void>((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        close(error);
      }

      request.signal.addEventListener("abort", () => close(), { once: true });
    },
    cancel() {},
  });

  return new Response(stream, { headers: {
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream; charset=utf-8",
    "X-Accel-Buffering": "no",
  } });
}
