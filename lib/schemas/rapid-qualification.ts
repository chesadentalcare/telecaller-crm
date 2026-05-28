import { z } from "zod"

export const rapidQualificationSchema = z.object({
  phoneVerified: z.boolean(),
  dentistType: z.string().min(1, "Required"),
  practiceType: z.string().min(1, "Required"),
  timeline: z.string().min(1, "Required"),
  budgetRange: z.string().min(1, "Required"),
  competitorEvaluated: z.string().min(1, "Required — enter 'none' if no competitor"),
  purchaseTypeClass: z.string().min(1, "Required"),
  routeSelection: z.string().min(1, "Pick a next-step route"),
})

export type RapidQualificationValues = z.infer<typeof rapidQualificationSchema>

export const rapidQualificationDefaults: RapidQualificationValues = {
  phoneVerified: false,
  dentistType: "",
  practiceType: "",
  timeline: "",
  budgetRange: "",
  competitorEvaluated: "",
  purchaseTypeClass: "",
  routeSelection: "",
}
