// Outcome-flow registry — the SINGLE SOURCE OF TRUTH for the outcome-driven Log Call
// Attempt experience. One registry powers BOTH (a) the form's guided behavior (what
// happens on submit, which sub-fields are required, the contextual preview) AND (b) the
// "Learn about this outcome" explainer modal (the FE+BE flowchart). Keeping them in one
// place means the explainer can never drift from what the form actually does.
//
// Accurate to MASTER (Amendment 2 committed): predicted-close is conditional;
// not_interested splits 3 ways; timing_budget enters the 6-month nurture funnel;
// physical-meeting fires the named-salesperson handover; the 4th no_response triggers
// the recovery WhatsApp. Backend ROUTING (routeOutcome.js) only fires when
// ROUTE_OUTCOMES=true (flips at go-live) — those backend nodes are flagged `gated` so
// the flowchart can dim them honestly. The FE guided actions that DO have a direct
// endpoint (meeting booking, drip entry, recovery WhatsApp) fire regardless of the flag,
// so the effect actually happens for the rep today.

import type { CallOutcome } from "@/lib/schemas/call-attempt"

export type GuidedAction =
  | "none" //              just log the attempt
  | "open-meeting-modal" // engaged-ready → Physical|Zoom chooser, MANDATORY before commit
  | "enter-drip" //        log, then enter the nurture drip + show the projected timeline
  | "schedule-callback" // require/derive a callback time
  | "recovery-whatsapp" // 4th no_response → offer the recovery WhatsApp

export type FlowLane = "fe" | "be"
export type FlowNodeKind = "start" | "fe-action" | "api" | "be-effect" | "decision" | "terminal"
/** A backend effect that only fires when its server flag is on. */
export type GateFlag = "ROUTE_OUTCOMES" | "SAP"

export interface FlowNode {
  id: string
  lane: FlowLane
  kind: FlowNodeKind
  label: string
  detail?: string // file:line / threshold note, shown on the node
  gated?: GateFlag // dimmed in the diagram with a "go-live" badge when the flag is off
  tone?: "success" | "danger" | "warning" // terminal/decision coloring
}
export interface FlowEdge {
  from: string
  to: string
  label?: string
}

export type PredictedCloseMode = "required" | "optional" | "hidden"

export interface OutcomeFlow {
  key: string
  outcome: CallOutcome
  subState?: string
  title: string
  whatThisDoes: string
  guidedAction: GuidedAction
  /** When true the form blocks the log until the guided follow-up is satisfied. */
  mandatoryBeforeCommit: boolean
  /**
   * Intelligent qualification gate. When true, the lead MUST be fully qualified
   * before this outcome can be logged — the form blocks the log and opens the
   * Qualification dialog first. Only set on CONTACT-MADE outcomes where the next
   * step genuinely needs the data (engaged → meeting / nurture). Unreachable
   * outcomes (no_response, wrong_number) leave it false — you can't qualify a lead
   * that never answered, so demanding it there is nonsensical.
   */
  requiresQualification?: boolean
  /** Rep-facing bullets ({n} interpolated live from attempt context where present). */
  thresholds: string[]
  predictedClose: PredictedCloseMode
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export interface OutcomeContext {
  readyNow: boolean
  niReason?: string // genuine_no | timing_budget | already_purchased
  /** The call-sequence number this attempt will be (priorCalls + 1). */
  attemptNumber: number
}

// ── helpers to keep node/edge authoring terse ──────────────────────────────
const n = (
  id: string,
  lane: FlowLane,
  kind: FlowNodeKind,
  label: string,
  extra: Partial<FlowNode> = {},
): FlowNode => ({ id, lane, kind, label, ...extra })
const e = (from: string, to: string, label?: string): FlowEdge => ({ from, to, label })

// The journey tail shared by everything that reaches sales (engaged→meeting→quote).
const SALES_TAIL: FlowNode[] = [
  n("t-quote", "be", "be-effect", "Sales builds & sends quotation", { detail: "quotations.js · 6h summary / 12h quote SLAs" }),
  n("t-close", "be", "terminal", "Closure — WON / LOST", { detail: "closure.js", tone: "success" }),
]

// ── the registry ───────────────────────────────────────────────────────────
export const OUTCOME_FLOWS: Record<string, OutcomeFlow> = {
  "engaged-ready": {
    key: "engaged-ready",
    outcome: "engaged",
    subState: "ready",
    title: "Engaged — schedule the meeting now",
    whatThisDoes: "Books the meeting (Physical or Zoom) and logs the call together, then moves the lead toward sales.",
    guidedAction: "open-meeting-modal",
    mandatoryBeforeCommit: true,
    requiresQualification: true,
    predictedClose: "required",
    thresholds: [
      "Meeting details are required before the call logs",
      "Physical → hands the lead to a named salesperson (6h summary / 12h quote SLAs start)",
      "Zoom → stays with you for the ₹5,000 design-fee decision",
    ],
    nodes: [
      n("s", "fe", "start", "Engaged · “Ready now — schedule”"),
      n("f-choose", "fe", "fe-action", "Meeting modal opens"),
      n("f-type", "fe", "decision", "Physical or Zoom?"),
      n("f-fields", "fe", "fe-action", "Capture details (mandatory)", { detail: "Physical: date, location, salesperson, address · Zoom: date, layout, design-fee" }),
      n("a-meeting", "fe", "api", "Book meeting"),
      n("a-attempt", "fe", "api", "Log engaged attempt"),
      n("b-physical", "be", "be-effect", "Physical: meeting + named handover", { detail: "meetings.js → performHandover · SAP ownership, stage physical_meeting_scheduled, drip exited" }),
      n("b-zoom", "be", "be-effect", "Zoom: meeting + design-fee branch", { detail: "meetings.js · paid→sales_handover / declined→six_month_funnel / pending→zoom_meeting_done" }),
      n("b-attempt", "be", "be-effect", "Insert lead_attempts (engaged)", { detail: "attempts.js" }),
      ...SALES_TAIL,
    ],
    edges: [
      e("s", "f-choose"), e("f-choose", "f-type"), e("f-type", "f-fields"),
      e("f-fields", "a-meeting"), e("a-meeting", "b-physical", "physical"), e("a-meeting", "b-zoom", "zoom"),
      e("a-meeting", "a-attempt", "then"), e("a-attempt", "b-attempt"),
      e("b-physical", "t-quote"), e("b-zoom", "t-quote"), e("t-quote", "t-close"),
    ],
  },

  "engaged-nurture": {
    key: "engaged-nurture",
    outcome: "engaged",
    subState: "nurture",
    title: "Engaged — nurture (drip)",
    whatThisDoes: "Enters the lead into the nurture drip on its timeline track and projects a closing date.",
    guidedAction: "enter-drip",
    mandatoryBeforeCommit: false,
    requiresQualification: true,
    predictedClose: "required",
    thresholds: [
      "Track from timeline: 1-month = 9 touches/17d · 3-month = 19/90d · 6-month = 13/168d",
      "A customer reply or a booked meeting exits the drip",
      "Needs a timeline bucket (set it in Qualification first)",
    ],
    nodes: [
      n("s", "fe", "start", "Engaged · “Not ready — nurture”"),
      n("a-attempt", "fe", "api", "Log engaged attempt"),
      n("a-drip", "fe", "api", "Enter drip"),
      n("f-show", "fe", "fe-action", "Show projected timeline", { detail: "stage 1 of N · projected close <date>" }),
      n("b-attempt", "be", "be-effect", "Insert lead_attempts", { detail: "attempts.js" }),
      n("b-drip", "be", "be-effect", "enterDripForLead(track)", { detail: "drip.js · upsert drip_sequence_state, seed SAP close", gated: "ROUTE_OUTCOMES" }),
      n("b-stage", "be", "be-effect", "stage → six_month_funnel", { detail: "attempts.js pushStageToSap", gated: "SAP" }),
      n("b-engine", "be", "be-effect", "Drip engine sends touches over time", { detail: "dripEngine.processor — re-projects each touch" }),
      n("t-exit", "be", "terminal", "Reply / meeting / completion exits", { tone: "warning" }),
    ],
    edges: [
      e("s", "a-attempt"), e("a-attempt", "a-drip"), e("a-drip", "f-show"),
      e("a-attempt", "b-attempt"), e("a-drip", "b-drip"), e("b-drip", "b-stage"),
      e("b-stage", "b-engine"), e("b-engine", "t-exit"),
    ],
  },

  "not_interested-genuine_no": {
    key: "not_interested-genuine_no",
    outcome: "not_interested",
    subState: "genuine_no",
    title: "Not interested — genuine no",
    whatThisDoes: "Archives the lead immediately — a single disposition, no retry.",
    guidedAction: "none",
    mandatoryBeforeCommit: false,
    predictedClose: "hidden",
    thresholds: ["Archives immediately (1 disposition)", "Leaves all active queues; returns only via manual reactivation"],
    nodes: [
      n("s", "fe", "start", "Not interested · genuine no"),
      n("a", "fe", "api", "Log attempt (reason: genuine_no)"),
      n("b-ins", "be", "be-effect", "Insert lead_attempts", { detail: "attempts.js" }),
      n("b-arch", "be", "be-effect", "archiveLead → stage archived", { detail: "routeOutcome.js · dormant_since set", gated: "ROUTE_OUTCOMES" }),
      n("t", "be", "terminal", "Dormant / Archived queue", { tone: "danger" }),
    ],
    edges: [e("s", "a"), e("a", "b-ins"), e("b-ins", "b-arch"), e("b-arch", "t")],
  },

  "not_interested-timing_budget": {
    key: "not_interested-timing_budget",
    outcome: "not_interested",
    subState: "timing_budget",
    title: "Not interested — timing / budget",
    whatThisDoes: "Drops the lead into the 6-month nurture funnel and flags it for re-qualification (no archive).",
    guidedAction: "none",
    mandatoryBeforeCommit: false,
    predictedClose: "optional",
    thresholds: ["Not an archive — 6-month nurture + re-qualification", "Re-qualified later with a predicted close ≥ 6 months", "Appears in the Drip / Six-month + Re-qualification queues"],
    nodes: [
      n("s", "fe", "start", "Not interested · timing/budget"),
      n("a", "fe", "api", "Log attempt (reason: timing_budget)"),
      n("b-ins", "be", "be-effect", "Insert lead_attempts", { detail: "attempts.js" }),
      n("b-req", "be", "be-effect", "markRequalification + enter 6-month drip", { detail: "routeOutcome.js · requalify_pending, stage six_month_funnel, route nurture", gated: "ROUTE_OUTCOMES" }),
      n("t", "be", "terminal", "Six-month funnel + Re-qual queue", { tone: "warning" }),
    ],
    edges: [e("s", "a"), e("a", "b-ins"), e("b-ins", "b-req"), e("b-req", "t")],
  },

  "not_interested-already_purchased": {
    key: "not_interested-already_purchased",
    outcome: "not_interested",
    subState: "already_purchased",
    title: "Not interested — already purchased",
    whatThisDoes: "Parks the lead for 24 months; a scanner re-seeds first contact at term.",
    guidedAction: "none",
    mandatoryBeforeCommit: false,
    predictedClose: "hidden",
    thresholds: ["Re-touch in 24 months", "Stays reactivation-surfaceable; not a hard archive"],
    nodes: [
      n("s", "fe", "start", "Not interested · already purchased"),
      n("a", "fe", "api", "Log attempt (reason: already_purchased)"),
      n("b-ins", "be", "be-effect", "Insert lead_attempts", { detail: "attempts.js" }),
      n("b-rt", "be", "be-effect", "scheduleReTouch(24mo)", { detail: "routeOutcome.js · reactivate_by +24mo", gated: "ROUTE_OUTCOMES" }),
      n("t", "be", "terminal", "Six-month (re-touch) + Dormant", { tone: "warning" }),
    ],
    edges: [e("s", "a"), e("a", "b-ins"), e("b-ins", "b-rt"), e("b-rt", "t")],
  },

  "call_back_requested": {
    key: "call_back_requested",
    outcome: "call_back_requested",
    title: "Callback scheduled",
    whatThisDoes: "Schedules a callback; up to 2 no-answer retries, then the lead drips.",
    guidedAction: "schedule-callback",
    mandatoryBeforeCommit: false,
    predictedClose: "required",
    thresholds: ["Up to 2 callback retries, then nurture drip", "Blank time → next working evening slot"],
    nodes: [
      n("s", "fe", "start", "Callback requested"),
      n("f-when", "fe", "fe-action", "Pick callback time (or default)"),
      n("a", "fe", "api", "Log attempt + callback_at"),
      n("b-ins", "be", "be-effect", "Insert lead_attempts", { detail: "attempts.js" }),
      n("b-cb", "be", "be-effect", "Set callback_at, retry_count=0", { detail: "routeOutcome.js", gated: "ROUTE_OUTCOMES" }),
      n("t", "be", "terminal", "Pipeline — callback pending", { tone: "success" }),
    ],
    edges: [e("s", "f-when"), e("f-when", "a"), e("a", "b-ins"), e("b-ins", "b-cb"), e("b-cb", "t")],
  },

  "no_response": {
    key: "no_response",
    outcome: "no_response",
    title: "No response — keep trying",
    whatThisDoes: "Logs the unanswered call; retries until the 4th, then a recovery WhatsApp and archive.",
    guidedAction: "none",
    mandatoryBeforeCommit: false,
    predictedClose: "required",
    thresholds: ["{remaining} attempt(s) left before recovery → archive", "On the 4th unanswered call: recovery WhatsApp, then archive"],
    nodes: [
      n("s", "fe", "start", "No response (attempt {n}/4)"),
      n("a", "fe", "api", "Log attempt"),
      n("b-ins", "be", "be-effect", "Insert lead_attempts", { detail: "attempts.js" }),
      n("b-dec", "be", "decision", "4th unanswered?", { gated: "ROUTE_OUTCOMES" }),
      n("t-retry", "be", "terminal", "Stays in pipeline — try again", { tone: "warning" }),
    ],
    edges: [e("s", "a"), e("a", "b-ins"), e("b-ins", "b-dec"), e("b-dec", "t-retry", "no — retry")],
  },

  "no_response-exhausted": {
    key: "no_response-exhausted",
    outcome: "no_response",
    subState: "exhausted",
    title: "No response — exhausted (recovery → archive)",
    whatThisDoes: "Sends the recovery WhatsApp (7-day reply window), then archives the lead.",
    guidedAction: "recovery-whatsapp",
    mandatoryBeforeCommit: false,
    predictedClose: "required",
    thresholds: ["4th unanswered call archives the lead", "Recovery WhatsApp → 7-day reply window → dormant"],
    nodes: [
      n("s", "fe", "start", "4th no response"),
      n("a", "fe", "api", "Log attempt"),
      n("f-rec", "fe", "fe-action", "Send recovery WhatsApp", { detail: "chesa_recovery_v1" }),
      n("b-ins", "be", "be-effect", "Insert lead_attempts", { detail: "attempts.js" }),
      n("b-arch", "be", "be-effect", "archiveLead (exhausted)", { detail: "routeOutcome.js", gated: "ROUTE_OUTCOMES" }),
      n("b-wa", "be", "be-effect", "Recovery template sent", { detail: "recovery.js · 7-day reply window" }),
      n("t", "be", "terminal", "Dormant (re-opens on reply)", { tone: "danger" }),
    ],
    edges: [
      e("s", "a"), e("a", "f-rec"), e("a", "b-ins"), e("b-ins", "b-arch"),
      e("f-rec", "b-wa"), e("b-arch", "t"), e("b-wa", "t"),
    ],
  },

  "wrong_number": {
    key: "wrong_number",
    outcome: "wrong_number",
    title: "Wrong number (calling locked)",
    whatThisDoes: "Marks the number dead, LOCKS calling, and opens a 7-day recovery window.",
    guidedAction: "none",
    mandatoryBeforeCommit: false,
    predictedClose: "required",
    thresholds: ["Locks calling until Attempt #1 is corrected or the number is fixed", "7-day recovery window, else the scanner archives"],
    nodes: [
      n("s", "fe", "start", "Wrong number"),
      n("a", "fe", "api", "Log attempt"),
      n("f-card", "fe", "fe-action", "Wrong-number recovery card", { detail: "fix the phone → re-seed first contact" }),
      n("b-ins", "be", "be-effect", "Insert lead_attempts + wrong_number_at", { detail: "attempts.js / routeOutcome.js" }),
      n("b-lock", "be", "be-effect", "Calling locked (state machine)", { detail: "callLogState.js — 409 on further calls" }),
      n("t", "be", "terminal", "7-day recovery window", { tone: "warning" }),
    ],
    edges: [e("s", "a"), e("a", "f-card"), e("a", "b-ins"), e("b-ins", "b-lock"), e("b-lock", "t")],
  },

  "replied": {
    key: "replied",
    outcome: "replied",
    title: "Replied (WhatsApp)",
    whatThisDoes: "As a call disposition this just records the contact — real reply routing happens via the WhatsApp inbound classifier.",
    guidedAction: "none",
    mandatoryBeforeCommit: false,
    predictedClose: "required",
    thresholds: ["No routing here — inbound replies are classified by the WhatsApp webhook"],
    nodes: [
      n("s", "fe", "start", "Replied"),
      n("a", "fe", "api", "Log attempt"),
      n("b-ins", "be", "be-effect", "Insert lead_attempts (no-op route)", { detail: "routeOutcome.js → noop" }),
      n("b-wh", "be", "be-effect", "Reply routing lives in the webhook", { detail: "webhooks.js classifier — meeting/zoom/vague/stop" }),
      n("t", "be", "terminal", "Contact recorded", { tone: "success" }),
    ],
    edges: [e("s", "a"), e("a", "b-ins"), e("b-ins", "b-wh"), e("b-wh", "t")],
  },
}

/**
 * Resolve the concrete OutcomeFlow for the current form state. The form AND the
 * explainer call this so they always agree.
 */
export function resolveFlow(outcome: CallOutcome | "", ctx: OutcomeContext): OutcomeFlow | null {
  if (!outcome) return null
  switch (outcome) {
    case "engaged":
      return OUTCOME_FLOWS[ctx.readyNow ? "engaged-ready" : "engaged-nurture"]
    case "not_interested":
      return ctx.niReason ? OUTCOME_FLOWS[`not_interested-${ctx.niReason}`] ?? null : OUTCOME_FLOWS["not_interested-genuine_no"]
    case "no_response":
      return OUTCOME_FLOWS[ctx.attemptNumber >= 4 ? "no_response-exhausted" : "no_response"]
    case "call_back_requested":
      return OUTCOME_FLOWS["call_back_requested"]
    case "wrong_number":
      return OUTCOME_FLOWS["wrong_number"]
    case "replied":
      return OUTCOME_FLOWS["replied"]
    default:
      return null
  }
}

/** Interpolate {n}/{remaining} placeholders in titles/thresholds with live context. */
export function fillTokens(text: string, ctx: OutcomeContext): string {
  const remaining = Math.max(0, 4 - ctx.attemptNumber)
  return text.replace(/\{n\}/g, String(ctx.attemptNumber)).replace(/\{remaining\}/g, String(remaining))
}
