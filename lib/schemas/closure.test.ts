import { describe, it, expect } from "vitest"
import {
  closureWonSchema,
  closureLostSchema,
  LOST_REASONS,
  PRICE_GAP_RANGES,
} from "@/lib/schemas/closure"

describe("closureWonSchema", () => {
  it("parses a valid won closure", () => {
    const parsed = closureWonSchema.parse({
      outcome: "won",
      dispatchDate: "2026-10-10",
      installationDate: "2026-10-20",
    })
    expect(parsed.outcome).toBe("won")
  })

  it("rejects an outcome that is not 'won'", () => {
    const res = closureWonSchema.safeParse({
      outcome: "lost",
      dispatchDate: "2026-10-10",
      installationDate: "2026-10-20",
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path[0] === "outcome")).toBe(true)
    }
  })

  it("requires dispatch and installation dates", () => {
    const res = closureWonSchema.safeParse({
      outcome: "won",
      dispatchDate: "",
      installationDate: "",
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      const paths = res.error.issues.map((i) => i.path[0])
      expect(paths).toContain("dispatchDate")
      expect(paths).toContain("installationDate")
    }
  })
})

describe("closureLostSchema", () => {
  it("parses a simple lost closure and defaults reactivationFlag to false", () => {
    const parsed = closureLostSchema.parse({
      outcome: "lost",
      lostReason: "timing",
    })
    expect(parsed.lostReason).toBe("timing")
    expect(parsed.reactivationFlag).toBe(false)
  })

  it("requires competitorName and priceGapRange when reason is competitor", () => {
    const res = closureLostSchema.safeParse({
      outcome: "lost",
      lostReason: "competitor",
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      const paths = res.error.issues.map((i) => i.path[0])
      expect(paths).toContain("competitorName")
      expect(paths).toContain("priceGapRange")
    }
  })

  it("requires competitorName and priceGapRange when reason is price", () => {
    const res = closureLostSchema.safeParse({
      outcome: "lost",
      lostReason: "price",
      competitorName: "   ",
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      const compIssue = res.error.issues.find((i) => i.path[0] === "competitorName")
      expect(compIssue?.message).toBe("Competitor name is required")
      expect(res.error.issues.some((i) => i.path[0] === "priceGapRange")).toBe(true)
    }
  })

  it("accepts a competitor loss with both conditional fields supplied", () => {
    const parsed = closureLostSchema.parse({
      outcome: "lost",
      lostReason: "competitor",
      competitorName: "Planmeca",
      priceGapRange: "10-20%",
      reactivationFlag: true,
    })
    expect(parsed.competitorName).toBe("Planmeca")
    expect(parsed.priceGapRange).toBe("10-20%")
    expect(parsed.reactivationFlag).toBe(true)
  })

  it("does not require conditional fields for non-price/competitor reasons", () => {
    const res = closureLostSchema.safeParse({
      outcome: "lost",
      lostReason: "no_response",
    })
    expect(res.success).toBe(true)
  })

  it("rejects a lost reason outside the enum", () => {
    const res = closureLostSchema.safeParse({
      outcome: "lost",
      lostReason: "moon_phase",
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path[0] === "lostReason")).toBe(true)
    }
  })

  it("accepts every enumerated lost reason (with conditional fields where needed)", () => {
    for (const reason of LOST_REASONS) {
      const base = { outcome: "lost" as const, lostReason: reason.value }
      const payload =
        reason.value === "competitor" || reason.value === "price"
          ? { ...base, competitorName: "Acme", priceGapRange: PRICE_GAP_RANGES[0].value }
          : base
      expect(closureLostSchema.safeParse(payload).success).toBe(true)
    }
  })
})
