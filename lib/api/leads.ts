// All telecaller API calls — one place per endpoint.
//
// Backend wraps every response in `{ success: true, data: ..., message? }`,
// so each helper here unwraps `.data` and returns just the payload. Errors
// (4xx/5xx) become thrown ApiError instances from lib/api/client.ts.
//
// The mapping from "what the form submits" → "what the backend expects" lives
// in this file too, so forms can pass their schema-shaped values straight in.

import { api } from "./client"
import { endpoints } from "@/lib/api-config"
import type { LeadIntakeValues } from "@/lib/schemas/lead-intake"
import type { RapidQualificationValues } from "@/lib/schemas/rapid-qualification"
import type { FullQualificationValues } from "@/lib/schemas/full-qualification"
import type { ZoomMeetingValues } from "@/lib/schemas/zoom-meeting"
import type { PhysicalMeetingValues } from "@/lib/schemas/physical-meeting"
import type { CallOutcome } from "@/lib/schemas/call-attempt"

// ─── Shared envelope ────────────────────────────────────────────────────
interface Envelope<T> {
  success: boolean
  message?: string
  data: T
}

const unwrap = <T,>(p: Promise<Envelope<T>>): Promise<T> =>
  p.then((res) => res.data)

// ─── Row shapes returned by the backend ─────────────────────────────────
export interface CreateLeadResponse {
  opportunityDocEntry: number
  cardCode: string
}

export interface LeadExtensionRow {
  id: number
  opportunity_doc_entry: number
  purchase_type: string | null
  equipment_interest: string | null
  phone_verified: 0 | 1
  decision_maker: string | null
  dentist_type: string | null
  practice_type: string | null
  budget_range: string | null
  funding_method: string | null
  assigned_to: string
  stage: string
  handed_off_at: string | null
  handoff_from: string | null
  first_call_route: "online_meeting" | "physical_meeting" | "drip_info" | "pending"
  dormant_since: string | null
  archive_reason: string | null
  created_at: string
  updated_at: string
}

export interface AttemptRow {
  id: number
  attempt_type: "call" | "whatsapp_recovery" | "retry_call"
  attempt_number: number
  outcome: CallOutcome
  attempted_by: string
  notes: string | null
  attempted_at: string
}

export interface DripStateRow {
  id: number
  opportunity_doc_entry: number
  track: "1_month" | "3_month" | "6_plus_month"
  current_message_index: number
  started_at: string
  last_message_sent_at: string | null
  next_message_at: string | null
  status: "active" | "exited_replied" | "exited_meeting_booked" | "exited_completed" | "exited_manual"
  exited_at: string | null
  exit_reason: string | null
}

export interface MeetingRow {
  id: number
  opportunity_doc_entry: number
  meeting_type: "zoom" | "physical"
  meeting_at: string
  layout_shared: 0 | 1 | null
  design_fee_discussed: 0 | 1 | null
  design_fee_paid: 0 | 1 | null
  design_fee_declined: 0 | 1 | null
  payment_proof_url: string | null
  location: string | null
  scheduled_by: string | null
  assigned_salesperson: string | null
  notes: string | null
  created_at: string
}

export interface LeadDetail {
  extension: LeadExtensionRow
  attempts: AttemptRow[]
  drip: DripStateRow | null
  meetings: MeetingRow[]
  whatsapp: Array<{
    id: number
    template_name: string
    message_type: "recovery" | "drip" | "manual"
    sent_at: string
    whatsapp_message_id: string | null
  }>
}

export interface PipelineRow {
  id: number
  equipment: string | null
  stage: string
  first_call_route: string
  assigned_to: string
  created_at: string
  updated_at: string
  failed_attempts: number
  last_attempt_time: string | null
}

export interface NoResponseRow {
  id: number
  equipment: string | null
  attempts: number
  last_attempt: string
}

export interface DripQueueRow {
  id: number
  track: "1_month" | "3_month" | "6_plus_month"
  messages_sent: number
  next_message_at: string | null
  last_engagement: string | null
  equipment: string | null
}

export interface IdleRow {
  id: number
  equipment: string | null
  idle_days: number
  last_activity: string
}

export interface DormantRow {
  id: number
  dormant_days: number
  reason: string | null
}

export interface QueueCountsResponse {
  pipeline: number
  drip: number
  dormant: number
  noResponse: number
  idle: number
  reactivation: number
  sixMonth: number
}

export interface AttemptResponse {
  attemptNumber: number
  triggerRecovery: boolean
}

// ─── Mutations ──────────────────────────────────────────────────────────
export const leadsApi = {
  create: (values: LeadIntakeValues) =>
    unwrap(api.post<Envelope<CreateLeadResponse>>(endpoints.leads, values)),

  detail: (id: number | string) =>
    unwrap(api.get<Envelope<LeadDetail>>(endpoints.leadDetail(String(id)))),

  logAttempt: (
    id: number | string,
    body: { outcome: CallOutcome; notes?: string; attempt_type?: "call" | "retry_call" },
  ) => unwrap(api.post<Envelope<AttemptResponse>>(endpoints.leadAttempt(String(id)), body)),

  rapidQualify: (id: number | string, values: RapidQualificationValues) =>
    unwrap(
      api.post<Envelope<{ opportunityDocEntry: number; route: string }>>(
        endpoints.leadRapidQualify(String(id)),
        values,
      ),
    ),

  fullQualify: (id: number | string, values: FullQualificationValues) =>
    unwrap(
      api.put<Envelope<{ opportunityDocEntry: number }>>(
        endpoints.leadFullQualify(String(id)),
        values,
      ),
    ),

  /**
   * Zoom meeting carries an optional file upload (paymentProof), so we use
   * multipart/form-data. Fields the backend reads: meeting_at, layout_shared,
   * design_fee_discussed, design_fee_paid, design_fee_declined, notes,
   * paymentProof (file).
   */
  zoomMeeting: (id: number | string, values: ZoomMeetingValues) => {
    const fd = new FormData()
    fd.append("meeting_at", values.meetingAt)
    fd.append("layout_shared", values.layoutShared === "yes" ? "true" : "false")
    // Any of the 3 enum values means the fee topic was discussed; the
    // schema enforces a non-empty value at submit time, so this is always true.
    fd.append("design_fee_discussed", "true")
    fd.append("design_fee_paid", values.designFeeStatus === "paid" ? "true" : "false")
    fd.append("design_fee_declined", values.designFeeStatus === "declined" ? "true" : "false")
    if (values.notes) fd.append("notes", values.notes)
    if (values.paymentProof) fd.append("paymentProof", values.paymentProof)
    return unwrap(
      api.post<Envelope<{ meetingId: number; paymentProofUrl: string | null }>>(
        endpoints.leadZoomMeeting(String(id)),
        fd,
      ),
    )
  },

  physicalMeeting: (id: number | string, values: PhysicalMeetingValues) =>
    unwrap(
      api.post<
        Envelope<{ meetingId: number; assignedSalesperson: string; event: string }>
      >(endpoints.leadPhysicalMeeting(String(id)), values),
    ),

  recoveryWhatsapp: (
    id: number | string,
    body: { phone: string; dentistName?: string; telecallerName?: string; equipmentInterest?: string },
  ) =>
    unwrap(
      api.post<Envelope<{ messageId: string | null; dryRun: boolean }>>(
        endpoints.leadRecoveryWhatsapp(String(id)),
        body,
      ),
    ),

  enterDrip: (
    id: number | string,
    body: { timelineBucket?: string; track?: "1_month" | "3_month" | "6_plus_month" },
  ) =>
    unwrap(
      api.post<Envelope<{ opportunityDocEntry: number; track: string }>>(
        endpoints.dripEnter(String(id)),
        body,
      ),
    ),

  exitDrip: (id: number | string, body: { reason: string; status?: string }) =>
    unwrap(
      api.post<Envelope<{ opportunityDocEntry: number; status: string; reason: string }>>(
        endpoints.dripExit(String(id)),
        body,
      ),
    ),

  updateTimeline: (id: number | string, body: { stage: string }) =>
    unwrap(
      api.put<Envelope<{ opportunityDocEntry: number; stage: string }>>(
        endpoints.leadTimeline(String(id)),
        body,
      ),
    ),

  verifyPhone: (id: number | string) =>
    unwrap(
      api.put<Envelope<{ opportunityDocEntry: number }>>(
        endpoints.leadVerifyPhone(String(id)),
      ),
    ),

  handBack: (id: number | string, body: { reason: string }) =>
    unwrap(
      api.post<Envelope<{ opportunityDocEntry: number }>>(
        endpoints.leadHandBack(String(id)),
        body,
      ),
    ),

  // ─── Queues ───────────────────────────────────────────────────────────
  queues: {
    pipeline:     () => unwrap(api.get<Envelope<PipelineRow[]>>(endpoints.queuePipeline)),
    noResponse:   () => unwrap(api.get<Envelope<NoResponseRow[]>>(endpoints.queueNoResponse)),
    drip:         () => unwrap(api.get<Envelope<DripQueueRow[]>>(endpoints.queueDrip)),
    idle:         () => unwrap(api.get<Envelope<IdleRow[]>>(endpoints.queueIdle)),
    dormant:      () => unwrap(api.get<Envelope<DormantRow[]>>(endpoints.queueDormant)),
    reactivation: () => unwrap(api.get<Envelope<Array<{ id: number; equipment: string | null; handed_back_at: string; handed_back_by: string; reason: string }>>>(endpoints.queueReactivation)),
    sixMonth:     () => unwrap(api.get<Envelope<Array<{ id: number; equipment: string | null; timeline: string; reactivate_by: string | null; reason: string | null }>>>(endpoints.queueSixMonth)),
    counts:       () => unwrap(api.get<Envelope<QueueCountsResponse>>(endpoints.queueCounts)),
  },
}
