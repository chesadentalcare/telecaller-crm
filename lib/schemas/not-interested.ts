// NOT INTERESTED — the 3-way "Ask WHY" split (P6.2). Sent to logAttempt as
// not_interested_reason; the dispatcher routes each:
//   genuine_no        → Archived
//   timing_budget     → Re-qualification
//   already_purchased → 24-month re-touch → First Contact

export const NOT_INTERESTED_REASONS = [
  { value: "genuine_no", label: "Genuine no / wrong fit" },
  { value: "timing_budget", label: "Timing / budget — not now" },
  { value: "already_purchased", label: "Already purchased" },
] as const

export type NotInterestedReason = (typeof NOT_INTERESTED_REASONS)[number]["value"]
