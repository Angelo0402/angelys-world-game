import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built game also works from a Capacitor WebView (file://).
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 41731,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 41732,
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
