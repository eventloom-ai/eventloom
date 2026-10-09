import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "src/lib/tests/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, ".claude/**"],
  },
});
