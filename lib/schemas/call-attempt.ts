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

export const callAttemptSchema = z.object({
  outcome: z.enum(CALL_OUTCOMES, { message: "Please select an outcome" }),
  // Mandatory on every attempt — the rep commits to a predicted close that is
  // pushed to SAP. 'YYYY-MM-DD' from <input type="date">.
  predictedClosingDate: z
    .string()
    .min(1, "Predicted closing date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date"),
  notes: z.string().optional().default(""),
})

export type CallAttemptValues = z.infer<typeof callAttemptSchema>

export const callAttemptDefaults: Partial<CallAttemptValues> = {
  notes: "",
  predictedClosingDate: "",
}
