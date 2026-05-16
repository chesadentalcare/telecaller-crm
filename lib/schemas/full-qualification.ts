import { z } from "zod"

// All 6 fields (timeline counts as a single "qualification" answer with 7
// underlying inputs) are required to unlock the physical-meeting gate. See
// Track1 spec §4.5.
export const fullQualificationSchema = z.object({
  decisionMaker: z.string().trim().min(1, "Decision maker is required"),
  timelineBucket: z.string().min(1, "Pick a timeline"),
  budgetRange: z.string().min(1, "Pick a budget"),
  competitors: z.string().trim().min(1, "Note at least one competitor (or 'None')"),
  fundingMethod: z.string().min(1, "Pick a funding method"),
  dentistType: z.string().min(1, "Pick a dentist type"),
  practiceType: z.string().min(1, "Pick a practice type"),
})

export type FullQualificationValues = z.infer<typeof fullQualificationSchema>

export const fullQualificationDefaults: FullQualificationValues = {
  decisionMaker: "",
  timelineBucket: "",
  budgetRange: "",
  competitors: "",
  fundingMethod: "",
  dentistType: "",
  practiceType: "",
}
