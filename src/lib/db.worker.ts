import { env } from "cloudflare:workers";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@/generated/d1/wasm";
import compilerRuntime from "@/generated/d1/query_compiler_bg.js";
import compilerModule from "@/generated/d1/query_compiler_bg.wasm?module";

const adapter = new PrismaD1(env.DB);

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
