import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { cdnAdapter } from "@vinext/cloudflare/cache/cdn-adapter";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";
import path from "node:path";

export default defineConfig({
  plugins: [
    vinext({
      cache: { cdn: cdnAdapter() },
      images: { optimizer: imagesOptimizer() },
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
      "@/modules/media/pipeline": path.resolve(
        import.meta.dirname,
        "src/modules/media/pipeline.worker.ts",
      ),
      "@/modules/media/storage": path.resolve(
        import.meta.dirname,
        "src/modules/media/storage.worker.ts",
      ),
    },
  },
});
