import type { LeadDetail } from "@/lib/api/leads"

export type JourneyTone = "neutral" | "good" | "warn" | "bad"

export type JourneyPhase =
  | "intake"
  | "contact"
  | "qualify"
  | "call"
  | "drip"
  | "reply"
  | "meeting"
  | "current"

export interface JourneyStep {
  key: string
  phase: JourneyPhase
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
  outbound: { total: number; drip: number }
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

function outcomeStep(outcome: string, reason: string | null): { title: string; tone: JourneyTone } {
  switch (outcome) {
    case "engaged":
      return { title: "Call — engaged", tone: "good" }
    case "replied":
      return { title: "Call — replied", tone: "good" }
    case "call_back_requested":
      return { title: "Call — callback requested", tone: "neutral" }
    case "no_response":
      return { title: "Call — no response", tone: "warn" }
    case "wrong_number":
      return { title: "Call — wrong number", tone: "bad" }
    case "not_interested":
      return {
        title: `Call — not interested${reason ? ` (${REASON_LABEL[reason] ?? reason})` : ""}`,
        tone: reason === "genuine_no" ? "bad" : "warn",
      }
    default:
      return { title: `Call — ${outcome}`, tone: "neutral" }
  }
}

function ms(t?: string | null): number {
  if (!t) return Number.POSITIVE_INFINITY
  const v = Date.parse(t)
  return Number.isNaN(v) ? Number.POSITIVE_INFINITY : v
}

/**
 * Reconstructs the ACTUAL path a lead travelled from the data the Cockpit
 * already loads (getLeadDetail): call outcomes, drip enrol/exit, inbound
 * replies, meetings, terminal state. Nothing hard-coded — every node is an
 * event that really happened to this lead, ordered by when it happened.
 */
export function buildLeadJourney(detail: LeadDetail): LeadJourney {
  const ext = detail.extension as LeadDetail["extension"] & Record<string, unknown>
  const attempts = detail.attempts ?? []
  const drip = detail.drip
  const inbound = detail.inbound ?? []
  const meetings = detail.meetings ?? []
  const whatsapp = detail.whatsapp ?? []
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

  // seq breaks ties for events that share a timestamp so the story reads in
  // the natural order (intake → contact → qualify → activity).
  const raw: (JourneyStep & { _t: number; _seq: number })[] = []
  const push = (s: JourneyStep, seq: number) => raw.push({ ...s, _t: ms(s.at), _seq: seq })

  const equipment = (ext.equipment_interest as string) || (ext.equipment as string) || null
  const source = (ext.source as string) || null

  push({
    key: "created",
    phase: "intake",
    title: "Lead created",
    detail: [equipment, source].filter(Boolean).join(" · ") || undefined,
    at: ext.created_at,
    tone: "neutral",
  }, 0)

  if (fc) {
    push({
      key: "first-contact",
      phase: "contact",
      title: "First-contact outreach",
      detail: `${fc.call_attempts_used} call attempt(s) · ${fc.status}`,
      at: ext.created_at,
      tone: fc.status === "exhausted" ? "bad" : "neutral",
    }, 1)
  }

  if (qualified) {
    // Qualification carries no timestamp of its own — anchor it just before the
    // first logged call (routing follows qualification), else to creation.
    const firstAttemptAt = attempts.length
      ? attempts.reduce((min, a) => (ms(a.attempted_at) < ms(min) ? a.attempted_at : min), attempts[0].attempted_at)
      : null
    push({
      key: "qualified",
      phase: "qualify",
      title: "Qualified",
      detail: `route: ${route}`,
      at: firstAttemptAt ?? ext.created_at,
      tone: "good",
    }, 2)
  }

  attempts.forEach((a) => {
    const { title, tone } = outcomeStep(a.outcome, a.not_interested_reason)
    push({
      key: `attempt-${a.id}`,
      phase: "call",
      title,
      detail: [a.attempted_by ? `by ${a.attempted_by}` : null, a.notes || null].filter(Boolean).join(" — ") || undefined,
      at: a.attempted_at,
      tone,
    }, 3)
  })

  inbound.forEach((r) => {
    push({
      key: `inbound-${r.id}`,
      phase: "reply",
      title: `Customer replied — ${r.intent}`,
      detail: r.body || undefined,
      at: r.received_at,
      tone: r.intent === "stop" ? "bad" : "warn",
    }, 3)
  })

  if (drip) {
    const origin = (drip as unknown as Record<string, unknown>).origin_outcome as string | null
    push({
      key: "drip-in",
      phase: "drip",
      title: `Entered drip — ${TRACK_LABEL[drip.track] ?? drip.track}`,
      detail: origin ? `origin: ${origin}` : undefined,
      at: drip.started_at,
      tone: "good",
    }, 3)
    if (drip.status !== "active" && drip.exited_at) {
      push({
        key: "drip-out",
        phase: "drip",
        title: `Exited drip — ${DRIP_EXIT_LABEL[drip.status] ?? drip.status}`,
        detail: drip.exit_reason || undefined,
        at: drip.exited_at,
        tone: drip.status === "exited_completed" ? "good" : "warn",
      }, 3)
    }
  }

  meetings.forEach((m) => {
    push({
      key: `meeting-${m.id}`,
      phase: "meeting",
      title: `${m.meeting_type === "physical" ? "Physical" : "Online"} meeting`,
      detail: [m.location, m.assigned_salesperson ? `→ ${m.assigned_salesperson}` : null].filter(Boolean).join(" ") || undefined,
      at: m.meeting_at,
      tone: "good",
    }, 3)
  })

  raw.sort((a, b) => (a._t !== b._t ? a._t - b._t : a._seq - b._seq))
  const steps: JourneyStep[] = raw.map((r) => ({
    key: r.key,
    phase: r.phase,
    title: r.title,
    detail: r.detail,
    at: r.at,
    tone: r.tone,
  }))

  // Where it is NOW — the highlighted end-cap of the flow.
  const current = ((): JourneyStep => {
    const base = { key: "current", phase: "current" as const, at: ext.updated_at ?? null }
    if (terminal === "won") return { ...base, title: "Now: Deal WON", detail: "closed_won", tone: "good" }
    if (terminal === "lost") return { ...base, title: "Now: Deal LOST", detail: ext.archive_reason || "closed_lost", tone: "bad" }
    if (terminal === "archived") return { ...base, title: "Now: Archived", detail: ext.archive_reason || undefined, tone: "bad" }
    if (optedOut) return { ...base, title: "Now: Opted out (STOP)", tone: "bad" }
    if (ext.dormant_since) return { ...base, title: "Now: Dormant", detail: ext.archive_reason || "no engagement", tone: "warn" }
    if (awaitingReply) return { ...base, title: "Now: Needs reply", detail: "customer messaged — rep to respond", tone: "warn" }
    if (inDrip) return { ...base, title: `Now: In drip nurture`, detail: `${TRACK_LABEL[drip!.track] ?? drip!.track} · touch ${drip!.current_message_index}`, tone: "good" }
    if (ext.callback_at) return { ...base, title: "Now: Callback scheduled", detail: ext.callback_at, tone: "neutral" }
    if (qualified) return { ...base, title: `Now: Qualified — ${route}`, detail: "awaiting next action", tone: "neutral" }
    return { ...base, title: `Now: ${stage}`, tone: "neutral" }
  })()
  steps.push(current)

  return {
    steps,
    summary: {
      stage,
      route,
      qualified,
      inDrip,
      dripTrack: drip ? (TRACK_LABEL[drip.track] ?? drip.track) : null,
      awaitingReply,
      optedOut,
      terminal,
      outbound: {
        total: whatsapp.length,
        drip: whatsapp.filter((w) => w.message_type === "drip").length,
      },
    },
  }
}
