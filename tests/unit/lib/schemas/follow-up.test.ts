import { describe, it, expect } from "vitest"
import { followUpCompleteSchema, OBJECTION_TYPES } from "@/lib/schemas/follow-up"

describe("followUpCompleteSchema", () => {
  it("parses a valid follow-up completion", () => {
    const parsed = followUpCompleteSchema.parse({
      objectionType: "price",
      nextActionDate: "2026-10-01",
      notes: "call back after budget approval",
    })
    expect(parsed.objectionType).toBe("price")
    expect(parsed.nextActionDate).toBe("2026-10-01")
  })

  it("treats notes as optional", () => {
    const res = followUpCompleteSchema.safeParse({
      objectionType: "timing",
      nextActionDate: "2026-10-01",
    })
    expect(res.success).toBe(true)
  })

  it("rejects an objection type outside the enum", () => {
    const res = followUpCompleteSchema.safeParse({
      objectionType: "weather",
      nextActionDate: "2026-10-01",
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path[0] === "objectionType")).toBe(true)
    }
  })

  it("rejects an empty next action date on the right field", () => {
    const res = followUpCompleteSchema.safeParse({
      objectionType: "budget",
      nextActionDate: "",
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "nextActionDate")
      expect(issue?.message).toBe("Next action date is required")
    }
  })

  it("accepts every enumerated objection type", () => {
    for (const opt of OBJECTION_TYPES) {
      const res = followUpCompleteSchema.safeParse({
        objectionType: opt.value,
        nextActionDate: "2026-10-01",
      })
      expect(res.success).toBe(true)
    }
  })
})
