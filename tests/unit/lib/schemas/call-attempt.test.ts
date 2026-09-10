import { describe, it, expect } from "vitest"
import { callAttemptSchema, CALL_OUTCOMES } from "@/lib/schemas/call-attempt"

describe("callAttemptSchema", () => {
  it("parses an engaged outcome with a valid predicted closing date", () => {
    const parsed = callAttemptSchema.parse({
      outcome: "engaged",
      predictedClosingDate: "2026-10-01",
      notes: "wants a quote",
    })
    expect(parsed.outcome).toBe("engaged")
    expect(parsed.predictedClosingDate).toBe("2026-10-01")
  })

  it("defaults notes and predictedClosingDate to empty strings", () => {
    const parsed = callAttemptSchema.parse({
      outcome: "not_interested",
    })
    expect(parsed.notes).toBe("")
    expect(parsed.predictedClosingDate).toBe("")
  })

  it("requires a predicted closing date for non-not_interested outcomes", () => {
    const res = callAttemptSchema.safeParse({ outcome: "engaged" })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "predictedClosingDate")
      expect(issue?.message).toBe("Predicted closing date is required")
    }
  })

  it("does NOT require a closing date for a not_interested outcome", () => {
    const res = callAttemptSchema.safeParse({ outcome: "not_interested", predictedClosingDate: "" })
    expect(res.success).toBe(true)
  })

  it("rejects a badly formatted closing date", () => {
    const res = callAttemptSchema.safeParse({
      outcome: "engaged",
      predictedClosingDate: "01-10-2026",
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "predictedClosingDate")
      expect(issue?.message).toBe("Pick a valid date")
    }
  })

  it("rejects an outcome outside the allowed enum", () => {
    const res = callAttemptSchema.safeParse({
      outcome: "voicemail",
      predictedClosingDate: "2026-10-01",
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "outcome")
      expect(issue?.message).toBe("Please select an outcome")
    }
  })

  it("accepts every enumerated outcome with a supplied date", () => {
    for (const outcome of CALL_OUTCOMES) {
      const res = callAttemptSchema.safeParse({ outcome, predictedClosingDate: "2026-10-01" })
      expect(res.success).toBe(true)
    }
  })
})
