import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"

const rootDir = fileURLToPath(new URL(".", import.meta.url)).replace(/[\\/]$/, "")

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": rootDir },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "out", "tests/e2e/**"],
    environmentOptions: {
      jsdom: { url: "https://telecaller.chesadentalcare.com/" },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: [
        "lib/**/*.{ts,tsx}",
        "hooks/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "app/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/*.test.*",
        "**/*.d.ts",
        "lib/mocks/**",
        "tests/**",
        ".next/**",
        "node_modules/**",
        "**/*.config.*",
      ],
      thresholds: {
        statements: 10,
        branches: 73,
        functions: 52,
        lines: 10,
      },
    },
  },
})
