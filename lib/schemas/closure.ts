import { z } from "zod"

export const LOST_REASONS = [
  { value: "price", label: "Price Too High" },
  { value: "timing", label: "Bad Timing" },
  { value: "competitor", label: "Chose Competitor" },
  { value: "features", label: "Missing Features" },
  { value: "budget", label: "Budget Constraint" },
  { value: "no_response", label: "No Response / Ghosted" },
  { value: "went_local", label: "Went With Local Vendor" },
  { value: "other", label: "Other" },
] as const

export const PRICE_GAP_RANGES = [
  { value: "<5%", label: "Less than 5%" },
  { value: "5-10%", label: "5-10%" },
  { value: "10-20%", label: "10-20%" },
  { value: ">20%", label: "More than 20%" },
] as const

export const closureWonSchema = z.object({
  outcome: z.literal("won"),
  dispatchDate: z.string().min(1, "Dispatch date is required"),
  installationDate: z.string().min(1, "Installation date is required"),
  // files are handled outside zod (FormData)
})

export const closureLostSchema = z.object({
  outcome: z.literal("lost"),
  lostReason: z.enum(
    ["price", "timing", "competitor", "features", "budget", "no_response", "went_local", "other"],
    { required_error: "Lost reason is required" },
  ),
  competitorName: z.string().optional(),
  priceGapRange: z.enum(["<5%", "5-10%", "10-20%", ">20%"]).optional(),
  reactivationFlag: z.boolean().default(false),
})

export type ClosureWonValues = z.infer<typeof closureWonSchema>
export type ClosureLostValues = z.infer<typeof closureLostSchema>
