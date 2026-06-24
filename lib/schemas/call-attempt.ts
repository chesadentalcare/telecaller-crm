import { z } from "zod"

// Outcomes are an enum — listing them keeps the schema and the UI options in
// lockstep. If a new outcome is added, the Select and zod both need the value.
export const CALL_OUTCOMES = [
  "no_response",
  "wrong_number",
  "not_interested",
  "call_back_requested",
  "engaged",
  "replied",
] as const

export type CallOutcome = (typeof CALL_OUTCOMES)[number]

export const callAttemptSchema = z
  .object({
    outcome: z.enum(CALL_OUTCOMES, { message: "Please select an outcome" }),
    // Amendment 2 (Theme 4): the predicted close is required on EVERY outcome EXCEPT
    // "not interested" (a not-interested lead must not be forced to commit a date).
    // When present it must be 'YYYY-MM-DD'. The required-ness is enforced in the
    // superRefine below so it can depend on the chosen outcome.
    predictedClosingDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date")
      .or(z.literal(""))
      .optional()
      .default(""),
    notes: z.string().optional().default(""),
  })
  .superRefine((val, ctx) => {
    if (val.outcome !== "not_interested" && !val.predictedClosingDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["predictedClosingDate"],
        message: "Predicted closing date is required",
      })
    }
  })

export type CallAttemptValues = z.infer<typeof callAttemptSchema>

export const callAttemptDefaults: Partial<CallAttemptValues> = {
  notes: "",
  predictedClosingDate: "",
}
