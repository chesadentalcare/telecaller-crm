// Central lead type definitions. Every view that consumes a list of leads
// imports from here so a backend change ripples through one file, not seven.
//
// As real fields land (SAP cardCode, BP type, owner ID, addresses), extend
// LeadBase first — narrower types pick up new fields automatically.

import type { CallOutcome } from "@/lib/schemas/call-attempt"

export interface DateRange { from?: string; to?: string }

export type LeadStatus = "new" | "contacted" | "qualified" | "unqualified" | "meeting-scheduled"
export type DripTrack = "1-month" | "3-month" | "6-month"
export type InterestLevel = "hot" | "warm" | "cold" | "just_exploring"

// Issue 3 — inbound-reply indicator carried on every queue lead so a list row can
// show a "Replied" badge + the latest message snippet. `hasUnread` is true while the
// rep hasn't opened the lead's Replies tab (clears via POST /leads/:id/replies/ack).
export type ReplyIntent = "stop" | "meeting" | "zoom" | "vague"
export interface ReplyIndicator {
  hasUnread: boolean
  // True until the rep SENDS a reply back (viewing doesn't clear it) — drives the
  // amber "Needs reply" row badge so the list matches the awaiting-reply nav counts.
  awaitingReply: boolean
  body: string | null
  intent: ReplyIntent | null
  at?: string | null
}

// Issue 4 — projected nurture closure derived from the drip track cadence.
export interface DripProjection {
  projectedCompletionAt: string   // ISO date
  stageIndex: number              // 0-based index of the current/next touch
  totalStages: number
  stageLabel: string
}

export interface LeadBase {
  id: string
  name: string
  phone: string
  // Issue 3 — present on queues that surface inbound replies (pipeline/drip/
  // no-response/idle/calls-due). Undefined elsewhere.
  replied?: ReplyIndicator
  // Telecaller-flagged as high-priority. Surfaced on the lead in EVERY tab it lands in
  // (Archived / Lost / Won / No-Response / …), so a flag never gets lost when a lead moves.
  flagged?: boolean
}

// Pipeline tab — the active call queue
export interface PipelineLead extends LeadBase {
  equipment: string
  source: string
  city: string
  state?: string | null
  status: LeadStatus
  phoneVerified: boolean
  failedAttempts: number
  createdAt: Date
  lastAttemptTime?: Date
  value?: string
  // Most recent (non-superseded) call disposition — drives the URGENT "Wrong number" flag.
  lastOutcome?: CallOutcome | null
  lastOutcomeAt?: string | null
  lastOutcomeBy?: string | null
  // Engaged/qualified for a meeting but none booked yet — drives the "Meeting pending" badge.
  meetingPending?: boolean
  // Active drip track this lead is on (null when not in a drip) — drives the Active-tab track filter.
  dripTrack?: DripTrack | null
  // Drip detail — present only when the lead is on an active 1/3/6-month drip (mirrors DripLead),
  // so the merged Active row can show the same progress / next / projection block the old Nurturing tab did.
  messagesSent?: number
  totalMessages?: number
  nextMessageIn?: number
  lastEngagement?: Date | null
  dripNextChannel?: "call" | "whatsapp" | null
  dripNextLabel?: string | null
  dripLastChannel?: "call" | "whatsapp" | null
  dripLastLabel?: string | null
  projection?: DripProjection
  // (flagged now lives on LeadBase — floats to top of Active, shown with amber highlight)
}

// Drip campaign queue
export interface DripLead extends LeadBase {
  city?: string | null
  state?: string | null
  track: DripTrack
  nextMessageIn: number   // seconds until next scheduled message
  lastEngagement: Date
  messagesSent: number
  totalMessages: number
  equipment: string
  dripNextChannel?: "call" | "whatsapp" | null
  dripNextLabel?: string | null
  dripLastChannel?: "call" | "whatsapp" | null
  dripLastLabel?: string | null
  // Issue 4 — projected nurture completion + current stage label.
  projection?: DripProjection
}

// 4+ failed call attempts
export interface NoResponseLead extends LeadBase {
  attempts: number
  lastAttempt: string     // human-readable for now; switch to Date once API is real
  equipment: string
}

// No activity in N days
export interface IdleLead extends LeadBase {
  idleDays: number
  lastActivity: string
  equipment: string
}

// Long-inactive — candidates for archive
export interface DormantLead extends LeadBase {
  dormantDays: number
  reason: string
  equipment: string
  // Set when the lead was archived after a completed drip — drives the Archived
  // tab's 1/3/6-month reason sub-chip. Null for non-drip archive reasons.
  dripTrack?: DripTrack | null
}

// Drip-completed leads parked for manager/admin approval before Archived.
export interface DripCompletedLead extends LeadBase {
  completedDays: number
  reason: string
  equipment: string
  dripTrack?: DripTrack | null
}

// Closed-lost end state — the lead told us they already purchased / bought elsewhere.
export interface LostLead extends LeadBase {
  equipment: string
  reason: string
  lostReason?: string | null
  lostDaysAgo?: number
}

// Closed-won end state — the deal was won (via the app or synced from SAP).
export interface WonLead extends LeadBase {
  equipment: string
  wonDaysAgo?: number
  installationDate?: string | null
  wonBy?: string | null
}

// A lead whose customer replied on WhatsApp and is awaiting a reply back — the
// "WhatsApp Replies" worklist tab in the Due screen.
export interface RepliesDueLead extends LeadBase {
  equipment: string
  city?: string | null
  state?: string | null
  lastOutcome?: CallOutcome | null
  lastOutcomeAt?: string | null
  lastOutcomeBy?: string | null
}

// Gap #8 — sales handed this lead back to telecaller
export interface ReactivationLead extends LeadBase {
  handedBackAt: string
  handedBackBy: string
  reason: string
  equipment: string
  // Where the lead was in the drip before it was handed back — so "Assume ownership"
  // can show the rep exactly where it will resume.
  dripTrack?: string | null
  dripMessageIndex?: number | null
  dripNextAt?: string | null
}

// Gap #11 — long-cycle nurture pool. P6.12 — `retouch` marks the 24-month
// re-touch pool (already-purchased leads parked for a re-touch) so the view can
// badge them distinctly from ordinary 6+ month / reactivation leads.
export interface SixMonthLead extends LeadBase {
  reactivateBy: string
  source: string
  reason: string
  retouch: boolean
  equipment: string
}

// P6.9 — re-qualification work items (drip reply / changed-details / timing)
export interface RequalificationLead extends LeadBase {
  reason: string
  timeline: string
  requestedAgo: string
  equipment: string
}

// P6.8 — Calls-Due worklist (call_nudges)
export interface CallsDueLead extends LeadBase {
  city?: string | null
  state?: string | null
  reason: "first_contact" | "callback" | "drip_anchor" | "requalification" | "post_meeting"
  scheduledAt: Date
  slot: string | null
  equipment: string
  whatsappNumber?: string
  // Most recent call disposition (null = never called → "Fresh call").
  lastOutcome?: CallOutcome | null
  lastOutcomeAt?: string | null
  // Who logged that most recent disposition (the accountability trail).
  lastOutcomeBy?: string | null
  // Post-meeting follow-up only — the sales rep the telecaller may also call to verify
  // the visit went ahead, plus that rep's latest reported update (null until they respond).
  salesName?: string | null
  salesPhone?: string | null
  salesUpdate?: {
    event: string | null
    notes: string | null
    loggedBy: string | null
    source: string
    at: string
  } | null
}

// Meetings-Due worklist — upcoming physical/zoom meetings (parallel to Calls Due).
export interface MeetingsDueLead extends LeadBase {
  meetingId: string
  meetingType: "zoom" | "physical"
  meetingAt: Date
  equipment: string
  location?: string | null
  joinUrl?: string | null
  assignedSalesperson?: string | null
  summaryUploaded: boolean
}

// Upcoming calls (future-dated) shown in the "Upcoming Calls" modal on the Calls Due
// tab — a scheduled call_nudge (callback etc.) drops into Calls Due on its day.
export interface ScheduledCall extends LeadBase {
  reason: "callback" | "first_contact" | "requalification" | "drip_anchor"
  scheduledAt: Date
  equipment: string
  whatsappNumber?: string
  lastOutcome?: CallOutcome | null
}
export interface DripCallTouch {
  at: Date
  label: string
  dripDay: number | null
  touchIndex: number
}
export interface UpcomingDripCall extends LeadBase {
  equipment: string
  track: "1_month" | "3_month" | "6_plus_month"
  messagesSent: number
  calls: DripCallTouch[]
  whatsappNumber?: string
  // Per-lead — all this lead's projected touches share it.
  lastOutcome?: CallOutcome | null
}
export interface UpcomingCalls {
  scheduled: ScheduledCall[]
  drip: UpcomingDripCall[]
}

// Counts surfaced in sidebar / bottom-tab badges
export interface QueueCounts {
  pipeline: number
  noResponse: number
  drip: number
  idle: number
  dormant: number
  // Drip-completed leads awaiting manager/admin approval (pre-Archived).
  dripCompleted: number
  reactivation: number
  sixMonth: number
  // P7.6 — badge counts for the four Phase-6 views
  archived: number
  requalification: number
  lost: number
  won: number
  callsDue: number
  // WhatsApp awaiting-reply badges (replace the raw queue-size counts on the nav).
  callsDueAwaitingReply: number
  pipelineAwaitingReply: number
  reTouch: number
  // Amendment 2 (Theme 6) — brand-new leads with zero activity past 24h.
  neglected: number
}
