// Smart Call Log — the call-disposition state machine (frontend mirror).
//
// MUST stay in sync with the backend's src/utils/callLogState.js — the backend
// is the enforcing authority; this copy just drives the UI (which outcomes to
// show, when to lock the form). See that file for the full rationale.
//
// Rules:
//   1. "Wrong number" is a dead contact → once logged, calling is locked.
//   2. Once the lead has been REACHED (engaged / replied / call-back /
//      not-interested), "wrong number" is no longer offered.
//   3. Otherwise any outcome is possible.

import type { CallOutcome } from "@/lib/schemas/call-attempt"
import { CALL_OUTCOMES } from "@/lib/schemas/call-attempt"

// Outcomes that mean a human was actually reached (no_response / wrong_number
// are NOT contact).
const REACHED_OUTCOMES: CallOutcome[] = ["engaged", "replied", "call_back_requested", "not_interested"]

export interface CallLogState {
  locked: boolean
  lockReason: string | null
  allowed: CallOutcome[]
}

export function callLogState(priorOutcomes: CallOutcome[]): CallLogState {
  const hasWrongNumber = priorOutcomes.includes("wrong_number")
  const reached = priorOutcomes.some((o) => REACHED_OUTCOMES.includes(o))

  if (hasWrongNumber) {
    return {
      locked: true,
      lockReason:
        "This number was marked “Wrong number”. Correct Attempt #1 or update the lead’s phone number to continue calling.",
      allowed: [],
    }
  }
  if (reached) {
    return { locked: false, lockReason: null, allowed: CALL_OUTCOMES.filter((o) => o !== "wrong_number") }
  }
  return { locked: false, lockReason: null, allowed: [...CALL_OUTCOMES] }
}

/**
 * Validate that editing Attempt #1 to `newOutcome` keeps the whole chain legal.
 * `laterOutcomes` are the chronological outcomes of attempts #2..N.
 * Returns the first conflicting attempt (1-based) or null if the chain is fine.
 */
export function firstEditConflict(
  newOutcome: CallOutcome,
  laterOutcomes: CallOutcome[],
): { conflictAttempt: number; conflictOutcome: CallOutcome } | null {
  const chain: CallOutcome[] = [newOutcome, ...laterOutcomes]
  for (let i = 1; i < chain.length; i++) {
    const { locked, allowed } = callLogState(chain.slice(0, i))
    if (locked || !allowed.includes(chain[i])) {
      return { conflictAttempt: i + 1, conflictOutcome: chain[i] }
    }
  }
  return null
}
