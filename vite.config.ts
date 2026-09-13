import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { cdnAdapter } from "@vinext/cloudflare/cache/cdn-adapter";
import path from "node:path";

export default defineConfig({
  plugins: [
    vinext({
      cache: { cdn: cdnAdapter() },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@/lib/db": path.resolve(
        import.meta.dirname,
        "src/lib/db.worker.ts",
      ),
      "@/lib/runtime": path.resolve(
        import.meta.dirname,
        "src/lib/runtime.worker.ts",
      ),
    },
  },
});
