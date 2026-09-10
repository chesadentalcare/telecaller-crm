import { test, expect } from "@playwright/test"

// No credentials needed — this suite only exercises /login, so it can run
// against any deployment as a cross-browser smoke test.
test.describe("Login page (no auth required)", () => {
  test("TC-03 · renders full-height with the Sign-in button in view (dvh fix)", async ({ page }) => {
    // Small iOS-ish viewport where the old 100vh (min-h-screen) pushed content
    // under Safari's toolbar. With min-h-dvh the card + button stay in view.
    await page.setViewportSize({ width: 390, height: 720 })

    const consoleErrors: string[] = []
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text())
    })

    await page.goto("/login")

    await expect(page.locator("#username")).toBeVisible()
    await expect(page.locator("#password")).toBeVisible()

    const signIn = page.getByRole("button", { name: /sign in/i })
    await expect(signIn).toBeVisible()
    // The whole shell fits the visual viewport — the button is reachable without
    // scrolling past a 100vh overflow.
    await expect(signIn).toBeInViewport()

    expect(consoleErrors, "login page should log no console errors").toEqual([])
  })

  test("GS-06 / DM-04(login) · Sign-in disables while submitting (no double-submit)", async ({ page }) => {
    // Hold the auth response open so we can observe the pending state
    // deterministically instead of racing a fast network.
    await page.route(/\/(login|auth|token)/i, async (route) => {
      await new Promise((r) => setTimeout(r, 1500))
      await route.continue()
    })

    await page.goto("/login")
    await page.fill("#username", "qa-pending-check")
    await page.fill("#password", "any-password")
    await page.getByRole("button", { name: /sign in/i }).click()

    // While in flight the label flips to "Signing in…" and the button is disabled.
    await expect(page.getByRole("button", { name: /signing in/i })).toBeDisabled()
  })
})
