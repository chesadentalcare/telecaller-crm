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
import type { QualificationValues } from "@/lib/schemas/qualification"
import type { LeadEditValues } from "@/lib/schemas/lead-edit"
import type { ZoomMeetingValues } from "@/lib/schemas/zoom-meeting"
import type { PhysicalMeetingValues } from "@/lib/schemas/physical-meeting"
import type { CallOutcome } from "@/lib/schemas/call-attempt"
import type { QuotationValues } from "@/lib/schemas/quotation"

// ─── Shared envelope ────────────────────────────────────────────────────
interface Envelope<T> {
  success: boolean
  message?: string
  data: T
}

const unwrap = <T,>(p: Promise<Envelope<T>>): Promise<T> =>
  p.then((res) => res.data)

// Issue 3 — reply-indicator columns the queue endpoints attach to each row.
export interface ReplyRowFields {
  has_unread_reply?: 0 | 1 | boolean
  last_inbound_at?: string | null
  last_inbound_body?: string | null
  last_inbound_intent?: "stop" | "meeting" | "zoom" | "vague" | null
}

// Issue 4 — projected nurture closure returned by drip endpoints.
export interface DripProjectionPayload {
  projectedCompletionAt: string
  stageIndex: number
  totalStages: number
  stageLabel: string
}

// ─── Row shapes returned by the backend ─────────────────────────────────
export interface CreateLeadResponse {
  opportunityDocEntry: number
  cardCode: string
}

export interface LeadExtensionRow {
  id: number
  opportunity_doc_entry: number
  customer_card_code: string | null
  customer_name: string | null
  phone: string | null
  phone2: string | null
  whatsapp_number: string | null
  email: string | null
  city: string | null
  state: string | null
  pincode: string | null
  address: string | null
  purchase_type: string | null
  equipment_interest: string | null
  product1_id: string | null
  product2_id: string | null
  category: string | null
  interest_level: string | null
  source: string | null
  phone_verified: 0 | 1
  timeline: string | null
  decision_maker: string | null
  dentist_type: string | null
  practice_type: string | null
  budget_range: string | null
  funding_method: string | null
  competitor_evaluated: string | null
  assigned_to: string
  stage: string
  handed_off_at: string | null
  handoff_from: string | null
  first_call_route: "online_meeting" | "physical_meeting" | "drip_info" | "pending" | "not_interested" | "nurture"
  // Amendment 2 (decision #1): SAP-native, overlaid live by getLeadDetail (predicted
  // close + closing %); cached column values when SAP is unreachable.
  predicted_closing_date: string | null
  closing_percentage: number | null
  crm_locked: 0 | 1
  crm_locked_reason: string | null
  dormant_since: string | null
  archive_reason: string | null
  // Phase 6 — routing/lifecycle columns (backend SELECT * already returns them)
  whatsapp_opted_out: 0 | 1
  requalify_pending: 0 | 1
  requalify_reason: string | null
  requalify_at: string | null
  wrong_number_at: string | null
  last_inbound_at: string | null
  callback_at: string | null
  callback_retry_count: number
  created_at: string
  updated_at: string
}

export interface AttemptRow {
  id: number
  attempt_type: "call" | "whatsapp_recovery" | "retry_call"
  attempt_number: number
  outcome: CallOutcome
  not_interested_reason: "genuine_no" | "timing_budget" | "already_purchased" | null
  attempted_by: string
  notes: string | null
  attempted_at: string
  edited_at: string | null
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
  // Issue 4 — projected completion + current stage (null when not active).
  projection?: DripProjectionPayload | null
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
  // Zoom integration fields (persisted by scheduleZoomMeeting)
  zoom_meeting_id: number | null
  zoom_join_url: string | null
  zoom_start_url: string | null
  zoom_passcode: string | null
  duration_minutes: number | null
  // Phase 3 SLA fields
  meeting_summary_url: string | null
  meeting_summary_uploaded_at: string | null
  quotation_id: number | null
  decision_timeline_confirmed: 0 | 1
  sla_summary_breached: 0 | 1
  sla_quote_breached: 0 | 1
}

export interface QuotationRow {
  id: number
  opportunity_doc_entry: number
  quote_number: string
  version: number
  is_latest: 0 | 1
  customer_card_code: string
  customer_name: string | null
  subtotal: string
  discount_pct: string
  discount_amount: string
  tax_total: string
  grand_total: string
  validity_date: string
  payment_terms: string
  status: "draft" | "sent" | "delivered" | "read" | "accepted" | "rejected" | "expired" | "failed"
  wa_message_id: string | null
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
  pdf_url: string | null
  sap_doc_entry: number | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface QuotationLineItemRow {
  id: number
  quotation_id: number
  line_number: number
  item_code: string
  description: string | null
  quantity: number
  unit_price: string
  tax_group: string | null
  tax_amount: string
  line_total: string
}

export interface QuotationDetailRow extends QuotationRow {
  lineItems: QuotationLineItemRow[]
}

export interface QuotationVersionRow {
  id: number
  quote_number: string
  version: number
  is_latest: 0 | 1
  subtotal: string
  discount_pct: string
  discount_amount: string
  tax_total: string
  grand_total: string
  status: string
  created_by: string
  created_at: string
}

export interface SapItemRow {
  itemCode: string
  itemName: string
  price: number
  stock: number
}

export interface FollowUpTaskRow {
  id: number
  opportunity_doc_entry: number
  quotation_id: number | null
  task_number: number
  due_at: string
  status: "pending" | "completed" | "overdue" | "cancelled"
  objection_type: string | null
  next_action_date: string | null
  notes: string | null
  assigned_to: string
  completed_at: string | null
  completed_by: string | null
  created_at: string
  // joined fields
  quote_number?: string
  grand_total?: string
  customer_name?: string
  equipment_interest?: string
}

export interface DiscountApprovalRow {
  id: number
  quotation_id: number
  discount_pct: string
  threshold_pct: string
  status: "pending" | "approved" | "rejected"
  requested_by: string
  requested_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  // joined fields
  quote_number?: string
  grand_total?: string
  customer_name?: string
  opportunity_doc_entry?: number
}

export interface ApprovalStatusResponse {
  quotationId: number
  discountPct: number
  thresholdPct: number
  needsApproval: boolean
  approval: DiscountApprovalRow | null
  canSend: boolean
}

export interface ClosureRecordRow {
  id: number
  opportunity_doc_entry: number
  outcome: "won" | "lost"
  signed_quote_url: string | null
  advance_payment_proof_url: string | null
  dispatch_date: string | null
  installation_date: string | null
  lost_reason: string | null
  competitor_name: string | null
  price_gap_range: string | null
  reactivation_flag: 0 | 1
  sap_order_doc_entry: number | null
  closed_by: string
  closed_at: string
}

// ─── Sales handover / pipeline ──────────────────────────────────────────
export interface SalesUserRow {
  username: string
  full_name: string | null
  role: "sale_staff" | "coordinator" | "sale_head"
  sales_person_code: number | null
  sap_employee_id: number | null
}

export interface SalesPipelineRow {
  id: number
  customer_name: string | null
  equipment: string | null
  budget_range: string | null
  stage: string
  assigned_to: string
  handoff_from: string | null
  handed_off_at: string | null
}

export interface DashboardAnalytics {
  today: {
    totalCalls: number
    connected: number
    noAnswer: number
    meetings: number
    conversions: number
  }
  weekly: Array<{ day: string; calls: number; connected: number }>
  pipeline: { stages: Record<string, number>; total: number }
  quotations: { total: number; sent: number; read: number; pipelineValue: number }
  closures: { won: number; lost: number }
  sla: { summaryBreaches: number; quoteBreaches: number }
  recentActivity: Array<{
    type: string; result: string; leadName: string; leadId: number; time: string; actor?: string
  }>
  /** Present only for manager / admin roles */
  teamBreakdown?: Array<{
    username: string
    totalLeads: number
    callsToday: number
    connectedToday: number
    meetingsWeek: number
    won: number
    lost: number
  }>
}

// P7.3/P7.4/P7.5 — manager flow-oversight payload (team-wide).
export interface FlowOversightAnalytics {
  dispositions: Array<{ outcome: string; count: number }>
  callbacks: { pending: number; exhausted: number }
  firstContact: { active: number; reached: number; exhausted: number; cancelled: number }
  inbound: {
    byIntent: { stop: number; meeting: number; zoom: number; vague: number }
    total: number
    matched: number
    unmatched: number
  }
  endStates: { archived: number; dormant: number; requalPending: number; optedOut: number; totalLeads: number }
  nudges: { pending: number; overdue: number }
  drip: { active: number; parked: number }
  unmatchedInbound: Array<{ id: number; fromPhone: string; body: string | null; intent: string | null; receivedAt: string }>
  engine: {
    drip: { ranAt: string; processed: number; sent: number; parked: number; staleMinutes: number | null } | null
    reconciliation: { ranAt: string; orphans: number; staleMinutes: number | null } | null
  }
}

// P7.1 — on-demand orphan reconciliation report.
export interface ReconciliationReport {
  count: number
  orphans: Array<{ id: number; name: string; assignedTo: string | null; stage: string; updatedAt: string }>
}

export interface NotificationRow {
  id: number
  recipient: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: 0 | 1
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
  quotations: QuotationRow[]
  // P6.6 — classified inbound WhatsApp replies (newest first). P6.7 — first-contact state.
  inbound?: Array<{ id: number; intent: "stop" | "meeting" | "zoom" | "vague"; body: string; received_at: string }>
  firstContact?: { current_touch_index: number; call_attempts_used: number; status: string } | null
  // Amendment 2 (decision #1): stage + predicted_closing_date on `extension` are read
  // LIVE from SAP. `sapLive` is false when that read failed and the values shown are the
  // MySQL last-known cache (decision #6) — the UI surfaces a "cached" indicator.
  sapLive?: boolean
}

export interface PipelineRow extends ReplyRowFields {
  id: number
  equipment: string | null
  source: string | null
  budget_range: string | null
  stage: string
  first_call_route: string
  assigned_to: string
  phone_verified: 0 | 1
  customer_name: string | null
  created_at: string
  updated_at: string
  failed_attempts: number
  last_attempt_time: string | null
}

export interface NoResponseRow extends ReplyRowFields {
  id: number
  equipment: string | null
  customer_name: string | null
  phone: string | null
  attempts: number
  last_attempt: string
}

export interface DripQueueRow extends ReplyRowFields {
  id: number
  track: "1_month" | "3_month" | "6_plus_month"
  messages_sent: number
  started_at: string | null
  next_message_at: string | null
  last_engagement: string | null
  equipment: string | null
  customer_name: string | null
  phone: string | null
  // Issue 4 — projected completion + current stage for the queue row.
  projection?: DripProjectionPayload | null
}

export interface IdleRow extends ReplyRowFields {
  id: number
  equipment: string | null
  customer_name: string | null
  phone: string | null
  idle_days: number
  last_activity: string
}

export interface DormantRow {
  id: number
  dormant_days: number
  reason: string | null
}

// P6.8 — Calls-Due worklist row (over call_nudges, with enriched phone).
export interface CallNudgeRow extends ReplyRowFields {
  id: number
  reason: "first_contact" | "callback" | "drip_anchor" | "requalification"
  scheduled_at: string
  slot: string | null
  status: string
  assigned_to: string
  equipment: string | null
  customer_name?: string | null
  phone: string
  whatsapp_number?: string | null
}

export interface QueueCountsResponse {
  pipeline: number
  drip: number
  dormant: number
  noResponse: number
  idle: number
  reactivation: number
  sixMonth: number
  // P7.6
  archived: number
  requalification: number
  callsDue: number
  reTouch: number
  // Amendment 2 (Theme 6) — brand-new leads with zero activity past 24h.
  neglected: number
}

export interface AttemptResponse {
  attemptNumber: number
  triggerRecovery: boolean
  route?: string // present when ROUTE_OUTCOMES=true (Phase 6 dispatcher)
  predictedClosingDate?: string
  predictedCloseSynced?: boolean // did the SAP PredictedClosingDate push succeed
}

// ─── Mutations ──────────────────────────────────────────────────────────
export const leadsApi = {
  create: (values: LeadIntakeValues) =>
    unwrap(api.post<Envelope<CreateLeadResponse>>(endpoints.leads, values)),

  detail: (id: number | string) =>
    unwrap(api.get<Envelope<LeadDetail>>(endpoints.leadDetail(String(id)))),

  logAttempt: (
    id: number | string,
    body: {
      outcome: CallOutcome
      notes?: string
      attempt_type?: "call" | "retry_call"
      // Predicted close (YYYY-MM-DD) — pushed to SAP. Amendment 2 (Theme 4): optional;
      // not-interested outcomes may omit it (the server no longer forces a date there).
      predicted_closing_date?: string
      // Phase 6 routing inputs (honored when ROUTE_OUTCOMES=true; additive, ignored otherwise)
      ready_now?: boolean
      not_interested_reason?: "genuine_no" | "timing_budget" | "already_purchased"
      callback_at?: string
    },
  ) => unwrap(api.post<Envelope<AttemptResponse>>(endpoints.leadAttempt(String(id)), body)),

  editAttempt: (
    id: number | string,
    attemptId: number | string,
    body: { outcome: CallOutcome; notes?: string },
  ) =>
    unwrap(
      api.patch<Envelope<{ id: number; outcome: CallOutcome; notes: string | null }>>(
        endpoints.leadAttemptEdit(String(id), String(attemptId)),
        body,
      ),
    ),

  // Amendment 2 — full-field lead edit (PATCH). Sends only changed fields; backend
  // writes MySQL + SAP BusinessPartner (awaited) and reports sapSynced.
  update: (id: number | string, body: Partial<LeadEditValues>) =>
    unwrap(
      api.patch<Envelope<{ opportunityDocEntry: number; phoneReset: boolean; sapSynced: boolean; sapReason?: string }>>(
        endpoints.leadUpdate(String(id)),
        body,
      ),
    ),

  // Amendment 2 — single qualification bar. Backend commits the MySQL capture and
  // reports `sapSynced` for the awaited SAP write (predicted close + competitors + stage).
  qualify: (id: number | string, values: QualificationValues) =>
    unwrap(
      api.put<Envelope<{
        opportunityDocEntry: number
        stage: string
        route: string
        predictedClosingDate: string
        wasRequalification: boolean
        sapSynced: boolean
        sapReason?: string
      }>>(
        endpoints.leadQualify(String(id)),
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
    if (values.durationMinutes) fd.append("duration_minutes", String(values.durationMinutes))
    if (values.notes) fd.append("notes", values.notes)
    if (values.extraEmails) fd.append("extra_emails", values.extraEmails)
    if (values.paymentProof) fd.append("paymentProof", values.paymentProof)
    return unwrap(
      api.post<
        Envelope<{
          meetingId: number
          paymentProofUrl: string | null
          stage: string | null
          stageChanged: boolean
          zoomCreated: boolean
          zoomJoinUrl: string | null
          zoomStartUrl: string | null
          zoomPasscode: string | null
        }>
      >(endpoints.leadZoomMeeting(String(id)), fd),
    )
  },

  physicalMeeting: (id: number | string, values: PhysicalMeetingValues) =>
    unwrap(
      api.post<
        Envelope<{ meetingId: number; assignedSalesperson: string; sapSynced: boolean; event: string }>
      >(endpoints.leadPhysicalMeeting(String(id)), {
        meetingAt: values.meetingAt,
        location: values.location,
        // Amendment 2 — named sales employee + reconfirmed address fire the handover.
        salesUsername: values.salesUsername,
        address: values.address,
        extraEmails: values.extraEmails || undefined,
      }),
    ),

  // Amendment 2 (Theme 8) — edit the Zoom call-log outcome post-meeting (no stage re-trigger).
  updateZoomOutcome: (
    meetingId: number | string,
    body: { outcome_notes?: string; design_fee_discussed?: boolean; design_fee_paid?: boolean; design_fee_declined?: boolean },
  ) => unwrap(api.put<Envelope<{ meetingId: number }>>(endpoints.meetingZoomOutcome(String(meetingId)), body)),

  // Amendment 2 (Theme 8) — send the ₹5,000 designer-fee payment link (stubbed seam).
  sendDesignerFeeLink: (meetingId: number | string) =>
    unwrap(
      api.post<Envelope<{ meetingId: number; amount: number; url: string | null; ref: string | null; provider: string; enabled: boolean }>>(
        endpoints.meetingDesignFeeLink(String(meetingId)),
        {},
      ),
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

  // P6.5 — correct a wrong number; backend re-seeds first contact on the new number.
  recoverNumber: (
    id: number | string,
    body: { phone: string; whatsappNumber?: string },
  ) =>
    unwrap(
      api.post<Envelope<{ opportunityDocEntry: number }>>(
        endpoints.leadRecoverNumber(String(id)),
        body,
      ),
    ),

  // P6.14 — manual classifier override: correct the intent of an inbound reply.
  reclassifyInbound: (
    id: number | string,
    body: { inboundId: number; intent: "stop" | "meeting" | "zoom" | "vague" },
  ) =>
    unwrap(
      api.post<Envelope<{ intent: string; unchanged?: boolean }>>(
        endpoints.leadReclassify(String(id)),
        body,
      ),
    ),

  enterDrip: (
    id: number | string,
    body: { timelineBucket?: string; track?: "1_month" | "3_month" | "6_plus_month" },
  ) =>
    unwrap(
      api.post<Envelope<{ opportunityDocEntry: number; track: string; projection: DripProjectionPayload | null }>>(
        endpoints.dripEnter(String(id)),
        body,
      ),
    ),

  // Issue 3 — mark a lead's inbound replies as read (clears the "Replied" badge).
  ackReplies: (id: number | string) =>
    unwrap(
      api.post<Envelope<{ acknowledged: number }>>(endpoints.leadAckReplies(String(id))),
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

  // ─── Meeting SLAs ────────────────────────────────────────────────────
  uploadMeetingSummary: (meetingId: number | string, file: File) => {
    const fd = new FormData()
    fd.append("meetingSummary", file)
    return unwrap(
      api.put<Envelope<{ meetingId: number; summaryUrl: string; withinSla: boolean; hoursElapsed: number }>>(
        endpoints.meetingSummaryUpload(String(meetingId)),
        fd,
      ),
    )
  },

  getMeetingSlaStatus: (meetingId: number | string) =>
    unwrap(
      api.get<Envelope<{
        meetingId: number
        meetingType: string
        meetingAt: string
        hoursElapsed: number
        summary: { uploaded: boolean; url: string | null; uploadedAt: string | null; deadline: string; breached: boolean; remainingMs: number }
        quotation: { created: boolean; quotationId: number | null; deadline: string; breached: boolean; remainingMs: number }
        decisionTimelineConfirmed: boolean
      }>>(endpoints.meetingSlaStatus(String(meetingId))),
    ),

  confirmDecisionTimeline: (meetingId: number | string) =>
    unwrap(
      api.put<Envelope<{ meetingId: number }>>(
        endpoints.meetingConfirmTimeline(String(meetingId)),
      ),
    ),

  // ─── Quotations ─────────────────────────────────────────────────────
  createQuotation: (values: QuotationValues) =>
    unwrap(
      api.post<Envelope<{ quotationId: number; quoteNumber: string; version: number; grandTotal: number }>>(
        endpoints.quotations,
        values,
      ),
    ),

  getQuotation: (id: number | string) =>
    unwrap(api.get<Envelope<QuotationDetailRow>>(endpoints.quotationDetail(String(id)))),

  updateQuotation: (id: number | string, values: Partial<QuotationValues>) =>
    unwrap(
      api.put<Envelope<{ quotationId: number; previousId: number; quoteNumber: string; version: number; grandTotal: number }>>(
        endpoints.quotationDetail(String(id)),
        values,
      ),
    ),

  getLeadQuotations: (leadId: number | string) =>
    unwrap(api.get<Envelope<QuotationRow[]>>(endpoints.leadQuotations(String(leadId)))),

  getQuotationVersions: (id: number | string) =>
    unwrap(api.get<Envelope<QuotationVersionRow[]>>(endpoints.quotationVersions(String(id)))),

  syncQuotationToSap: (id: number | string) =>
    unwrap(
      api.post<Envelope<{ quotationId: number; sapDocEntry: number }>>(
        endpoints.quotationSyncSap(String(id)),
      ),
    ),

  // ─── SAP Items ──────────────────────────────────────────────────────
  // ─── Quotation Delivery (Phase 5) ───────────────────────────────
  previewQuotationPdf: (id: number | string) =>
    unwrap(api.get<Envelope<{ pdfUrl: string }>>(endpoints.quotationPreviewPdf(String(id)))),

  sendQuotationWhatsapp: (id: number | string, body: { phone: string; customerName?: string }) =>
    unwrap(
      api.post<Envelope<{
        quotationId: number; messageId: string | null; dryRun: boolean;
        pdfUrl: string
      }>>(endpoints.quotationSendWhatsapp(String(id)), body),
    ),

  retryQuotationSend: (id: number | string, body: { phone: string; customerName?: string }) =>
    unwrap(
      api.post<Envelope<{
        quotationId: number; messageId: string | null; dryRun: boolean; pdfUrl: string
      }>>(endpoints.quotationRetrySend(String(id)), body),
    ),

  // ─── Follow-Ups (Phase 5) ─────────────────────────────────────
  getLeadFollowUps: (leadId: number | string) =>
    unwrap(api.get<Envelope<FollowUpTaskRow[]>>(endpoints.leadFollowUps(String(leadId)))),

  getPendingFollowUps: () =>
    unwrap(api.get<Envelope<FollowUpTaskRow[]>>(endpoints.pendingFollowUps)),

  completeFollowUp: (id: number | string, body: {
    objectionType: string; nextActionDate: string; notes?: string
  }) =>
    unwrap(
      api.put<Envelope<{ taskId: number; objectionType: string; nextActionDate: string }>>(
        endpoints.completeFollowUp(String(id)),
        body,
      ),
    ),

  // ─── Discount Approvals (Phase 6) ───────────────────────────────
  getDiscountLimit: () =>
    unwrap(api.get<Envelope<{ thresholdPct: number }>>(endpoints.discountLimit)),

  getApprovalStatus: (id: number | string) =>
    unwrap(api.get<Envelope<ApprovalStatusResponse>>(endpoints.approvalStatus(String(id)))),

  requestApproval: (id: number | string) =>
    unwrap(
      api.post<Envelope<{ approvalId: number; discountPct: number; thresholdPct: number }>>(
        endpoints.requestApproval(String(id)),
      ),
    ),

  approveDiscount: (id: number | string, body?: { notes?: string }) =>
    unwrap(
      api.put<Envelope<{ approvalId: number; quotationId: number }>>(
        endpoints.approveDiscount(String(id)),
        body,
      ),
    ),

  rejectDiscount: (id: number | string, body?: { notes?: string }) =>
    unwrap(
      api.put<Envelope<{ approvalId: number; quotationId: number }>>(
        endpoints.rejectDiscount(String(id)),
        body,
      ),
    ),

  getPendingApprovals: () =>
    unwrap(api.get<Envelope<DiscountApprovalRow[]>>(endpoints.pendingApprovals)),

  // ─── Closure (Phase 6) ────────────────────────────────────────
  closeLead: (id: number | string, formData: FormData) =>
    unwrap(
      api.put<Envelope<{
        opportunityDocEntry: number; outcome: string;
        sapOrderDocEntry?: number; stage?: string; reactivationFlag?: boolean
      }>>(endpoints.closeLead(String(id)), formData),
    ),

  getClosureRecord: (id: number | string) =>
    unwrap(api.get<Envelope<ClosureRecordRow | null>>(endpoints.closureRecord(String(id)))),

  // ─── Sales handover / pipeline ──────────────────────────────────
  handover: (id: number | string, body: { salesUsername: string }) =>
    unwrap(
      api.post<Envelope<{
        opportunityDocEntry: number; assignedTo: string;
        salesPersonCode: number; sapEmployeeId: number; sapSynced: boolean
      }>>(endpoints.handover(String(id)), body),
    ),

  getSalesUsers: () =>
    unwrap(api.get<Envelope<SalesUserRow[]>>(endpoints.salesUsers)),

  getSalesPipeline: () =>
    unwrap(api.get<Envelope<SalesPipelineRow[]>>(endpoints.salesPipeline)),

  // ─── SAP Items ──────────────────────────────────────────────────
  getSapItems: (q?: string) =>
    unwrap(
      api.get<Envelope<SapItemRow[]>>(
        q ? `${endpoints.sapItems}?q=${encodeURIComponent(q)}` : endpoints.sapItems,
      ),
    ),

  // ─── Analytics (Phase 7) ────────────────────────────────────────────
  getDashboardAnalytics: () =>
    unwrap(api.get<Envelope<DashboardAnalytics>>(endpoints.dashboardAnalytics)),

  // Manager flow-oversight + on-demand orphan reconciliation (manager/admin only).
  getFlowOversight: () =>
    unwrap(api.get<Envelope<FlowOversightAnalytics>>(endpoints.flowOversight)),

  getReconciliation: () =>
    unwrap(api.get<Envelope<ReconciliationReport>>(endpoints.reconciliationReport)),

  // ─── Notifications (Phase 7) ──────────────────────────────────────
  getNotifications: (limit = 20, offset = 0) =>
    unwrap(api.get<Envelope<NotificationRow[]>>(`${endpoints.notifications}?limit=${limit}&offset=${offset}`)),

  getUnreadNotificationCount: () =>
    unwrap(api.get<Envelope<{ count: number }>>(endpoints.notificationCount)),

  markNotificationRead: (id: number | string) =>
    unwrap(api.put<Envelope<unknown>>(endpoints.markNotificationRead(String(id)))),

  markAllNotificationsRead: () =>
    unwrap(api.put<Envelope<unknown>>(endpoints.markAllNotificationsRead)),

  // ─── Queues ───────────────────────────────────────────────────────────
  queues: {
    pipeline:     () => unwrap(api.get<Envelope<PipelineRow[]>>(endpoints.queuePipeline)),
    noResponse:   () => unwrap(api.get<Envelope<NoResponseRow[]>>(endpoints.queueNoResponse)),
    drip:         () => unwrap(api.get<Envelope<DripQueueRow[]>>(endpoints.queueDrip)),
    idle:         () => unwrap(api.get<Envelope<IdleRow[]>>(endpoints.queueIdle)),
    dormant:      () => unwrap(api.get<Envelope<DormantRow[]>>(endpoints.queueDormant)),
    reactivation: () => unwrap(api.get<Envelope<Array<{ id: number; equipment: string | null; handed_back_at: string; handed_back_by: string; reason: string }>>>(endpoints.queueReactivation)),
    sixMonth:     () => unwrap(api.get<Envelope<Array<{ id: number; equipment: string | null; source: string | null; timeline: string; reactivate_by: string | null; reason: string | null; retouch?: number | boolean }>>>(endpoints.queueSixMonth)),
    requalification: () => unwrap(api.get<Envelope<Array<{ id: number; equipment: string | null; reason: string; requalify_at: string; timeline: string | null }>>>(endpoints.queueRequalification)),
    calling:      () => unwrap(api.get<Envelope<CallNudgeRow[]>>(endpoints.queueCalling)),
    counts:       () => unwrap(api.get<Envelope<QueueCountsResponse>>(endpoints.queueCounts)),
  },
}
