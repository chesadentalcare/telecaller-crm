"use client"

import { useQuery, keepPreviousData } from "@tanstack/react-query"
import {
  fetchPipelineLeads,
  fetchDripLeads,
  fetchNoResponseLeads,
  fetchIdleLeads,
  fetchDormantLeads,
  fetchDripCompletedLeads,
  fetchLostLeads,
  fetchSuggestions,
  fetchWonLeads,
  fetchRepliesDueLeads,
  fetchReactivationLeads,
  fetchSixMonthLeads,
  fetchRequalificationLeads,
  fetchCallsDueLeads,
  fetchMeetingsDueLeads,
  fetchUpcomingCalls,
  fetchQueueCounts,
  fetchLeadById,
} from "@/lib/repositories/leads"
import { leadsApi } from "@/lib/api/leads"
import { usePipelineDateRange, usePipelineStateFilter } from "@/lib/pipeline-date-filter"

// Single source of truth for query keys. Group prefix `leads` lets us
// invalidate everything with `queryClient.invalidateQueries({ queryKey: ['leads'] })`.
// Pattern lifted from TanStack docs / kentcdodds query-key-factory.
export const leadKeys = {
  all: ["leads"] as const,
  pipeline: () => [...leadKeys.all, "pipeline"] as const,
  drip: () => [...leadKeys.all, "drip"] as const,
  noResponse: () => [...leadKeys.all, "no-response"] as const,
  idle: () => [...leadKeys.all, "idle"] as const,
  dormant: () => [...leadKeys.all, "dormant"] as const,
  dripCompleted: () => [...leadKeys.all, "drip-completed"] as const,
  lost: () => [...leadKeys.all, "lost"] as const,
  suggestions: () => [...leadKeys.all, "suggestions"] as const,
  won: () => [...leadKeys.all, "won"] as const,
  repliesDue: () => [...leadKeys.all, "replies-due"] as const,
  reactivation: () => [...leadKeys.all, "reactivation"] as const,
  sixMonth: () => [...leadKeys.all, "six-month"] as const,
  requalification: () => [...leadKeys.all, "requalification"] as const,
  callsDue: () => [...leadKeys.all, "calls-due"] as const,
  meetingsDue: () => [...leadKeys.all, "meetings-due"] as const,
  dripCalls: () => [...leadKeys.all, "drip-calls"] as const,
  detail: (id: string) => [...leadKeys.all, "detail", id] as const,
  fullDetail: (id: string) => [...leadKeys.all, "full-detail", id] as const,
  queueCounts: () => [...leadKeys.all, "queue-counts"] as const,
  quotation: (id: string) => [...leadKeys.all, "quotation", id] as const,
  leadQuotations: (id: string) => [...leadKeys.all, "lead-quotations", id] as const,
  quotationVersions: (id: string) => [...leadKeys.all, "quotation-versions", id] as const,
  leadFollowUps: (id: string) => [...leadKeys.all, "lead-follow-ups", id] as const,
  pendingFollowUps: () => [...leadKeys.all, "pending-follow-ups"] as const,
  approvalStatus: (id: string) => [...leadKeys.all, "approval-status", id] as const,
  pendingApprovals: () => [...leadKeys.all, "pending-approvals"] as const,
  closureRecord: (id: string) => [...leadKeys.all, "closure", id] as const,
  closureOrderContext: (id: string) => [...leadKeys.all, "closure-order-context", id] as const,
  discountLimit: () => [...leadKeys.all, "discount-limit"] as const,
  salesPipeline: () => [...leadKeys.all, "sales-pipeline"] as const,
  salesUsers: () => [...leadKeys.all, "sales-users"] as const,
  dashboardAnalytics: () => [...leadKeys.all, "dashboard-analytics"] as const,
  flowOversight: () => [...leadKeys.all, "flow-oversight"] as const,
  reconciliation: () => [...leadKeys.all, "reconciliation"] as const,
  notifications: () => [...leadKeys.all, "notifications"] as const,
  notificationCount: () => [...leadKeys.all, "notification-count"] as const,
}

const keepList = { placeholderData: keepPreviousData } as const

export function usePipelineLeads() {
  const r = usePipelineDateRange()
  const s = usePipelineStateFilter()
  return useQuery({ queryKey: [...leadKeys.pipeline(), r, s],    queryFn: () => fetchPipelineLeads(r, s), ...keepList })
}
export function useDripLeads() {
  const r = usePipelineDateRange()
  const s = usePipelineStateFilter()
  return useQuery({ queryKey: [...leadKeys.drip(), r, s],        queryFn: () => fetchDripLeads(r, s), ...keepList })
}
export function useNoResponseLeads() {
  const r = usePipelineDateRange()
  const s = usePipelineStateFilter()
  return useQuery({ queryKey: [...leadKeys.noResponse(), r, s],  queryFn: () => fetchNoResponseLeads(r, s), ...keepList })
}
export function useIdleLeads() {
  const r = usePipelineDateRange()
  const s = usePipelineStateFilter()
  return useQuery({ queryKey: [...leadKeys.idle(), r, s],        queryFn: () => fetchIdleLeads(r, s), ...keepList })
}
export function useDormantLeads() {
  const r = usePipelineDateRange()
  const s = usePipelineStateFilter()
  return useQuery({ queryKey: [...leadKeys.dormant(), r, s],     queryFn: () => fetchDormantLeads(r, s), ...keepList })
}
export function useDripCompletedLeads() {
  const r = usePipelineDateRange()
  const s = usePipelineStateFilter()
  return useQuery({ queryKey: [...leadKeys.dripCompleted(), r, s], queryFn: () => fetchDripCompletedLeads(r, s), ...keepList })
}
export function useWonLeads() {
  const r = usePipelineDateRange()
  const s = usePipelineStateFilter()
  return useQuery({ queryKey: [...leadKeys.won(), r, s],         queryFn: () => fetchWonLeads(r, s), ...keepList })
}
export function useRepliesDueLeads() {
  return useQuery({ queryKey: leadKeys.repliesDue(),  queryFn: fetchRepliesDueLeads, ...keepList })
}
export function useLostLeads() {
  const r = usePipelineDateRange()
  const s = usePipelineStateFilter()
  return useQuery({ queryKey: [...leadKeys.lost(), r, s],        queryFn: () => fetchLostLeads(r, s), ...keepList })
}
export function useSuggestions() {
  return useQuery({ queryKey: leadKeys.suggestions(), queryFn: fetchSuggestions, ...keepList })
}
export function useReactivationLeads() {
  const r = usePipelineDateRange()
  const s = usePipelineStateFilter()
  return useQuery({ queryKey: [...leadKeys.reactivation(), r, s], queryFn: () => fetchReactivationLeads(r, s), ...keepList })
}
export function useSixMonthLeads() {
  const r = usePipelineDateRange()
  const s = usePipelineStateFilter()
  return useQuery({ queryKey: [...leadKeys.sixMonth(), r, s],    queryFn: () => fetchSixMonthLeads(r, s), ...keepList })
}
export function useRequalificationLeads() {
  const r = usePipelineDateRange()
  const s = usePipelineStateFilter()
  return useQuery({ queryKey: [...leadKeys.requalification(), r, s], queryFn: () => fetchRequalificationLeads(r, s), ...keepList })
}
export function useCallsDueLeads() {
  return useQuery({ queryKey: leadKeys.callsDue(),    queryFn: fetchCallsDueLeads, ...keepList })
}
export function useUpcomingCalls() {
  return useQuery({ queryKey: leadKeys.dripCalls(),   queryFn: fetchUpcomingCalls, ...keepList })
}
export function useMeetingsDueLeads() {
  return useQuery({ queryKey: leadKeys.meetingsDue(), queryFn: fetchMeetingsDueLeads, ...keepList })
}
export function useLeadById(id: string | undefined) {
  return useQuery({
    queryKey: leadKeys.detail(id ?? "__noop__"),
    queryFn: () => fetchLeadById(id!),
    enabled: Boolean(id),
  })
}
/** Full lead view — extension + attempts + drip + meetings + whatsapp logs. */
export function useLeadFullDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: leadKeys.fullDetail(String(id ?? "__noop__")),
    queryFn: () => leadsApi.detail(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  })
}

/** SLA status for a physical meeting — countdown timers, breach flags. */
export function useMeetingSlaStatus(meetingId: string | number | undefined) {
  return useQuery({
    queryKey: [...leadKeys.all, "meeting-sla", String(meetingId ?? "__noop__")] as const,
    queryFn: () => leadsApi.getMeetingSlaStatus(meetingId!),
    enabled: Boolean(meetingId),
    refetchInterval: 60_000, // refresh every minute for live countdowns
  })
}

/** Single quotation with line items. */
export function useQuotation(id: string | number | undefined) {
  return useQuery({
    queryKey: leadKeys.quotation(String(id ?? "__noop__")),
    queryFn: () => leadsApi.getQuotation(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  })
}

/** All latest quotations for a lead. */
export function useLeadQuotations(leadId: string | number | undefined) {
  return useQuery({
    queryKey: leadKeys.leadQuotations(String(leadId ?? "__noop__")),
    queryFn: () => leadsApi.getLeadQuotations(leadId!),
    enabled: Boolean(leadId),
    staleTime: 30_000,
  })
}

/** SAP Items for quotation builder — fetched from Ashva inventory. */
export function useSapItems() {
  return useQuery({
    queryKey: [...leadKeys.all, "sap-items"] as const,
    queryFn: () => leadsApi.getSapItems(),
    staleTime: 10 * 60 * 1000, // 10 min — same as backend cache
  })
}

/** Version history for a quotation. */
export function useQuotationVersions(id: string | number | undefined) {
  return useQuery({
    queryKey: leadKeys.quotationVersions(String(id ?? "__noop__")),
    queryFn: () => leadsApi.getQuotationVersions(id!),
    enabled: Boolean(id),
  })
}

/** Follow-up tasks for a specific lead. */
export function useLeadFollowUps(leadId: string | number | undefined) {
  return useQuery({
    queryKey: leadKeys.leadFollowUps(String(leadId ?? "__noop__")),
    queryFn: () => leadsApi.getLeadFollowUps(leadId!),
    enabled: Boolean(leadId),
    staleTime: 30_000,
  })
}

/** All pending/overdue follow-ups for the current user. */
export function usePendingFollowUps() {
  return useQuery({
    queryKey: leadKeys.pendingFollowUps(),
    queryFn: () => leadsApi.getPendingFollowUps(),
    staleTime: 60_000,
    ...keepList,
  })
}

/** Approval status for a specific quotation. */
export function useApprovalStatus(quotationId: string | number | undefined) {
  return useQuery({
    queryKey: leadKeys.approvalStatus(String(quotationId ?? "__noop__")),
    queryFn: () => leadsApi.getApprovalStatus(quotationId!),
    enabled: Boolean(quotationId),
    staleTime: 15_000,
  })
}

/** All pending discount approvals (manager view). */
export function usePendingApprovals() {
  return useQuery({
    queryKey: leadKeys.pendingApprovals(),
    queryFn: () => leadsApi.getPendingApprovals(),
    staleTime: 30_000,
    ...keepList,
  })
}

/** Closure record for a lead. */
export function useClosureRecord(leadId: string | number | undefined) {
  return useQuery({
    queryKey: leadKeys.closureRecord(String(leadId ?? "__noop__")),
    queryFn: () => leadsApi.getClosureRecord(leadId!),
    enabled: Boolean(leadId),
  })
}

export function useClosureOrderContext(leadId: string | number | undefined, enabled = true) {
  return useQuery({
    queryKey: leadKeys.closureOrderContext(String(leadId ?? "__noop__")),
    queryFn: () => leadsApi.getClosureOrderContext(leadId!),
    enabled: Boolean(leadId) && enabled,
    staleTime: 60_000,
  })
}

/** Discount threshold config. */
export function useDiscountLimit() {
  return useQuery({
    queryKey: leadKeys.discountLimit(),
    queryFn: () => leadsApi.getDiscountLimit(),
    staleTime: 5 * 60_000,
  })
}

/** Leads handed over to sales (role-scoped server-side). */
export function useSalesPipeline() {
  return useQuery({
    queryKey: leadKeys.salesPipeline(),
    queryFn: () => leadsApi.getSalesPipeline(),
    staleTime: 30_000,
    ...keepList,
  })
}

export function useSalesUsers(enabled = true, oppId?: number | string) {
  return useQuery({
    queryKey: [...leadKeys.salesUsers(), oppId ?? null],
    queryFn: () => leadsApi.getSalesUsers(oppId),
    staleTime: 5 * 60_000,
    enabled,
  })
}

/** Dashboard analytics — aggregated KPIs, charts, activity. */
export function useDashboardAnalytics() {
  return useQuery({
    queryKey: leadKeys.dashboardAnalytics(),
    queryFn: () => leadsApi.getDashboardAnalytics(),
    staleTime: 60_000,
  })
}

/** P7.3 — manager flow-oversight analytics (manager/admin only). */
export function useFlowOversight() {
  return useQuery({
    queryKey: leadKeys.flowOversight(),
    queryFn: () => leadsApi.getFlowOversight(),
    staleTime: 60_000,
    refetchInterval: 120_000, // engine-health + queue numbers drift; refresh periodically
  })
}

/** P7.1 — on-demand orphan reconciliation report (manager/admin only). */
export function useReconciliation() {
  return useQuery({
    queryKey: leadKeys.reconciliation(),
    queryFn: () => leadsApi.getReconciliation(),
    staleTime: 60_000,
  })
}

/** Notifications list. */
export function useNotifications(limit = 20) {
  return useQuery({
    queryKey: leadKeys.notifications(),
    queryFn: () => leadsApi.getNotifications(limit),
    staleTime: 30_000,
    refetchInterval: 60_000, // keep list in sync with the polled badge count
  })
}

/** Unread notification count for the bell badge. */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: leadKeys.notificationCount(),
    queryFn: () => leadsApi.getUnreadNotificationCount(),
    staleTime: 30_000,
    refetchInterval: 60_000, // poll every minute for live badge
  })
}

export function useQueueCountsQuery() {
  const r = usePipelineDateRange()
  const s = usePipelineStateFilter()
  return useQuery({
    queryKey: [...leadKeys.queueCounts(), r, s],
    queryFn: () => fetchQueueCounts(r, s),
    // Badges update more often than reference data — let stale go after 30s.
    staleTime: 30_000,
    ...keepList,
  })
}
