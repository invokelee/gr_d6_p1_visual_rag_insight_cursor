import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { devApiPlugin } from "./dev-server/dev-api-plugin";

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 8753,
    strictPort: true,
    host: true,
  },
});
