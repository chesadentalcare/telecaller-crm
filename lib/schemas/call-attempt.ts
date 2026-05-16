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
  notes: z.string().optional().default(""),
})

export type CallAttemptValues = z.infer<typeof callAttemptSchema>

export const callAttemptDefaults: Partial<CallAttemptValues> = {
  notes: "",
}
