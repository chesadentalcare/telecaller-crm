import { describe, it, expect } from "vitest"
import { SHOW_CLOSE_TODAY } from "@/lib/feature-flags"

describe("feature-flags", () => {
  it("SHOW_CLOSE_TODAY is disabled", () => {
    expect(SHOW_CLOSE_TODAY).toBe(false)
  })
})
