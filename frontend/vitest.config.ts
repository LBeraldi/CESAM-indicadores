import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": frontendRoot,
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
    clearMocks: true,
  },
});
