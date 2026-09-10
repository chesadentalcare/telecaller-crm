import { describe, it, expect } from "vitest"
import { physicalMeetingSchema, physicalMeetingDefaults } from "@/lib/schemas/physical-meeting"

const validMeeting = {
  meetingAt: "2026-10-01T10:00",
  location: "Clinic, MG Road",
  salesUsername: "rakesh",
  address: "12 MG Road, Bengaluru",
  extraEmails: "assistant@clinic.example",
}

describe("physicalMeetingSchema", () => {
  it("parses a valid physical meeting booking", () => {
    const parsed = physicalMeetingSchema.parse(validMeeting)
    expect(parsed.salesUsername).toBe("rakesh")
    expect(parsed.address).toBe("12 MG Road, Bengaluru")
  })

  it("defaults extraEmails to an empty string when omitted", () => {
    const { extraEmails, ...withoutExtra } = validMeeting
    void extraEmails
    const parsed = physicalMeetingSchema.parse(withoutExtra)
    expect(parsed.extraEmails).toBe("")
  })

  it("requires a meeting time", () => {
    const res = physicalMeetingSchema.safeParse({ ...validMeeting, meetingAt: "" })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "meetingAt")
      expect(issue?.message).toBe("Date and time are required")
    }
  })

  it("requires a sales employee to be assigned", () => {
    const res = physicalMeetingSchema.safeParse({ ...validMeeting, salesUsername: "" })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "salesUsername")
      expect(issue?.message).toBe("Assign a sales employee")
    }
  })

  it("rejects a whitespace-only location and address", () => {
    const res = physicalMeetingSchema.safeParse({
      ...validMeeting,
      location: "   ",
      address: "   ",
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      const paths = res.error.issues.map((i) => i.path[0])
      expect(paths).toContain("location")
      expect(paths).toContain("address")
    }
  })

  it("has defaults that fail validation out of the box", () => {
    expect(physicalMeetingSchema.safeParse(physicalMeetingDefaults).success).toBe(false)
  })
})
