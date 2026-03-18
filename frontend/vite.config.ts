import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/transactions": {
        target: "http://localhost:5176",
        changeOrigin: true
      },
      "/projects": {
        target: "http://localhost:5176",
        changeOrigin: true
      },
      "/health": {
        target: "http://localhost:5176",
        changeOrigin: true
      }
    }
  }
})
