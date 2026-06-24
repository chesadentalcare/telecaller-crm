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

export function useLeadDetail(id: string | number | undefined) {
  // Detail uses useQuery, not useMutation — wrapper for symmetry; consumers
  // import everything from one file.
  const qc = useQueryClient()
  return {
    invalidate: () => qc.invalidateQueries({ queryKey: leadKeys.detail(String(id ?? "")) }),
  }
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
      ready_now?: boolean
      not_interested_reason?: "genuine_no" | "timing_budget" | "already_purchased"
      callback_at?: string
    }) => leadsApi.logAttempt(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(String(id)) })
      invalidateAllLeads(qc)
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

export function useZoomMeeting(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: ZoomMeetingValues) => leadsApi.zoomMeeting(id, values),
    onSuccess: () => invalidateAllLeads(qc),
  })
}

export function usePhysicalMeeting(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: PhysicalMeetingValues) => leadsApi.physicalMeeting(id, values),
    onSuccess: () => invalidateAllLeads(qc),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.fullDetail(String(id)) })
      invalidateAllLeads(qc)
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.notifications() })
      qc.invalidateQueries({ queryKey: leadKeys.notificationCount() })
    },
    onError: toastError("Could not mark the notification as read"),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leadsApi.markAllNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.notifications() })
      qc.invalidateQueries({ queryKey: leadKeys.notificationCount() })
    },
    onError: toastError("Could not mark all notifications as read"),
  })
}

export function useSyncQuotationToSap(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leadsApi.syncQuotationToSap(id),
    onSuccess: () => invalidateAllLeads(qc),
  })
}
