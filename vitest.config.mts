import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    exclude: ["e2e/**", "node_modules/**"],
  },
  resolve: {
    alias: {
      "@": __dirname,
    },
  },
});
