import { z } from "zod"

export const OBJECTION_TYPES = [
  { value: "price", label: "Price Concern" },
  { value: "timing", label: "Timing / Not Ready" },
  { value: "competitor", label: "Evaluating Competitor" },
  { value: "features", label: "Feature Gap" },
  { value: "budget", label: "Budget Constraint" },
  { value: "other", label: "Other" },
] as const

export const followUpCompleteSchema = z.object({
  objectionType: z.enum(["price", "timing", "competitor", "features", "budget", "other"], {
    required_error: "Objection type is required",
  }),
  nextActionDate: z.string().min(1, "Next action date is required"),
  notes: z.string().optional(),
})

export type FollowUpCompleteValues = z.infer<typeof followUpCompleteSchema>
