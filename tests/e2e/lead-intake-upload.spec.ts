import { test, expect, type Page } from "@playwright/test"

// Real-deployment e2e for the bulk lead-intake-upload flow. Provide:
//   BASE_URL   — the deployed app URL
//   E2E_USER   — a telecaller/manager/admin username (must see the Upload Queue)
//   E2E_PASS   — that user's password
// e.g.  BASE_URL=https://telecaller-staging E2E_USER=neha E2E_PASS=... npm run e2e -- lead-intake-upload
//
// Self-contained: it downloads the app's own template (which carries one sample row),
// re-uploads it, verifies the sample lands in the queue pre-filled, then discards it so
// the run leaves no residue. Skips entirely until the envs are set (keeps CI green).
const { BASE_URL, E2E_USER, E2E_PASS } = process.env
const READY = Boolean(BASE_URL && E2E_USER && E2E_PASS)
const SAMPLE = "Dr. Ramesh Sharma"

async function login(page: Page) {
  await page.goto("/login")
  await page.fill("#username", E2E_USER!)
  await page.fill("#password", E2E_PASS!)
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 })
}

test.describe("Lead intake upload (needs BASE_URL + creds)", () => {
  test.skip(!READY, "Set BASE_URL, E2E_USER, E2E_PASS to run the intake-upload suite")

  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto("/?view=upload-queue")
    await expect(page.getByText(/Upload leads/i)).toBeVisible({ timeout: 15_000 })
  })

  test("INTAKE-01 · upload the template → row queues pre-filled → discard", async ({ page }) => {
    // 1) Download the template the app ships (carries the sample row).
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /template/i }).click(),
    ])
    const templatePath = await download.path()
    expect(templatePath).toBeTruthy()

    // 2) Re-upload it via the hidden file input.
    await page.locator('input[type="file"]').setInputFiles(templatePath!)

    // 3) The upload summary confirms rows were added, and the sample shows in the queue.
    await expect(page.getByText(/added to the queue/i)).toBeVisible({ timeout: 15_000 })
    const row = page.locator("div.rounded-lg.border").filter({ hasText: SAMPLE }).first()
    await expect(row).toBeVisible({ timeout: 10_000 })

    // 4) Call & enter opens the entry form PRE-FILLED — nothing is created yet.
    await row.getByRole("button", { name: /call & enter/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByDisplayValue(SAMPLE)).toBeVisible()
    await expect(dialog.getByDisplayValue("9876543210")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()

    // 5) Discard the sample row so the run is self-cleaning.
    await row.getByRole("button", { name: /discard/i }).click()
    await expect(page.locator("div.rounded-lg.border").filter({ hasText: SAMPLE })).toHaveCount(0, {
      timeout: 10_000,
    })
  })
})
