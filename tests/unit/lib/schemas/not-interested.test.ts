import { describe, it, expect } from "vitest"
import { NOT_INTERESTED_REASONS } from "@/lib/schemas/not-interested"

describe("NOT_INTERESTED_REASONS", () => {
  it("exposes exactly the three routing reasons", () => {
    expect(NOT_INTERESTED_REASONS.map((r) => r.value)).toEqual([
      "genuine_no",
      "timing_budget",
      "already_purchased",
    ])
  })

  it("gives every reason a non-empty label", () => {
    for (const reason of NOT_INTERESTED_REASONS) {
      expect(reason.label.length).toBeGreaterThan(0)
    }
  })

  it("has unique values", () => {
    const values = NOT_INTERESTED_REASONS.map((r) => r.value)
    expect(new Set(values).size).toBe(values.length)
  })
})
