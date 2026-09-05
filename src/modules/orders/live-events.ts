import { Client } from "pg";
import { PrismaClient } from "@prisma/client";

export const ORDER_EVENTS_CHANNEL = "taco_loco_order_events";

export type OrderEventNotification = {
  sequence: string;
  orderId: string;
};

export type OrderEventListener = (notification: OrderEventNotification) => void;

export async function publishOrderEvent(tx: Pick<PrismaClient, "$executeRaw">, event: { sequence: bigint; orderId: string }) {
  const notification: OrderEventNotification = { sequence: event.sequence.toString(), orderId: event.orderId };
  await tx.$executeRaw`SELECT pg_notify('taco_loco_order_events', ${JSON.stringify(notification)})`;
}

class OrderEventHub {
  private client: Client | null = null;
  private connecting: Promise<void> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000;
  private readonly listeners = new Set<OrderEventListener>();

  async subscribe(listener: OrderEventListener) {
    this.listeners.add(listener);
    try {
      await this.ensureConnected();
    } catch (error) {
      this.listeners.delete(listener);
      this.scheduleReconnect();
      throw error;
    }
    return () => { this.listeners.delete(listener); };
  }

  private async ensureConnected() {
    if (this.client || this.connecting) return this.connecting;
    this.connecting = this.connect();
    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private async connect() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    client.on("notification", (message) => {
      if (message.channel !== ORDER_EVENTS_CHANNEL || !message.payload) return;
      try {
        const parsed = JSON.parse(message.payload) as Partial<OrderEventNotification>;
        if (typeof parsed.sequence !== "string" || typeof parsed.orderId !== "string") return;
        for (const listener of this.listeners) listener({ sequence: parsed.sequence, orderId: parsed.orderId });
      } catch {
        // A malformed notification is ignored; persisted events remain recoverable by cursor.
      }
    });
    const disconnected = () => {
      if (this.client !== client) return;
      this.client = null;
      this.scheduleReconnect();
    };
    client.on("error", disconnected);
    client.on("end", disconnected);
    await client.connect();
    await client.query(`LISTEN ${ORDER_EVENTS_CHANNEL}`);
    this.client = client;
    this.reconnectDelay = 1000;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.listeners.size === 0) return;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.listeners.size === 0) return;
      void this.ensureConnected().catch(() => this.scheduleReconnect());
    }, delay);
  }
}

const globalForOrderEvents = globalThis as unknown as { orderEventHub?: OrderEventHub };
export const orderEventHub = globalForOrderEvents.orderEventHub ?? new OrderEventHub();
if (process.env.NODE_ENV !== "production") globalForOrderEvents.orderEventHub = orderEventHub;
