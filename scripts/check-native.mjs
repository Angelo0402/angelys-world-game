import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

try {
  require("rolldown");
  console.log("Rolldown native binding OK");
} catch (error) {
  console.error(`Missing Vite/Rolldown native binding: ${error instanceof Error ? error.message : error}`);
  console.error("Do not copy node_modules between machines. Run: rm -rf node_modules && npm ci");
  process.exit(1);
}
