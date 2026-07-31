import { defineConfig } from "vitest/config";
import path from "node:path";

// Vitest invece di Jest: stessa API di test, ma legge direttamente TypeScript
// e i path alias di tsconfig senza una catena di transform da configurare.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
