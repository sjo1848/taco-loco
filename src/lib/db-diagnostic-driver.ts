import type { PrismaD1 } from "@prisma/adapter-d1";

/** Temporary staging-only boundaries around Prisma's D1 adapter. No SQL or arguments are logged. */
export function instrumentD1Adapter(adapter: PrismaD1, emit: (stage: string) => void): PrismaD1 {
  const originalConnect = adapter.connect.bind(adapter);
  adapter.connect = async () => {
    emit("d1.adapter_connect.started");
    let connection;
    try {
      connection = await originalConnect();
      emit("d1.adapter_connect.completed");
    } catch (error) {
      emit("d1.adapter_connect.failed");
      throw error;
    }
    const originalQueryRaw = connection.queryRaw.bind(connection);
    connection.queryRaw = async (query) => {
      emit("d1.adapter_query_raw.started");
      try {
        const result = await originalQueryRaw(query);
        emit("d1.adapter_query_raw.completed");
        return result;
      } catch (error) {
        emit("d1.adapter_query_raw.failed");
        throw error;
      }
    };
    return connection;
  };
  return adapter;
}
