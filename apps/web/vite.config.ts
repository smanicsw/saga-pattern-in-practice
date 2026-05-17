import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/order": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/order/, "/api/v1/order"),
      },
      "/api/inventory": {
        target: "http://localhost:3003",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/inventory/, "/api/v1/inventory"),
      },
    },
  },
});
