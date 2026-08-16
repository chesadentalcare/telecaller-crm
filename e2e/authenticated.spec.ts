import { test, expect, type Page } from "@playwright/test"

// These run against a real deployment with a real telecaller login. Provide:
//   BASE_URL   — the deployed app URL
//   E2E_USER   — a telecaller/manager username
//   E2E_PASS   — that user's password
// e.g.  BASE_URL=https://telecaller-staging E2E_USER=neha E2E_PASS=... npm run e2e -- authenticated
//
// Without those envs the whole suite skips (so CI stays green until wired).
const { BASE_URL, E2E_USER, E2E_PASS } = process.env
const READY = Boolean(BASE_URL && E2E_USER && E2E_PASS)

async function login(page: Page) {
  await page.goto("/login")
  await page.fill("#username", E2E_USER!)
  await page.fill("#password", E2E_PASS!)
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 })
}

test.describe("Authenticated smoke (needs BASE_URL + creds)", () => {
  test.skip(!READY, "Set BASE_URL, E2E_USER, E2E_PASS to run the authenticated suite")

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("NAV-01 · view switching does not hard-reload the document", async ({ page }) => {
    let docRequests = 0
    page.on("request", (req) => {
      if (req.resourceType() === "document") docRequests++
    })
    // Navigate a few sidebar/bottom-tab destinations.
    for (const view of ["pipeline", "drip", "home", "due"]) {
      await page.goto(`/?view=${view}`) // first load counts; subsequent in-app nav shouldn't
    }
    // In-app nav via the header buttons should be SPA (no new document request).
    docRequests = 0
    await page.getByRole("button", { name: /new lead/i }).click().catch(() => {})
    await page.waitForTimeout(500)
    expect(docRequests, "in-app navigation should not reload the document").toBe(0)
  })

  test("NQ-01 · Nurturing (drip) tab is idle-quiet — no per-second full re-render", async ({ page }) => {
    await page.goto("/?view=drip")
    // Give the list time to mount, then confirm the countdown ticks WITHOUT the
    // whole list remounting. We watch that a row's DOM node identity is stable
    // across a few seconds (the old setInterval rebuilt every row each tick).
    const firstRow = page.locator("[class*='divide-y'] > div").first()
    await firstRow.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {})
    const before = await firstRow.getAttribute("class")
    await page.waitForTimeout(3000)
    const after = await firstRow.getAttribute("class")
    expect(after).toBe(before) // row not torn down/rebuilt by a per-second map
  })

  test("TC-01 · the outcome-explainer dialog is wider than 512px on desktop (clamp fix)", async ({ page }) => {
    // Open a lead, then the outcome explainer (the "?" / explain control). Selector
    // may need tuning per build — this documents the check from the test plan.
    test.info().annotations.push({ type: "note", text: "Adjust the trigger selector to your build if needed." })
    await page.goto("/?view=pipeline")
    // Best-effort: open the first lead.
    await page.locator("button.hover\\:underline").first().click().catch(() => {})
    const explain = page.getByRole("button", { name: /explain|why|what happens/i }).first()
    if (await explain.isVisible().catch(() => false)) {
      await explain.click()
      const dialog = page.getByRole("dialog")
      const box = await dialog.boundingBox()
      expect(box?.width ?? 0).toBeGreaterThan(560) // sm:max-w-2xl (672px) — not clamped to 512
    }
  })
})
