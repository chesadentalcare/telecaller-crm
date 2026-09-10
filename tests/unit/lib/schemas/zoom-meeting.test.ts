import { describe, it, expect } from "vitest"
import { zoomMeetingSchema } from "@/lib/schemas/zoom-meeting"

function makeFile() {
  return new File(["proof"], "proof.pdf", { type: "application/pdf" })
}

const validZoom = {
  meetingAt: "2026-10-01T10:00",
  customerEmail: "asha@clinic.example",
  layoutShared: "yes" as const,
  designFeeStatus: "discussed" as const,
  paymentProof: null,
  durationMinutes: 45,
  notes: "demo booked",
  extraEmails: "",
}

describe("zoomMeetingSchema", () => {
  it("parses a valid zoom booking with no payment proof", () => {
    const parsed = zoomMeetingSchema.parse(validZoom)
    expect(parsed.layoutShared).toBe("yes")
    expect(parsed.durationMinutes).toBe(45)
  })

  it("defaults durationMinutes to 40 and notes/extraEmails to empty", () => {
    const parsed = zoomMeetingSchema.parse({
      meetingAt: "2026-10-01T10:00",
      customerEmail: "asha@clinic.example",
      layoutShared: "no",
      designFeeStatus: "declined",
      paymentProof: null,
    })
    expect(parsed.durationMinutes).toBe(40)
    expect(parsed.notes).toBe("")
    expect(parsed.extraEmails).toBe("")
  })

  it("coerces a numeric-string duration", () => {
    const parsed = zoomMeetingSchema.parse({ ...validZoom, durationMinutes: "30" })
    expect(parsed.durationMinutes).toBe(30)
  })

  it("rejects a missing meeting time", () => {
    const res = zoomMeetingSchema.safeParse({ ...validZoom, meetingAt: "" })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "meetingAt")
      expect(issue?.message).toBe("Please pick a meeting time")
    }
  })

  it("rejects an invalid customer email", () => {
    const res = zoomMeetingSchema.safeParse({ ...validZoom, customerEmail: "bad" })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "customerEmail")
      expect(issue?.message).toBe("Reconfirm a valid customer email")
    }
  })

  it("rejects a layoutShared value outside yes/no", () => {
    const res = zoomMeetingSchema.safeParse({ ...validZoom, layoutShared: "maybe" })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path[0] === "layoutShared")).toBe(true)
    }
  })

  it("rejects a non-positive duration", () => {
    const res = zoomMeetingSchema.safeParse({ ...validZoom, durationMinutes: 0 })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "durationMinutes")
      expect(issue?.message).toBe("Enter a valid meeting length")
    }
  })

  it("requires payment proof when the design fee is paid", () => {
    const res = zoomMeetingSchema.safeParse({
      ...validZoom,
      designFeeStatus: "paid",
      paymentProof: null,
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "paymentProof")
      expect(issue?.message).toBe("Upload payment proof when design fee is paid")
    }
  })

  it("accepts a paid design fee when a File proof is attached", () => {
    const res = zoomMeetingSchema.safeParse({
      ...validZoom,
      designFeeStatus: "paid",
      paymentProof: makeFile(),
    })
    expect(res.success).toBe(true)
  })

  it("rejects a non-File, non-null payment proof", () => {
    const res = zoomMeetingSchema.safeParse({ ...validZoom, paymentProof: "not-a-file" })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path[0] === "paymentProof")).toBe(true)
    }
  })
})
