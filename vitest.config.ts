import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["api/_lib/__tests__/**/*.test.ts"],
    globals: false,
  },
});
