// Calls-Due calendar helpers — flatten the two worklist hooks into a single,
// day-bucketed CallEntry model the month calendar + day-detail modal render from.
//
// IMPORTANT (correctness, per design review):
//   • useUpcomingCalls() returns FUTURE-day calls only; useCallsDueLeads() returns
//     TODAY + PAST-day calls. A calendar must merge BOTH or the days around today
//     render dot-less while the Today tab clearly has calls.
//   • Bucket by a LOCAL calendar-day key (getFullYear/Month/Date) — never
//     toISOString(), whose UTC date shifts IST evening calls into the wrong day.

import type { CallsDueLead, UpcomingCalls } from "@/lib/types/lead"
import type { CallOutcome } from "@/lib/schemas/call-attempt"

export type CallKind = "callback" | "drip" | "first_contact" | "requalification"

export interface CallEntry {
  leadId: string
  name: string
  phone: string
  at: Date
  kind: CallKind
  /** Display text — reason label for scheduled calls, "Day N" / touch label for drip. */
  label: string
  /** Equipment interest, for the agenda sub-line ("Dental Chair · Callback"). */
  equipment?: string
  /** Only present on drip touches. */
  track?: "1_month" | "3_month" | "6_plus_month"
  /** Most recent call disposition (null = never called → "Fresh call"). */
  lastOutcome?: CallOutcome | null
  /** True for entries sourced from the Today/past worklist (drives the "missed/overdue" tint). */
  fromWorklist?: boolean
}

export const REASON_LABEL: Record<string, string> = {
  first_contact: "First contact",
  callback: "Callback",
  drip_anchor: "Drip call",
  requalification: "Re-qualify",
}

// Human labels for a prior call outcome — the single source of truth shared by the
// Calls-Due/Upcoming surfaces and lead-detail's OUTCOME_CONFIG.
export const OUTCOME_LABEL: Record<CallOutcome, string> = {
  no_response: "No response",
  wrong_number: "Wrong number",
  not_interested: "Not interested",
  call_back_requested: "Call back requested",
  engaged: "Engaged",
  replied: "Replied",
}

// "Last: <outcome>" or "Fresh call" when the lead has never been called.
export const lastOutcomeLabel = (o?: CallOutcome | null): string =>
  o ? `Last: ${OUTCOME_LABEL[o] ?? o}` : "Fresh call"

// Plain, human label for an entry's kind.
export const KIND_LABEL: Record<CallKind, string> = {
  callback: "Callback",
  first_contact: "First contact",
  requalification: "Re-qualify",
  drip: "Drip",
}

// One professional colour per call type, for at-a-glance recognition (calendar dots
// + agenda markers + legend). Deliberately avoids rose — that's reserved for the
// overdue/missed tint on the Calls Today tab.
export const KIND_DOT: Record<CallKind, string> = {
  callback: "bg-amber-500",
  first_contact: "bg-emerald-500",
  requalification: "bg-violet-500",
  drip: "bg-sky-500",
}

// Stable render/legend order.
export const KIND_ORDER: CallKind[] = ["callback", "first_contact", "requalification", "drip"]

// Distinct kinds present in a day's entries, in legend order (for the day-cell dots).
export const distinctKinds = (entries: CallEntry[]): CallKind[] =>
  KIND_ORDER.filter((k) => entries.some((e) => e.kind === k))

export const TRACK_LABEL: Record<string, string> = {
  "1_month": "1-month",
  "3_month": "3-month",
  "6_plus_month": "6-month",
}

const reasonToKind = (reason: string): CallKind =>
  reason === "callback"
    ? "callback"
    : reason === "first_contact"
      ? "first_contact"
      : reason === "requalification"
        ? "requalification"
        : "drip" // drip_anchor → a drip call

// Local calendar-day key. NEVER toISOString() — UTC would mis-bucket evening IST calls.
export const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

export const parseDayKey = (k: string): Date => {
  const [y, m, d] = k.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// Future-dated calls (callbacks/re-qual/first-contact retries + projected drip touches).
export const flattenUpcoming = (upcoming?: UpcomingCalls): CallEntry[] => {
  const out: CallEntry[] = []
  for (const s of upcoming?.scheduled ?? []) {
    out.push({
      leadId: s.id,
      name: s.name,
      phone: s.phone,
      at: s.scheduledAt,
      kind: reasonToKind(s.reason),
      label: REASON_LABEL[s.reason] ?? s.reason,
      equipment: s.equipment,
      lastOutcome: s.lastOutcome ?? null,
    })
  }
  for (const lead of upcoming?.drip ?? []) {
    for (const c of lead.calls) {
      out.push({
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone,
        at: c.at,
        kind: "drip",
        track: lead.track,
        label: c.dripDay != null ? `Day ${c.dripDay}` : c.label || `Call ${c.touchIndex + 1}`,
        equipment: lead.equipment,
        lastOutcome: lead.lastOutcome ?? null, // per-lead — every touch inherits it
      })
    }
  }
  return out
}

// Today + overdue/past calls (the worklist hook). Merged into the calendar so the
// days around today aren't empty.
export const flattenCallsDue = (leads: CallsDueLead[]): CallEntry[] =>
  leads.map((l) => ({
    leadId: l.id,
    name: l.name,
    phone: l.phone,
    at: l.scheduledAt,
    kind: reasonToKind(l.reason),
    label: REASON_LABEL[l.reason] ?? l.reason,
    equipment: l.equipment,
    lastOutcome: l.lastOutcome ?? null,
    fromWorklist: true,
  }))

// Group entries by local day, each day sorted chronologically.
export const buildByDay = (entries: CallEntry[]): Map<string, CallEntry[]> => {
  const byDay = new Map<string, CallEntry[]>()
  for (const e of entries) {
    const k = dayKey(e.at)
    const list = byDay.get(k)
    if (list) list.push(e)
    else byDay.set(k, [e])
  }
  for (const list of byDay.values()) list.sort((a, b) => a.at.getTime() - b.at.getTime())
  return byDay
}

// Pick the day to auto-open in the agenda so the rep instantly sees their calls:
// today if it has calls, else the soonest future day, else the most recent past day.
export const pickDefaultDay = (byDay: Map<string, CallEntry[]>, now = new Date()): Date | null => {
  const keys = [...byDay.keys()].sort() // YYYY-MM-DD is lexicographically chronological
  if (!keys.length) return null
  const todayK = dayKey(now)
  if (byDay.has(todayK)) return parseDayKey(todayK)
  const future = keys.find((k) => k >= todayK)
  return parseDayKey(future ?? keys[keys.length - 1])
}
