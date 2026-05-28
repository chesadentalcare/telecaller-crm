// Central lead type definitions. Every view that consumes a list of leads
// imports from here so a backend change ripples through one file, not seven.
//
// As real fields land (SAP cardCode, BP type, owner ID, addresses), extend
// LeadBase first — narrower types pick up new fields automatically.

export type LeadStatus = "new" | "contacted" | "qualified" | "meeting-scheduled"
export type DripTrack = "1-month" | "3-month" | "6-month"
export type InterestLevel = "hot" | "warm" | "cold" | "just_exploring"

export interface LeadBase {
  id: string
  name: string
  phone: string
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
}

// Gap #8 — sales handed this lead back to telecaller
export interface ReactivationLead extends LeadBase {
  handedBackAt: string
  handedBackBy: string
  reason: string
}

// Gap #11 — long-cycle nurture pool
export interface SixMonthLead extends LeadBase {
  reactivateBy: string
  source: string
  reason: string
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
}
