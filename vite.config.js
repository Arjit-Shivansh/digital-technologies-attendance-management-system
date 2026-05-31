import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    allowedHosts: [".ngrok-free.dev", ".ngrok.io", "localhost"],
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
