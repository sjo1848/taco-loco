export type OrderEventNotification = {
  sequence: string;
  orderId: string;
};

export type OrderEventListener = (notification: OrderEventNotification) => void;

/**
 * D1 has no PostgreSQL LISTEN/NOTIFY equivalent. Event delivery is driven by
 * persisted cursor replay/polling, so this hook intentionally has no external
 * side effect. The event row is written in the same D1 batch as the mutation.
 */
export async function publishOrderEvent(_tx: unknown, _event: { sequence: bigint; orderId: string }) {
  void _tx;
  void _event;
  return undefined;
}

/** @deprecated The D1 path uses persisted cursor polling instead. */
export const orderEventHub = {
  async subscribe(_listener: OrderEventListener) {
    void _listener;
    return () => undefined;
  },
};
