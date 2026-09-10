import { describe, it, expect } from "vitest"
import { qualificationSchema, qualificationDefaults } from "@/lib/schemas/qualification"

const validQualification = {
  phoneVerified: true as const,
  decisionMaker: "self",
  dentistType: "general_practitioner",
  practiceType: "solo_practice",
  timeline: "3_months",
  budgetRange: "5-10L",
  competitors: "None",
  fundingMethod: "cash",
  purchaseType: "new_setup",
  route: "online_meeting",
}

describe("qualificationSchema", () => {
  it("parses a fully-filled qualification bar", () => {
    const parsed = qualificationSchema.parse(validQualification)
    expect(parsed.phoneVerified).toBe(true)
    expect(parsed.route).toBe("online_meeting")
  })

  it("requires phoneVerified to be the literal true", () => {
    const res = qualificationSchema.safeParse({ ...validQualification, phoneVerified: false })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "phoneVerified")
      expect(issue?.message).toBe("Confirm the phone was verified")
    }
  })

  it("trims the decision maker and rejects an all-whitespace value", () => {
    const res = qualificationSchema.safeParse({ ...validQualification, decisionMaker: "   " })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "decisionMaker")
      expect(issue?.message).toBe("Decision maker is required")
    }
  })

  it("flags every empty select field", () => {
    const res = qualificationSchema.safeParse({
      phoneVerified: true,
      decisionMaker: "",
      dentistType: "",
      practiceType: "",
      timeline: "",
      budgetRange: "",
      competitors: "",
      fundingMethod: "",
      purchaseType: "",
      route: "",
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      const paths = new Set(res.error.issues.map((i) => i.path[0]))
      for (const field of [
        "decisionMaker",
        "dentistType",
        "practiceType",
        "timeline",
        "budgetRange",
        "competitors",
        "fundingMethod",
        "purchaseType",
        "route",
      ]) {
        expect(paths.has(field)).toBe(true)
      }
    }
  })

  it("has defaults that fail (all selects blank) but keep phoneVerified true", () => {
    expect(qualificationDefaults.phoneVerified).toBe(true)
    expect(qualificationSchema.safeParse(qualificationDefaults).success).toBe(false)
  })
})
