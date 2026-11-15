import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const nodeDb = globalForPrisma.prisma ?? new PrismaClient();

function lazyWorkerDb() {
  const clientPromise = import("./db.worker").then(({ db: workerDb }) => workerDb);
  const proxy = (path: string[]): unknown => new Proxy(() => undefined, {
    get(_target, property: string | symbol) {
      if (property === "then") return undefined;
      return proxy([...path, String(property)]);
    },
    apply(_target, _thisArg, args: unknown[]) {
      return clientPromise.then((client) => path.reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], client) as (...values: unknown[]) => unknown).then((method) => method(...args));
    },
  });
  return proxy([]) as PrismaClient;
}

export const db = "WebSocketPair" in globalThis ? lazyWorkerDb() : nodeDb;

/** Invoke Prisma's D1 raw-query tag with the real client as `this`.
 * The general lazy proxy delegates model calls lazily; tagged raw methods
 * require their Prisma client receiver and cannot be invoked through it.
 */
export async function queryD1Raw<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T> {
  const { db: workerDb } = await import("./db.worker");
  return workerDb.$queryRaw<T>(strings, ...values as never[]);
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
