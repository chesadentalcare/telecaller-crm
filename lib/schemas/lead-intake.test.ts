import { describe, it, expect } from "vitest"
import { leadIntakeSchema, leadIntakeDefaults, STEP_FIELDS } from "@/lib/schemas/lead-intake"

const validLead = {
  leadName: "Dr. Asha Rao",
  phoneNumber: "9812345670",
  whatsappSameAsMobile: true,
  whatsappNumber: "",
  email: "asha@clinic.example",
  state: "Karnataka",
  city: "Bengaluru",
  pincode: "560001",
  address: "12 MG Road",
  equipmentInterest: "chair",
  source: "Facebook Paid",
  category: "premium",
  product1Id: "P1",
  product2Id: "",
  interestLevel: "warm",
  budget: "5-10L",
  expectedBy: "2026-10-01",
}

describe("leadIntakeSchema", () => {
  it("parses a valid intake with whatsapp same as mobile", () => {
    const parsed = leadIntakeSchema.parse(validLead)
    expect(parsed.leadName).toBe("Dr. Asha Rao")
    expect(parsed.product2Id).toBe("")
  })

  it("accepts an empty email (union with literal empty string)", () => {
    const res = leadIntakeSchema.safeParse({ ...validLead, email: "" })
    expect(res.success).toBe(true)
  })

  it("rejects a malformed email", () => {
    const res = leadIntakeSchema.safeParse({ ...validLead, email: "not-an-email" })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path[0] === "email")).toBe(true)
    }
  })

  it("rejects a phone number that does not match the Indian mobile pattern", () => {
    const res = leadIntakeSchema.safeParse({ ...validLead, phoneNumber: "1234567890" })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "phoneNumber")
      expect(issue?.message).toBe("Enter a valid 10-digit mobile")
    }
  })

  it("rejects a pincode that starts with 0", () => {
    const res = leadIntakeSchema.safeParse({ ...validLead, pincode: "056001" })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path[0] === "pincode")).toBe(true)
    }
  })

  it("rejects a too-short lead name", () => {
    const res = leadIntakeSchema.safeParse({ ...validLead, leadName: "A" })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "leadName")
      expect(issue?.message).toBe("At least 2 characters")
    }
  })

  it("requires a valid separate whatsapp number when it differs from mobile", () => {
    const res = leadIntakeSchema.safeParse({
      ...validLead,
      whatsappSameAsMobile: false,
      whatsappNumber: "123",
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "whatsappNumber")
      expect(issue?.message).toBe("Enter a valid 10-digit number")
    }
  })

  it("accepts a valid separate whatsapp number", () => {
    const res = leadIntakeSchema.safeParse({
      ...validLead,
      whatsappSameAsMobile: false,
      whatsappNumber: "9898989898",
    })
    expect(res.success).toBe(true)
  })

  it("flags every required step-3 field when blank", () => {
    const res = leadIntakeSchema.safeParse({
      ...validLead,
      equipmentInterest: "",
      source: "",
      category: "",
      product1Id: "",
      interestLevel: "",
      budget: "",
      expectedBy: "",
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      const paths = new Set(res.error.issues.map((i) => i.path[0]))
      for (const f of STEP_FIELDS[3]) {
        if (f === "whatsappNumber" || f === "whatsappSameAsMobile") continue
        expect(paths.has(f)).toBe(true)
      }
    }
  })

  it("has defaults that fail validation out of the box", () => {
    expect(leadIntakeSchema.safeParse(leadIntakeDefaults).success).toBe(false)
  })
})
