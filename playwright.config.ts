import { defineConfig, devices } from "@playwright/test"

// Point this at a running deployment (staging/preview) — the app is a static
// export that talks to the real backend, so E2E runs against a deployed URL,
// not a local dev server:  BASE_URL=https://telecaller-staging.example npm run e2e
const BASE_URL = process.env.BASE_URL || "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // Chrome + Edge share the Blink engine; Safari (desktop + iOS) is WebKit —
  // the three engines the reps actually use. Run all with `npm run e2e`, or one
  // engine with `npm run e2e -- --project=webkit`.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    // Edge needs the msedge channel installed on the runner; drop this project
    // if it isn't available.
    { name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } },
    { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
  ],
})
