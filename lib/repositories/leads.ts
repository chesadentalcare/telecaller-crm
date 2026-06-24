// Repository layer — translates raw backend rows into the shapes the views
// already expect (lib/types/lead.ts). The view code doesn't change when a
// backend field is renamed; only this file changes.
//
// What's missing: the backend currently only stores opportunity_doc_entry +
// telecaller-owned fields. Customer name / phone / source live in SAP. Until
// the backend enriches its responses (or we add a /lookup endpoint that
// pulls from SAP cache), we show "Lead #<docEntry>" as a placeholder name.
// The pipeline can be replaced as soon as the backend enriches.

import type {
  PipelineLead,
  DripLead,
  NoResponseLead,
  IdleLead,
  DormantLead,
  ReactivationLead,
  SixMonthLead,
  RequalificationLead,
  CallsDueLead,
  QueueCounts,
  LeadStatus,
  DripTrack,
} from "@/lib/types/lead"
import { leadsApi } from "@/lib/api/leads"
import type {
  PipelineRow,
  DripQueueRow,
  NoResponseRow,
  IdleRow,
  DormantRow,
  CallNudgeRow,
  ReplyRowFields,
} from "@/lib/api/leads"
import type { ReplyIndicator, DripProjection } from "@/lib/types/lead"

// ─── helpers ────────────────────────────────────────────────────────────
const placeholderName = (id: number | string) => `Lead #${id}`
const placeholderPhone = "—"

const parseDate = (s: string | null | undefined): Date | undefined =>
  s ? new Date(s) : undefined

const stageToStatus = (stage: string): LeadStatus => {
  if (stage === "physical_meeting_scheduled" || stage === "zoom_meeting_done")
    return "meeting-scheduled"
  if (stage === "full_qualified" || stage === "rapid_qualified") return "qualified"
  if (stage === "new") return "new"
  return "contacted"
}

const trackBackToFront = (t: string): DripTrack => {
  if (t === "1_month") return "1-month"
  if (t === "3_month") return "3-month"
  return "6-month"
}

// Issue 3 — fold the backend reply columns into a ReplyIndicator, or undefined
// when the lead has never received an inbound reply (so rows stay clean).
const toReplied = (r: ReplyRowFields): ReplyIndicator | undefined => {
  if (!r.last_inbound_at && !r.last_inbound_body) return undefined
  return {
    hasUnread: !!r.has_unread_reply,
    body: r.last_inbound_body ?? null,
    intent: r.last_inbound_intent ?? null,
    at: r.last_inbound_at ?? null,
  }
}

// Issue 4 — pass the backend projection straight through (shapes match).
const toProjection = (p?: { projectedCompletionAt: string; stageIndex: number; totalStages: number; stageLabel: string } | null): DripProjection | undefined =>
  p ? { ...p } : undefined

// ─── mappers ────────────────────────────────────────────────────────────
const toPipeline = (r: PipelineRow): PipelineLead => ({
  id: String(r.id),
  name: r.customer_name || placeholderName(r.id),
  phone: placeholderPhone,
  equipment: r.equipment ?? "—",
  source: r.source || "—",
  city: "—",
  status: stageToStatus(r.stage),
  phoneVerified: !!r.phone_verified,
  failedAttempts: Number(r.failed_attempts) || 0,
  createdAt: new Date(r.created_at),
  lastAttemptTime: parseDate(r.last_attempt_time),
  value: r.budget_range || undefined,
  replied: toReplied(r),
})

const toDrip = (r: DripQueueRow): DripLead => {
  const next = r.next_message_at ? new Date(r.next_message_at).getTime() : null
  const nextMessageIn = next ? Math.max(0, Math.floor((next - Date.now()) / 1000)) : 0
  return {
    id: String(r.id),
    name: r.customer_name || placeholderName(r.id),
    phone: r.phone || placeholderPhone,
    track: trackBackToFront(r.track),
    nextMessageIn,
    lastEngagement: r.last_engagement ? new Date(r.last_engagement) : new Date(0),
    messagesSent: r.messages_sent,
    totalMessages: r.track === "1_month" ? 9 : r.track === "3_month" ? 19 : 13,
    equipment: r.equipment ?? "—",
    replied: toReplied(r),
    projection: toProjection(r.projection),
  }
}

const toNoResponse = (r: NoResponseRow): NoResponseLead => ({
  id: String(r.id),
  name: r.customer_name || placeholderName(r.id),
  phone: r.phone || placeholderPhone,
  attempts: r.attempts,
  lastAttempt: humanAgo(r.last_attempt),
  equipment: r.equipment ?? "—",
  replied: toReplied(r),
})

const toIdle = (r: IdleRow): IdleLead => ({
  id: String(r.id),
  name: r.customer_name || placeholderName(r.id),
  phone: r.phone || placeholderPhone,
  idleDays: r.idle_days,
  lastActivity: humanAgo(r.last_activity),
  equipment: r.equipment ?? "—",
  replied: toReplied(r),
})

const toDormant = (r: DormantRow): DormantLead => ({
  id: String(r.id),
  name: placeholderName(r.id),
  phone: placeholderPhone,
  dormantDays: r.dormant_days,
  reason: r.reason ?? "no response",
})

// Row shapes for the reactivation / six-month queues are declared inline on
// leadsApi.queues.* — mirror them here so the mappers stay type-safe.
type ReactivationRow = {
  id: number
  equipment: string | null
  handed_back_at: string
  handed_back_by: string
  reason: string
}

type SixMonthRow = {
  id: number
  equipment: string | null
  timeline: string
  reactivate_by: string | null
  reason: string | null
  source?: string | null
  retouch?: number | boolean
}

const toReactivation = (r: ReactivationRow): ReactivationLead => ({
  id: String(r.id),
  name: placeholderName(r.id),
  phone: placeholderPhone,
  handedBackAt: humanAgo(r.handed_back_at),
  handedBackBy: r.handed_back_by,
  reason: r.reason ?? "—",
})

const toSixMonth = (r: SixMonthRow): SixMonthLead => ({
  id: String(r.id),
  name: placeholderName(r.id),
  phone: placeholderPhone,
  reactivateBy: r.reactivate_by ?? "—",
  source: r.source ?? "—",
  reason: r.reason ?? "—",
  retouch: !!r.retouch, // MySQL boolean expr → 0/1; coerce to bool
})

type RequalRow = { id: number; equipment: string | null; reason: string; requalify_at: string; timeline: string | null }
const toRequalification = (r: RequalRow): RequalificationLead => ({
  id: String(r.id),
  name: placeholderName(r.id),
  phone: placeholderPhone,
  reason: r.reason ?? "—",
  timeline: r.timeline ?? "—",
  requestedAgo: humanAgo(r.requalify_at),
  equipment: r.equipment ?? "—",
})

const toCallsDue = (r: CallNudgeRow): CallsDueLead => ({
  id: String(r.id),
  name: r.customer_name || placeholderName(r.id),
  phone: r.phone || placeholderPhone, // P6.8 — enriched phone passes through (not the placeholder)
  reason: r.reason,
  scheduledAt: new Date(r.scheduled_at),
  slot: r.slot,
  equipment: r.equipment ?? "—",
  whatsappNumber: r.whatsapp_number ?? undefined,
  replied: toReplied(r),
})

// Tiny relative-time helper. The mock data already used strings like
// "30 min ago", so views format these directly. Keeps the type shape stable.
function humanAgo(iso: string): string {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60_000)
  if (m < 1)   return "just now"
  if (m < 60)  return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24)  return `${h} hour${h === 1 ? "" : "s"} ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? "" : "s"} ago`
}

// ─── public fetchers ────────────────────────────────────────────────────
export const fetchPipelineLeads = async (): Promise<PipelineLead[]> => {
  const rows = await leadsApi.queues.pipeline()
  return rows.map(toPipeline)
}

export const fetchDripLeads = async (): Promise<DripLead[]> => {
  const rows = await leadsApi.queues.drip()
  return rows.map(toDrip)
}

export const fetchNoResponseLeads = async (): Promise<NoResponseLead[]> => {
  const rows = await leadsApi.queues.noResponse()
  return rows.map(toNoResponse)
}

export const fetchIdleLeads = async (): Promise<IdleLead[]> => {
  const rows = await leadsApi.queues.idle()
  return rows.map(toIdle)
}

export const fetchDormantLeads = async (): Promise<DormantLead[]> => {
  const rows = await leadsApi.queues.dormant()
  return rows.map(toDormant)
}

export const fetchReactivationLeads = async (): Promise<ReactivationLead[]> => {
  const rows = await leadsApi.queues.reactivation()
  return rows.map(toReactivation)
}

export const fetchSixMonthLeads = async (): Promise<SixMonthLead[]> => {
  const rows = await leadsApi.queues.sixMonth()
  return rows.map(toSixMonth)
}

export const fetchRequalificationLeads = async (): Promise<RequalificationLead[]> => {
  const rows = await leadsApi.queues.requalification()
  return rows.map(toRequalification)
}

export const fetchCallsDueLeads = async (): Promise<CallsDueLead[]> => {
  const rows = await leadsApi.queues.calling()
  return rows.map(toCallsDue)
}

export const fetchQueueCounts = async (): Promise<QueueCounts> => {
  const c = await leadsApi.queues.counts()
  return {
    pipeline: c.pipeline,
    noResponse: c.noResponse,
    drip: c.drip,
    idle: c.idle,
    dormant: c.dormant,
    reactivation: c.reactivation,
    sixMonth: c.sixMonth,
    archived: c.archived,
    requalification: c.requalification,
    callsDue: c.callsDue,
    reTouch: c.reTouch,
    neglected: c.neglected ?? 0,
  }
}

// Pipeline-level "find by id" used by lead-detail. The detail endpoint
// returns much richer data — for the existing PipelineLead-shaped consumer
// (hooks/use-leads.ts: useLeadById), we synthesize the shape from the
// extension row.
export async function fetchLeadById(id: string): Promise<PipelineLead | null> {
  try {
    const detail = await leadsApi.detail(id)
    return {
      id: String(detail.extension.opportunity_doc_entry),
      name: detail.extension.customer_name || placeholderName(detail.extension.opportunity_doc_entry),
      phone: placeholderPhone,
      equipment: detail.extension.equipment_interest ?? "—",
      source: "—",
      city: "—",
      status: stageToStatus(detail.extension.stage),
      phoneVerified: !!detail.extension.phone_verified,
      failedAttempts: detail.attempts.filter(
        (a) => a.attempt_type === "call" && a.outcome === "no_response",
      ).length,
      createdAt: new Date(detail.extension.created_at),
      lastAttemptTime: detail.attempts[0] ? new Date(detail.attempts[0].attempted_at) : undefined,
    }
  } catch {
    return null
  }
}
