import { describe, expect, it, vi } from "vitest";
import type { PrismaD1 } from "@prisma/adapter-d1";
import { instrumentD1Adapter } from "./db-diagnostic-driver";

const makeAdapter = (queryRaw: (...args: unknown[]) => Promise<unknown>) => ({
  connect: vi.fn(async () => ({ queryRaw, marker: "same-connection" })),
}) as unknown as PrismaD1;

describe("bounded D1 adapter diagnostics", () => {
  it("logs connection and driver query boundaries without logging SQL or arguments", async () => {
    const result = { columnNames: ["synthetic"], columnTypes: [0], rows: [] };
    const queryRaw = vi.fn(async () => result);
    const adapter = makeAdapter(queryRaw);
    const emitted: string[] = [];
    instrumentD1Adapter(adapter, (stage) => emitted.push(stage));
    const connection = await adapter.connect();
    const query = { sql: "private synthetic query", args: ["private argument"], argTypes: [] };
    expect(await connection.queryRaw(query)).toBe(result);
    expect(emitted).toEqual(["d1.adapter_connect.started", "d1.adapter_connect.completed", "d1.adapter_query_raw.started", "d1.adapter_query_raw.completed"]);
    expect(emitted.join(" ")).not.toContain("private");
    expect(queryRaw).toHaveBeenCalledWith(query);
  });

  it("propagates async driver failures without retrying", async () => {
    const failure = new Error("private DB failure");
    const queryRaw = vi.fn(async () => { throw failure; });
    const emitted: string[] = [];
    const connection = await instrumentD1Adapter(makeAdapter(queryRaw), (stage) => emitted.push(stage)).connect();
    await expect(connection.queryRaw({ sql: "synthetic", args: [], argTypes: [] })).rejects.toBe(failure);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(emitted.at(-1)).toBe("d1.adapter_query_raw.failed");
    expect(emitted.join(" ")).not.toContain("private");
  });
});
