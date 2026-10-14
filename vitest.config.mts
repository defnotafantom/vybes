import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

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
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
