import type { LeadDetail } from "@/lib/api/leads"

export type JourneyTone = "neutral" | "good" | "warn" | "bad"

// actor = who caused the event, so the timeline reads like a birth certificate:
//   system   → an automated/background job (drip send, drip auto-exit, dormancy)
//   rep      → a telecaller action (logged a call, sent WhatsApp, made a quote)
//   customer → the lead did something (replied, opted out)
//   sales    → sales-side (handover, meeting outcome)
export type JourneyActor = "system" | "rep" | "customer" | "sales"

export type JourneyPhase =
  | "intake"
  | "contact"
  | "qualify"
  | "call"
  | "drip"
  | "reply"
  | "meeting"
  | "quote"
  | "sales"
  | "dormant"
  | "current"

export interface JourneyStep {
  key: string
  phase: JourneyPhase
  actor: JourneyActor
  title: string
  detail?: string
  at?: string | null
  tone: JourneyTone
}

export interface JourneySummary {
  stage: string
  route: string
  qualified: boolean
  inDrip: boolean
  dripTrack: string | null
  awaitingReply: boolean
  optedOut: boolean
  terminal: "won" | "lost" | "archived" | null
  totalEvents: number
}

export interface LeadJourney {
  steps: JourneyStep[]
  summary: JourneySummary
}

const TERMINAL_STAGES = new Set(["closed_won", "closed_lost", "won", "lost", "archived"])

const TRACK_LABEL: Record<string, string> = {
  "1_month": "1-month track",
  "3_month": "3-month track",
  "6_plus_month": "6-month+ track",
  "24_month": "24-month track",
}

const REASON_LABEL: Record<string, string> = {
  genuine_no: "genuine no / wrong fit",
  timing_budget: "timing / budget",
  already_purchased: "already purchased",
}

const DRIP_EXIT_LABEL: Record<string, string> = {
  exited_replied: "customer replied",
  exited_completed: "track completed",
  exited_manual: "manual / superseded",
  exited_meeting_booked: "meeting booked",
}

const WA_MAP: Record<string, { title: string; phase: JourneyPhase; actor: JourneyActor }> = {
  drip: { title: "Drip WhatsApp", phase: "drip", actor: "system" },
  recovery: { title: "Recovery WhatsApp", phase: "drip", actor: "system" },
  manual: { title: "WhatsApp (rep)", phase: "reply", actor: "rep" },
  quotation: { title: "Quotation sent", phase: "quote", actor: "rep" },
  meeting: { title: "Meeting WhatsApp", phase: "meeting", actor: "system" },
}

function outcomeStep(outcome: string, reason: string | null): { title: string; tone: JourneyTone } {
  switch (outcome) {
    case "engaged": return { title: "Call — engaged", tone: "good" }
    case "replied": return { title: "Call — replied", tone: "good" }
    case "call_back_requested": return { title: "Call — callback asked", tone: "neutral" }
    case "no_response": return { title: "Call — no response", tone: "warn" }
    case "wrong_number": return { title: "Call — wrong number", tone: "bad" }
    case "not_interested":
      return {
        title: `Not interested${reason ? ` · ${REASON_LABEL[reason] ?? reason}` : ""}`,
        tone: reason === "genuine_no" ? "bad" : "warn",
      }
    default: return { title: `Call — ${outcome}`, tone: "neutral" }
  }
}

const ms = (t?: string | null): number => {
  if (!t) return Number.POSITIVE_INFINITY
  const v = Date.parse(t)
  return Number.isNaN(v) ? Number.POSITIVE_INFINITY : v
}

/**
 * Reconstructs the FULL lifecycle of a lead from the data getLeadDetail returns —
 * rep actions, customer replies AND the automated/background jobs (drip sends,
 * drip auto-exit, dormancy, reactivation). Every node is a real event; ordered by
 * when it happened so the journey reads like a birth certificate: nothing missed.
 */
export function buildLeadJourney(detail: LeadDetail): LeadJourney {
  const ext = detail.extension as LeadDetail["extension"] & Record<string, unknown>
  const attempts = detail.attempts ?? []
  const drip = detail.drip
  const inbound = detail.inbound ?? []
  const meetings = detail.meetings ?? []
  const whatsapp = detail.whatsapp ?? []
  const quotations = detail.quotations ?? []
  const fc = detail.firstContact

  const route = ext.first_call_route
  const qualified = !!route && route !== "pending"
  const inDrip = drip?.status === "active"
  const optedOut = ext.whatsapp_opted_out === 1
  const stage = ext.stage
  const terminal: JourneySummary["terminal"] =
    stage === "closed_won" || stage === "won" ? "won"
    : stage === "closed_lost" || stage === "lost" ? "lost"
    : stage === "archived" ? "archived"
    : null
  const isTerminal = TERMINAL_STAGES.has(stage)
  const awaitingReply = inbound.length > 0 && !isTerminal

  const raw: (JourneyStep & { _t: number; _seq: number })[] = []
  const push = (s: JourneyStep, seq: number) => raw.push({ ...s, _t: ms(s.at), _seq: seq })

  const equipment = (ext.equipment_interest as string) || (ext.equipment as string) || null
  const source = (ext.source as string) || null

  push({ key: "created", phase: "intake", actor: "system", title: "Lead created",
    detail: [equipment, source].filter(Boolean).join(" · ") || undefined, at: ext.created_at, tone: "neutral" }, 0)

  if (fc) {
    push({ key: "first-contact", phase: "contact", actor: "system", title: "First-contact cadence",
      detail: `${fc.call_attempts_used} call(s) · ${fc.status}`, at: ext.created_at,
      tone: fc.status === "exhausted" ? "bad" : "neutral" }, 1)
  }

  if (qualified) {
    const firstAttemptAt = attempts.length
      ? attempts.reduce((min, a) => (ms(a.attempted_at) < ms(min) ? a.attempted_at : min), attempts[0].attempted_at)
      : null
    push({ key: "qualified", phase: "qualify", actor: "rep", title: "Qualified",
      detail: `route: ${route}`, at: firstAttemptAt ?? ext.created_at, tone: "good" }, 2)
  }

  attempts.forEach((a) => {
    const { title, tone } = outcomeStep(a.outcome, a.not_interested_reason)
    push({ key: `attempt-${a.id}`, phase: "call", actor: "rep", title,
      detail: [a.attempted_by ? `by ${a.attempted_by}` : null, a.notes || null].filter(Boolean).join(" — ") || undefined,
      at: a.attempted_at, tone }, 3)
  })

  whatsapp.forEach((w) => {
    const map = WA_MAP[w.message_type] ?? { title: "WhatsApp sent", phase: "drip" as JourneyPhase, actor: "system" as JourneyActor }
    const text = typeof w.payload === "object" && w.payload && "text" in w.payload ? (w.payload as { text?: string }).text : null
    push({ key: `wa-${w.id}`, phase: map.phase, actor: map.actor, title: map.title,
      detail: text || w.template_name || undefined, at: w.sent_at, tone: "neutral" }, 3)
  })

  inbound.forEach((r) => {
    push({ key: `inbound-${r.id}`, phase: "reply", actor: "customer", title: `Customer replied · ${r.intent}`,
      detail: r.body || undefined, at: r.received_at, tone: r.intent === "stop" ? "bad" : "warn" }, 3)
  })

  if (drip) {
    const origin = (drip as unknown as Record<string, unknown>).origin_outcome as string | null
    push({ key: "drip-in", phase: "drip", actor: "system", title: `Entered drip · ${TRACK_LABEL[drip.track] ?? drip.track}`,
      detail: origin ? `origin: ${origin}` : undefined, at: drip.started_at, tone: "good" }, 3)
    if (drip.status !== "active" && drip.exited_at) {
      push({ key: "drip-out", phase: "drip", actor: "system", title: `Auto-left drip · ${DRIP_EXIT_LABEL[drip.status] ?? drip.status}`,
        detail: drip.exit_reason || undefined, at: drip.exited_at, tone: drip.status === "exited_completed" ? "good" : "warn" }, 3)
    }
  }

  quotations.forEach((q) => {
    const at = (q as unknown as Record<string, unknown>).created_at as string | null
    push({ key: `quote-${q.id}`, phase: "quote", actor: "rep", title: `Quotation ${q.quote_number ?? ""}`.trim(),
      detail: q.version ? `v${q.version}` : undefined, at, tone: "good" }, 3)
  })

  meetings.forEach((m) => {
    const summaryIn = !!m.meeting_summary_url
    push({ key: `meeting-${m.id}`, phase: "meeting", actor: "rep",
      title: `${m.meeting_type === "physical" ? "Physical" : "Online"} meeting`,
      detail: [m.location, m.assigned_salesperson ? `→ ${m.assigned_salesperson}` : null, summaryIn ? "summary ✓" : "no summary"].filter(Boolean).join(" · ") || undefined,
      at: m.meeting_at, tone: summaryIn ? "good" : "warn" }, 3)
  })

  if (ext.callback_at) {
    push({ key: "callback", phase: "call", actor: "system", title: "Callback scheduled",
      at: ext.callback_at as string, tone: "neutral" }, 3)
  }
  if (ext.wrong_number_at) {
    push({ key: "wrong-number", phase: "call", actor: "rep", title: "Marked wrong number",
      at: ext.wrong_number_at as string, tone: "bad" }, 3)
  }
  if (ext.requalify_at) {
    push({ key: "requalify", phase: "qualify", actor: "system", title: "Re-qualification requested",
      detail: (ext.requalify_reason as string) || undefined, at: ext.requalify_at as string, tone: "warn" }, 3)
  }
  if (ext.handed_off_at) {
    push({ key: "handoff", phase: "sales", actor: "sales", title: "Handed to Sales",
      detail: (ext.handoff_from as string) ? `from ${ext.handoff_from as string}` : undefined, at: ext.handed_off_at as string, tone: "good" }, 3)
  }
  if (ext.dormant_since) {
    push({ key: "dormant", phase: "dormant", actor: "system", title: "Went dormant (auto)",
      detail: (ext.archive_reason as string) || undefined, at: ext.dormant_since as string, tone: "warn" }, 3)
  }
  if (optedOut) {
    push({ key: "optout", phase: "dormant", actor: "customer", title: "Opted out (STOP)",
      at: (ext.last_inbound_at as string) || (ext.updated_at as string) || null, tone: "bad" }, 4)
  }

  raw.sort((a, b) => (a._t !== b._t ? a._t - b._t : a._seq - b._seq))
  const steps: JourneyStep[] = raw.map((r) => ({
    key: r.key, phase: r.phase, actor: r.actor, title: r.title, detail: r.detail, at: r.at, tone: r.tone,
  }))

  const current = ((): JourneyStep => {
    const base = { key: "current", phase: "current" as const, actor: "system" as const, at: ext.updated_at ?? null }
    if (terminal === "won") return { ...base, title: "Now · Deal WON", detail: "closed_won", tone: "good" }
    if (terminal === "lost") return { ...base, title: "Now · Deal LOST", detail: (ext.archive_reason as string) || "closed_lost", tone: "bad" }
    if (terminal === "archived") return { ...base, title: "Now · Archived", detail: (ext.archive_reason as string) || undefined, tone: "bad" }
    if (optedOut) return { ...base, title: "Now · Opted out", tone: "bad" }
    if (ext.dormant_since) return { ...base, title: "Now · Dormant", detail: (ext.archive_reason as string) || "no engagement", tone: "warn" }
    if (awaitingReply) return { ...base, title: "Now · Needs reply", detail: "customer messaged", tone: "warn" }
    if (inDrip) return { ...base, title: "Now · In drip nurture", detail: `${TRACK_LABEL[drip!.track] ?? drip!.track} · touch ${drip!.current_message_index}`, tone: "good" }
    if (ext.callback_at) return { ...base, title: "Now · Callback scheduled", tone: "neutral" }
    if (qualified) return { ...base, title: `Now · Qualified`, detail: route, tone: "neutral" }
    return { ...base, title: `Now · ${stage}`, tone: "neutral" }
  })()
  steps.push(current)

  return {
    steps,
    summary: {
      stage, route, qualified, inDrip,
      dripTrack: drip ? (TRACK_LABEL[drip.track] ?? drip.track) : null,
      awaitingReply, optedOut, terminal, totalEvents: steps.length,
    },
  }
}
