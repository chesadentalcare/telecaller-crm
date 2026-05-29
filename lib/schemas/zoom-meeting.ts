import { z } from "zod"

const fileSchema = z
  .custom<File | null>((v) => v === null || v instanceof File, { message: "Invalid file" })
  .nullable()

export const zoomMeetingSchema = z
  .object({
    meetingAt: z.string().min(1, "Please pick a meeting time"),
    layoutShared: z.enum(["yes", "no"], { message: "Please indicate whether a layout was shared" }),
    designFeeStatus: z.enum(["discussed", "paid", "declined"], {
      message: "Please mark design fee discussion status",
    }),
    paymentProof: fileSchema,
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
  layoutShared: "" as ZoomMeetingValues["layoutShared"],
  designFeeStatus: "" as ZoomMeetingValues["designFeeStatus"],
  paymentProof: null,
  notes: "",
  extraEmails: "",
}
