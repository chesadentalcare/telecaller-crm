"use client"

// One file with all telecaller mutations. Each hook follows the same shape:
//   - calls the API via leadsApi
//   - invalidates the right query keys on success so list views + counts
//     refresh without manual refetch wiring at call sites
//
// Call sites just do:
//   const { mutateAsync: createLead, isPending } = useCreateLead()
//   await createLead(values)

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { leadsApi } from "@/lib/api/leads"
import type { QuickLeadInput, NotificationRow, LeadDetail, AttemptRow } from "@/lib/api/leads"
import { userStorage } from "@/lib/auth/token"
import { ApiError } from "@/lib/api/client"
import { leadKeys } from "@/hooks/use-leads"
import type { LeadIntakeValues } from "@/lib/schemas/lead-intake"
import type { QualificationValues } from "@/lib/schemas/qualification"
import type { LeadEditValues } from "@/lib/schemas/lead-edit"
import type { ZoomMeetingValues } from "@/lib/schemas/zoom-meeting"
import type { PhysicalMeetingValues } from "@/lib/schemas/physical-meeting"
import type { CallOutcome } from "@/lib/schemas/call-attempt"
import type { QuotationValues } from "@/lib/schemas/quotation"

// Invalidate everything queue-y. Used after any write that could change
// what a list/badge displays — broad invalidation is fine here because the
// queries are cheap and we have a small set of them.
const invalidateAllLeads = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: leadKeys.all })

// Surface a failed mutation to the user. Mutations are otherwise silent on
// error (TanStack only tracks isError/error), so call sites that don't render
// their own error UI still get a toast. ApiError carries the server message;
// fall back to a caller-supplied label otherwise.
const toastError = (fallback: string) => (err: unknown) =>
  toast.error(err instanceof ApiError ? err.message : fallback)

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: LeadIntakeValues) => leadsApi.create(values),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

// Merged daily entry (Meta-ads flow): create the lead + record the first call
// response in one atomic call; the backend routes it (drip / meeting / callback).
export function useQuickCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: QuickLeadInput) => leadsApi.quickCreate(input),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function useLeadDetail(id: string | number | undefined) {
  // Detail uses useQuery, not useMutation — wrapper for symmetry; consumers
  // import everything from one file.
  const qc = useQueryClient()
  return {
    invalidate: () => qc.invalidateQueries({ queryKey: leadKeys.detail(String(id ?? "")) }),
  }
}

// Toggle the "flagged" high-priority marker on a pipeline lead.
// Optimistically patches the cached list entry so the flag icon and row
// highlight flip immediately, without waiting for a server round-trip.
export function useFlagLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, flagged }: { id: string | number; flagged: boolean }) =>
      leadsApi.flag(id, flagged),
    onMutate: async ({ id, flagged }) => {
      // Cancel any in-flight refetch so it doesn't overwrite our optimistic value.
      await qc.cancelQueries({ queryKey: leadKeys.all })
      // Snapshot the previous value for rollback.
      const prev = qc.getQueriesData({ queryKey: leadKeys.all })
      // Optimistically update every cached pipeline list.
      qc.setQueriesData({ queryKey: leadKeys.all }, (old: unknown) => {
        if (!Array.isArray(old)) return old
        return old.map((lead: { id: string }) =>
          String(lead.id) === String(id) ? { ...lead, flagged } : lead,
        )
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      // Rollback on error.
      if (ctx?.prev) {
        ctx.prev.forEach(([key, data]) => qc.setQueryData(key, data))
      }
      toast.error("Failed to update flag — please try again")
    },
    onSettled: () => invalidateAllLeads(qc),
  })
}

export function useLogAttempt(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      outcome: CallOutcome
      notes?: string
      attempt_type?: "call" | "retry_call"
      // Amendment 2 (Theme 4): optional — not-interested outcomes may omit it.
      predicted_closing_date?: string
      // Predicted-close provenance: 'manual' when the rep overrode the auto value; omit
      // (or 'auto_track') when they confirmed the projection. The server upgrades to
      // 'drip_confirmed' for an engaged call logged after a customer reply.
      predicted_close_source?: "manual" | "auto_track"
      ready_now?: boolean
      not_interested_reason?: "genuine_no" | "timing_budget" | "already_purchased"
      bought_from_us?: boolean
      callback_at?: string
    }) => leadsApi.logAttempt(id, body),
    onMutate: async (body) => {
      const key = leadKeys.fullDetail(String(id))
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<LeadDetail>(key)
      if (prev && Array.isArray(prev.attempts)) {
        const me = userStorage.get()
        const optimistic: AttemptRow = {
          id: -Date.now(),
          attempt_type: body.attempt_type ?? "call",
          attempt_number: prev.attempts.length + 1,
          outcome: body.outcome,
          not_interested_reason: body.not_interested_reason ?? null,
          attempted_by: me?.username ?? "You",
          notes: body.notes ?? null,
          attempted_at: new Date().toISOString(),
          edited_at: null,
        }
        qc.setQueryData<LeadDetail>(key, { ...prev, attempts: [...prev.attempts, optimistic] })
      }
      return { prev }
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.prev) qc.setQueryData(leadKeys.fullDetail(String(id)), ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(String(id)) })
      qc.invalidateQueries({ queryKey: leadKeys.fullDetail(String(id)) })
      invalidateAllLeads(qc)
    },
    onSuccess: (res) => {
      // Confirm the live SAP Conversation-Activity push (created the moment the
      // call was logged). Silent when there's no call activity to push (skipped).
      const sap = res?.sapActivity
      if (sap?.synced) {
        toast.success("Call logged · pushed to SAP", {
          description: sap.activityCode ? `SAP activity #${sap.activityCode}` : undefined,
        })
      } else if (sap && !sap.skipped) {
        toast.warning("Call logged · SAP push failed", {
          description: sap.error ? `SAP: ${sap.error}` : "Will be retried.",
        })
      }
    },
  })
}

export function useEditAttempt(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ attemptId, outcome, notes }: { attemptId: string | number; outcome: CallOutcome; notes?: string }) =>
      leadsApi.editAttempt(id, attemptId, { outcome, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(String(id)) })
      invalidateAllLeads(qc)
    },
    onError: toastError("Failed to correct the attempt"),
  })
}

// Amendment 2 — single qualification bar (replaces useRapidQualify + useFullQualify).
export function useQualify(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: QualificationValues) => leadsApi.qualify(id, values),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

// Amendment 2 — full-field lead edit from the cockpit.
export function useUpdateLead(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: Partial<LeadEditValues>) => leadsApi.update(id, values),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

// Surface the on-booking WhatsApp result (join link / venue sent to the customer) so the
// rep knows the notification went out. Silent when there's no phone to notify.
const toastMeetingWhatsApp = (wa?: { ok: boolean; dryRun?: boolean; skipped?: boolean; error?: string } | null) => {
  if (!wa) return
  if (wa.ok) {
    toast.success(wa.dryRun ? "Meeting details queued on WhatsApp (dry-run)" : "Meeting details sent to the customer on WhatsApp")
  } else if (!wa.skipped) {
    toast.warning("Meeting booked · WhatsApp not sent", { description: wa.error || "Retry from the lead's Replies tab." })
  }
}

export function useZoomMeeting(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: ZoomMeetingValues) => leadsApi.zoomMeeting(id, values),
    onSuccess: (res) => {
      invalidateAllLeads(qc)
      toastMeetingWhatsApp(res?.meetingWhatsApp)
    },
  })
}

export function usePhysicalMeeting(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: PhysicalMeetingValues) => leadsApi.physicalMeeting(id, values),
    onSuccess: (res) => {
      invalidateAllLeads(qc)
      toastMeetingWhatsApp(res?.meetingWhatsApp)
    },
  })
}

// Amendment 2 (Theme 8) — edit a Zoom meeting's outcome + send the design-fee link.
// Resend an existing Zoom meeting's invite (email + WhatsApp). Same time, same link.
export function useResendMeeting(meetingId: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leadsApi.resendMeeting(meetingId),
    onSuccess: (res) => {
      invalidateAllLeads(qc)
      const wa = res?.meetingWhatsApp
      toast.success(
        wa?.ok
          ? (wa.dryRun ? "Invite resent · email + WhatsApp (dry-run)" : "Invite resent · email + WhatsApp")
          : "Invite email resent (no WhatsApp number on file)",
      )
    },
    onError: toastError("Failed to resend the meeting invite"),
  })
}

// Item 10c — send a custom PDF brochure to the customer as a WhatsApp document.
export function useSendBrochure(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => leadsApi.sendBrochure(id, file),
    onSuccess: (res) => {
      invalidateAllLeads(qc)
      toast.success(res?.dryRun ? "Brochure sent (dry-run)" : "Brochure sent to the customer")
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to send the brochure"),
  })
}

// Reschedule an existing Zoom meeting — keeps the same join link, re-sends the invite.
export function useRescheduleMeeting(meetingId: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { meeting_at: string; duration_minutes?: number; notes?: string }) =>
      leadsApi.rescheduleMeeting(meetingId, body),
    onSuccess: (res) => {
      invalidateAllLeads(qc)
      toast.success(
        res?.zoomUpdated
          ? "Zoom meeting rescheduled · invite re-sent (same link)"
          : "Meeting rescheduled · invite re-sent",
      )
    },
    onError: toastError("Failed to reschedule the meeting"),
  })
}

// Soft-cancel a duplicate / no-longer-needed meeting — hides it from the worklist and
// the cockpit scheduled-meetings list (reversible on the backend).
export function useCancelMeeting(meetingId: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leadsApi.cancelMeeting(meetingId),
    onSuccess: () => {
      invalidateAllLeads(qc)
      toast.success("Meeting cancelled")
    },
    onError: toastError("Failed to cancel the meeting"),
  })
}

export function useUpdateZoomOutcome(meetingId: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { outcome_notes?: string; design_fee_discussed?: boolean; design_fee_paid?: boolean; design_fee_declined?: boolean }) =>
      leadsApi.updateZoomOutcome(meetingId, body),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function useSendDesignerFeeLink(meetingId: string | number) {
  return useMutation({
    mutationFn: () => leadsApi.sendDesignerFeeLink(meetingId),
  })
}

export function useRecoveryWhatsapp(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      phone: string; dentistName?: string; telecallerName?: string; equipmentInterest?: string
    }) => leadsApi.recoveryWhatsapp(id, body),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function useRecoverNumber(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { phone: string; whatsappNumber?: string }) => leadsApi.recoverNumber(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(String(id)) })
      invalidateAllLeads(qc)
    },
    onError: toastError("Failed to recover the number"),
  })
}

// P6.14 — manual classifier override for an inbound WhatsApp reply.
export function useReclassifyInbound(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { inboundId: number; intent: "stop" | "meeting" | "zoom" | "vague" }) =>
      leadsApi.reclassifyInbound(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(String(id)) })
      invalidateAllLeads(qc)
    },
    onError: toastError("Failed to reclassify the reply"),
  })
}

// Issue 3 — mark a lead's inbound replies as read; clears the "Replied" badge on
// the queues. Silent (no toast): it fires automatically when the Replies tab opens.
export function useAckReplies(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leadsApi.ackReplies(id),
    onMutate: () => {
      const prev = qc.getQueriesData({ queryKey: leadKeys.all })
      qc.setQueriesData({ queryKey: leadKeys.all }, (old: unknown) => {
        if (!Array.isArray(old)) return old
        return old.map((lead: { id?: string | number; replied?: { hasUnread?: boolean } }) =>
          lead && String(lead.id) === String(id) && lead.replied
            ? { ...lead, replied: { ...lead.replied, hasUnread: false } }
            : lead,
        )
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, data]) => qc.setQueryData(key, data))
    },
  })
}

// Two-way reply — send a free-text WhatsApp message to the customer from the lead's
// Replies thread. Invalidates the full detail (re-renders the thread) and the queue
// counts (clears this lead from the awaiting-reply badge). Toast surfaces a closed
// 24h window / opt-out so the rep knows why a send was refused.
export function useSendReply(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { text: string }) => leadsApi.sendReply(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.fullDetail(String(id)) })
      qc.invalidateQueries({ queryKey: leadKeys.queueCounts() })
      invalidateAllLeads(qc)
    },
    onError: toastError("Failed to send the reply"),
  })
}

export function useSendSalesReply(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { text: string }) => leadsApi.sendSalesReply(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.fullDetail(String(id)) })
    },
    onError: toastError("Failed to message the sales rep"),
  })
}

export function useEnterDrip(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { timelineBucket?: string; track?: "1_month" | "3_month" | "6_plus_month" }) =>
      leadsApi.enterDrip(id, body),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function useExitDrip(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { reason: string; status?: string }) => leadsApi.exitDrip(id, body),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function useUpdateTimeline(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { stage: string }) => leadsApi.updateTimeline(id, body),
    onSuccess: () => invalidateAllLeads(qc),
    onError: toastError("Failed to update the timeline stage"),
  })
}

export function useVerifyPhone(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leadsApi.verifyPhone(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(String(id)) })
      invalidateAllLeads(qc)
    },
  })
}

export function useHandBackLead(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { reason: string }) => leadsApi.handBack(id, body),
    onSuccess: () => invalidateAllLeads(qc),
    onError: toastError("Failed to hand the lead back to the telecaller"),
  })
}

// One-button revive: un-archive a filed lead back to No Response + flag re-qualification.
export function useUnarchiveToNoResponse(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leadsApi.unarchiveToNoResponse(id),
    onSuccess: () => {
      invalidateAllLeads(qc)
      toast.success("Brought back as No Response — flagged for re-qualification")
    },
    onError: toastError("Failed to un-archive the lead"),
  })
}

export function useAssumeOwnership(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leadsApi.assumeOwnership(id),
    onSuccess: (res) => {
      invalidateAllLeads(qc)
      toast.success(res.resumedDrip ? "Ownership assumed — drip resumed where it left off" : "Ownership assumed")
    },
    onError: toastError("Failed to assume ownership"),
  })
}

// Drip-Completed approval (manager/admin). Approve → the selected leads move to Archived;
// Reject → they go back into the pipeline (re-qualify). Both accept one or many lead ids.
export function useApproveArchive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => leadsApi.approveArchive(ids),
    onSuccess: (res) => {
      invalidateAllLeads(qc)
      toast.success(`Approved · ${res.approved} lead${res.approved === 1 ? "" : "s"} moved to Archived`)
    },
    onError: toastError("Failed to approve"),
  })
}

export function useRejectArchive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => leadsApi.rejectArchive(ids),
    onSuccess: (res) => {
      invalidateAllLeads(qc)
      toast.success(`Sent back · ${res.rejected} lead${res.rejected === 1 ? "" : "s"} returned to the pipeline`)
    },
    onError: toastError("Failed to send back"),
  })
}

// Post-meeting follow-up — record the sales rep's response (from the Calls Due card, when
// the telecaller had to call the rep). Refreshes Calls Due so the card shows the reported update.
export function useAddSalesUpdate(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { notes: string; event?: string; amount?: number }) =>
      leadsApi.addSalesUpdate(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.callsDue() })
      invalidateAllLeads(qc)
      toast.success("Sales rep's response logged")
    },
    onError: toastError("Failed to log the rep's response"),
  })
}

export function useUploadMeetingSummary(meetingId: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => leadsApi.uploadMeetingSummary(meetingId, file),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function useConfirmDecisionTimeline(meetingId: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leadsApi.confirmDecisionTimeline(meetingId),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function useCreateQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: QuotationValues) => leadsApi.createQuotation(values),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function useUpdateQuotation(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: Partial<QuotationValues>) => leadsApi.updateQuotation(id, values),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function useSendQuotationWhatsapp(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { phone: string; customerName?: string }) =>
      leadsApi.sendQuotationWhatsapp(id, body),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function usePreviewQuotationPdf(id: string | number) {
  return useMutation({
    mutationFn: () => leadsApi.previewQuotationPdf(id),
  })
}

export function useRetryQuotationSend(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { phone: string; customerName?: string }) =>
      leadsApi.retryQuotationSend(id, body),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function useCompleteFollowUp(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { objectionType: string; nextActionDate: string; notes?: string }) =>
      leadsApi.completeFollowUp(id, body),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function useRequestApproval(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leadsApi.requestApproval(id),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function useApproveDiscount(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body?: { notes?: string }) => leadsApi.approveDiscount(id, body),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function useRejectDiscount(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body?: { notes?: string }) => leadsApi.rejectDiscount(id, body),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function useCloseLead(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => leadsApi.closeLead(id, formData),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function useLookupSapOrder(id: string | number) {
  return useMutation({
    mutationFn: (docNum: string | number) => leadsApi.lookupSapOrder(id, docNum),
  })
}

export function useHandover(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { salesUsername: string }) => leadsApi.handover(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(String(id)) })
      qc.invalidateQueries({ queryKey: leadKeys.salesPipeline() })
      invalidateAllLeads(qc)
    },
    onError: toastError("Failed to hand the lead over to sales"),
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => leadsApi.markNotificationRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: leadKeys.notifications() })
      await qc.cancelQueries({ queryKey: leadKeys.notificationCount() })
      const prevList = qc.getQueryData<NotificationRow[]>(leadKeys.notifications())
      const prevCount = qc.getQueryData<{ count: number }>(leadKeys.notificationCount())
      const wasUnread = prevList?.some((n) => String(n.id) === String(id) && !n.is_read) ?? false
      if (prevList) {
        qc.setQueryData<NotificationRow[]>(
          leadKeys.notifications(),
          prevList.map((n) => (String(n.id) === String(id) ? { ...n, is_read: 1 } : n)),
        )
      }
      if (prevCount && wasUnread) {
        qc.setQueryData<{ count: number }>(leadKeys.notificationCount(), {
          ...prevCount,
          count: Math.max(0, prevCount.count - 1),
        })
      }
      return { prevList, prevCount }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prevList) qc.setQueryData(leadKeys.notifications(), ctx.prevList)
      if (ctx?.prevCount) qc.setQueryData(leadKeys.notificationCount(), ctx.prevCount)
      toast.error("Could not mark the notification as read")
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: leadKeys.notifications() })
      qc.invalidateQueries({ queryKey: leadKeys.notificationCount() })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leadsApi.markAllNotificationsRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: leadKeys.notifications() })
      await qc.cancelQueries({ queryKey: leadKeys.notificationCount() })
      const prevList = qc.getQueryData<NotificationRow[]>(leadKeys.notifications())
      const prevCount = qc.getQueryData<{ count: number }>(leadKeys.notificationCount())
      if (prevList) {
        qc.setQueryData<NotificationRow[]>(
          leadKeys.notifications(),
          prevList.map((n) => (n.is_read ? n : { ...n, is_read: 1 })),
        )
      }
      if (prevCount) {
        qc.setQueryData<{ count: number }>(leadKeys.notificationCount(), { ...prevCount, count: 0 })
      }
      return { prevList, prevCount }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevList) qc.setQueryData(leadKeys.notifications(), ctx.prevList)
      if (ctx?.prevCount) qc.setQueryData(leadKeys.notificationCount(), ctx.prevCount)
      toast.error("Could not mark all notifications as read")
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: leadKeys.notifications() })
      qc.invalidateQueries({ queryKey: leadKeys.notificationCount() })
    },
  })
}

export function useSyncQuotationToSap(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leadsApi.syncQuotationToSap(id),
    onSuccess: () => invalidateAllLeads(qc),
  })
}
