import { test, expect, type Page } from "@playwright/test"

// Runs against a real deployment. Provide BASE_URL + E2E_USER + E2E_PASS (a
// telecaller/manager with team view). Without them the suite skips.
const { BASE_URL, E2E_USER, E2E_PASS } = process.env
const READY = Boolean(BASE_URL && E2E_USER && E2E_PASS)

async function login(page: Page) {
  await page.goto("/login")
  await page.fill("#username", E2E_USER!)
  await page.fill("#password", E2E_PASS!)
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 })
}

test.describe("Lost tab — employee breakdown + SAP cross-check", () => {
  test.skip(!READY, "Set BASE_URL, E2E_USER, E2E_PASS to run this suite")

  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto("/?view=pipeline&ptab=lost")
    await page.getByRole("button", { name: /^Lost/ }).first().click().catch(() => {})
  })

  test("LOST-01 · shows the 'Leads lost by sales employee' breakdown", async ({ page }) => {
    await expect(page.getByText(/Leads lost by sales employee/i)).toBeVisible({ timeout: 15_000 })
    // The 'All · N' card is always present when there are lost leads.
    await expect(page.getByRole("button", { name: /All · \d+/ })).toBeVisible()
  })

  test("LOST-02 · runs the SAP cross-check and shows a badge or verdict", async ({ page }) => {
    // Either every lead matches SAP, or the header flags mismatches, or the
    // Re-check control is present — any proves the SAP cross-check wired up.
    const anySignal = page
      .getByText(/All match SAP|not Lost in SAP|Re-check SAP|SAP: /i)
      .first()
    await expect(anySignal).toBeVisible({ timeout: 20_000 })
  })
})
