import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"

// `@/...` alias mirrors tsconfig paths so tests import the same way app code does.
const rootDir = fileURLToPath(new URL(".", import.meta.url)).replace(/[\\/]$/, "")

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": rootDir },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "out", "e2e/**"],
  },
})
