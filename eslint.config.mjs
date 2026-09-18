import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores(["src/generated/**", ".next/**", ".playwright-cli/**", "output/**", "node_modules/**", "dist/**", "**/.wrangler/**", "src/types/wasm.d.ts"]),
  { rules: { "@next/next/no-duplicate-head": "off" } },
]);
