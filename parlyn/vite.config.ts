import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname),
  base: "./",
  publicDir: resolve(__dirname, "../public"),
  server: {
    host: "0.0.0.0",
    port: 41741,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 41742,
  },
  resolve: {
    alias: {
      three: resolve(__dirname, "../node_modules/three"),
    },
  },
  build: {
    outDir: resolve(__dirname, "../parlyn-dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 3000,
  },
});
