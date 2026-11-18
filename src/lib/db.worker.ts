import { env } from "cloudflare:workers";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@/generated/d1/wasm";
import compilerRuntime from "@/generated/d1/query_compiler_bg.js";
import compilerModule from "@/generated/d1/query_compiler_bg.wasm?module";
import { instrumentD1Adapter } from "./db-diagnostic-driver";

const logInit = (stage: string) => {
  if (process.env.ADMIN_QUERY_DIAGNOSTICS === "true") {
    console.info(JSON.stringify({ event: "admin_db_initialization", stage }));
  }
};

logInit("d1.adapter_construct.started");
const adapter = new PrismaD1(env.DB);
logInit("d1.adapter_construct.completed");
if (process.env.ADMIN_QUERY_DIAGNOSTICS === "true") instrumentD1Adapter(adapter, logInit);

logInit("d1.prisma_client_construct.started");
export const db = new PrismaClient({
  adapter,
  __internal: {
    configOverride: (config: Record<string, unknown>) => ({
      ...config,
      compilerWasm: {
        getRuntime: async () => compilerRuntime,
        getQueryCompilerWasmModule: async () => compilerModule,
      },
    }),
  } as never,
});
logInit("d1.prisma_client_construct.completed");
