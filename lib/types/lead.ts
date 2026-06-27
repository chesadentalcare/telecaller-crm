// Central lead type definitions. Every view that consumes a list of leads
// imports from here so a backend change ripples through one file, not seven.
//
// As real fields land (SAP cardCode, BP type, owner ID, addresses), extend
// LeadBase first — narrower types pick up new fields automatically.

import type { CallOutcome } from "@/lib/schemas/call-attempt"

export type LeadStatus = "new" | "contacted" | "qualified" | "unqualified" | "meeting-scheduled"
export type DripTrack = "1-month" | "3-month" | "6-month"
export type InterestLevel = "hot" | "warm" | "cold" | "just_exploring"

// Issue 3 — inbound-reply indicator carried on every queue lead so a list row can
// show a "Replied" badge + the latest message snippet. `hasUnread` is true while the
// rep hasn't opened the lead's Replies tab (clears via POST /leads/:id/replies/ack).
export type ReplyIntent = "stop" | "meeting" | "zoom" | "vague"
export interface ReplyIndicator {
  hasUnread: boolean
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
}

// Pipeline tab — the active call queue
export interface PipelineLead extends LeadBase {
  equipment: string
  source: string
  city: string
  status: LeadStatus
  phoneVerified: boolean
  failedAttempts: number
  createdAt: Date
  lastAttemptTime?: Date
  value?: string
}

// Drip campaign queue
export interface DripLead extends LeadBase {
  track: DripTrack
  nextMessageIn: number   // seconds until next scheduled message
  lastEngagement: Date
  messagesSent: number
  totalMessages: number
  equipment: string
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
}

// Gap #8 — sales handed this lead back to telecaller
export interface ReactivationLead extends LeadBase {
  handedBackAt: string
  handedBackBy: string
  reason: string
  equipment: string
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
  reason: "first_contact" | "callback" | "drip_anchor" | "requalification"
  scheduledAt: Date
  slot: string | null
  equipment: string
  whatsappNumber?: string
  // Most recent call disposition (null = never called → "Fresh call").
  lastOutcome?: CallOutcome | null
  lastOutcomeAt?: string | null
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
  reactivation: number
  sixMonth: number
  // P7.6 — badge counts for the four Phase-6 views
  archived: number
  requalification: number
  callsDue: number
  reTouch: number
  // Amendment 2 (Theme 6) — brand-new leads with zero activity past 24h.
  neglected: number
}
