import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const nodeDb = globalForPrisma.prisma ?? new PrismaClient();
type WorkerDb = typeof import("./db.worker")["db"];
let workerClientPromise: Promise<WorkerDb> | undefined;
let workerClientState: "pending" | "resolved" | "failed" | "not_started" = "not_started";

function lazyWorkerDb() {
  workerClientState = "pending";
  const clientPromise = import("./db.worker").then(
    ({ db: workerDb }) => { workerClientState = "resolved"; return workerDb; },
    (error) => { workerClientState = "failed"; throw error; },
  );
  workerClientPromise = clientPromise;
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

/** Observe the exact import promise used by the existing lazy worker proxy.
 * It starts when db.ts is evaluated; module evaluation constructs the adapter/client.
 */
export async function loadWorkerDbForDiagnostic(diagnostic: { run<T>(stage: string, operation: () => T | Promise<T>): Promise<T> }) {
  return diagnostic.run(`d1.worker_module_import_wait.${workerClientState}`, () => workerClientPromise ?? import("./db.worker").then(({ db: workerDb }) => workerDb));
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
