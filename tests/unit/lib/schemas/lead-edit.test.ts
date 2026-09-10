import { describe, it, expect } from "vitest"
import { leadEditSchema, INTEREST_LEVELS } from "@/lib/schemas/lead-edit"

describe("leadEditSchema", () => {
  it("parses an empty patch (every field optional)", () => {
    const res = leadEditSchema.safeParse({})
    expect(res.success).toBe(true)
  })

  it("parses a partial patch of just name and phone", () => {
    const parsed = leadEditSchema.parse({ name: "  Dr. Rao  ", phone: "9812345670" })
    expect(parsed.name).toBe("Dr. Rao")
    expect(parsed.phone).toBe("9812345670")
  })

  it("rejects an empty (whitespace) name", () => {
    const res = leadEditSchema.safeParse({ name: "   " })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "name")
      expect(issue?.message).toBe("Name can't be empty")
    }
  })

  it("rejects a too-short phone", () => {
    const res = leadEditSchema.safeParse({ phone: "123" })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "phone")
      expect(issue?.message).toBe("Enter a valid phone")
    }
  })

  it("accepts an empty-string email (literal escape hatch)", () => {
    const res = leadEditSchema.safeParse({ email: "" })
    expect(res.success).toBe(true)
  })

  it("rejects a malformed non-empty email", () => {
    const res = leadEditSchema.safeParse({ email: "nope" })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "email")
      expect(issue?.message).toBe("Enter a valid email")
    }
  })

  it("exposes interest-level options with unique non-empty values", () => {
    const values = INTEREST_LEVELS.map((l) => l.value)
    expect(values.length).toBeGreaterThan(0)
    expect(new Set(values).size).toBe(values.length)
  })
})
