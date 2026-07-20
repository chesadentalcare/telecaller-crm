import { z } from "zod"

const fileSchema = z
  .custom<File | null>((v) => v === null || v instanceof File, { message: "Invalid file" })
  .nullable()

export const zoomMeetingSchema = z
  .object({
    meetingAt: z.string().min(1, "Please pick a meeting time"),
    // Zoom needs a valid inbox for the join link — reconfirm it at booking (parallel to
    // the physical-meeting address reconfirm). Written back to the lead on the server.
    customerEmail: z.string().trim().email("Reconfirm a valid customer email"),
    layoutShared: z.enum(["yes", "no"], { message: "Please indicate whether a layout was shared" }),
    designFeeStatus: z.enum(["discussed", "paid", "declined"], {
      message: "Please mark design fee discussion status",
    }),
    paymentProof: fileSchema,
    durationMinutes: z.coerce
      .number()
      .int()
      .positive("Enter a valid meeting length")
      .optional()
      .default(40),
    notes: z.string().optional().default(""),
    extraEmails: z.string().optional().default(""),
  })
  // When design fee is paid, proof of payment is mandatory.
  .refine(
    (data) => data.designFeeStatus !== "paid" || data.paymentProof instanceof File,
    { path: ["paymentProof"], message: "Upload payment proof when design fee is paid" },
  )

export type ZoomMeetingValues = z.infer<typeof zoomMeetingSchema>

export const zoomMeetingDefaults: ZoomMeetingValues = {
  meetingAt: "",
  customerEmail: "",
  layoutShared: "" as ZoomMeetingValues["layoutShared"],
  designFeeStatus: "" as ZoomMeetingValues["designFeeStatus"],
  paymentProof: null,
  durationMinutes: 40,
  notes: "",
  extraEmails: "",
}
