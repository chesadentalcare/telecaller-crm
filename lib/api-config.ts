/**
 * Central API configuration for the CRM dashboard.
 *
 * One place to switch backends (dev / staging / prod). When a new endpoint is
 * added anywhere in the app, register it here and import via `endpoints`.
 *
 * Future: pair with TanStack Query for server-state caching (recommended over
 * Redux/Zustand for fetched data). See README at bottom of this file.
 */

export type Environment = "dev" | "staging" | "prod"

/**
 * Per-environment base URLs — these INCLUDE the telecaller service mount, so the
 * endpoint paths below stay relative (`/leads`, not `/api/telecaller/leads`).
 *
 *   dev   → hits the standalone gateway DIRECTLY; it serves under /api/telecaller.
 *   prod  → goes through the nginx reverse-proxy, which rewrites the public
 *           `/telecaller/*` prefix onto the gateway's `/api/telecaller/*`
 *           (Option B deployment — see claude-plan/ROADMAP_TO_100.md).
 *
 * Net path on the gateway is identical in every env; only the public prefix and
 * host differ. Edit here to change where each env points.
 */
export const API_BASE_URLS: Record<Environment, string> = {
  dev:     "http://localhost:4002/api/telecaller",
  staging: "https://staging-api.chesadentalcare.com/telecaller",
  prod:    "https://api.chesadentalcare.com/telecaller",
}

/**
 * Resolves the active environment from `NEXT_PUBLIC_APP_ENV`.
 * Falls back to "prod" so anything not configured stays on production.
 *
 *   In .env.local:    NEXT_PUBLIC_APP_ENV=dev
 *   In .env.staging:  NEXT_PUBLIC_APP_ENV=staging
 *   In .env.production: NEXT_PUBLIC_APP_ENV=prod   (or unset — prod is default)
 */
export const APP_ENV: Environment =
  (process.env.NEXT_PUBLIC_APP_ENV as Environment) ?? "prod"

/**
 * Resolves the base API URL.
 *
 * Order of precedence:
 *   1. `NEXT_PUBLIC_API_BASE_URL` — explicit one-off override (full URL).
 *   2. `API_BASE_URLS[APP_ENV]` — environment-based lookup.
 *
 * Use case for (1): a developer points their local frontend at a teammate's
 * dev backend without changing APP_ENV.
 */
export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? API_BASE_URLS[APP_ENV]

// ─────────────────────────────────────────────────────────────────────────
// Shared (chesa_api_gateway) base URL
// ─────────────────────────────────────────────────────────────────────────
// Reference endpoints — /crmpro (products), /get_technicians, /sales_employees —
// live in the deployed chesa_api_gateway, not the standalone telecaller
// backend. We always hit the prod gateway for them, even during local dev,
// unless overridden. After the gateways merge, set
// NEXT_PUBLIC_SHARED_API_BASE_URL=<same as main> and these calls collapse
// back onto a single host.
export const SHARED_API_BASE_URL: string =
  process.env.NEXT_PUBLIC_SHARED_API_BASE_URL ?? "https://api.chesadentalcare.com"

/**
 * Endpoint catalog. Every API path the frontend hits lives here. To switch
 * a single call site to a different environment, only the base URL changes
 * (above) — paths stay stable.
 */
export const endpoints = {
  // Reference data
  products: "/crmpro",                    // GET — list all products
  technicians: "/get_technicians",        // GET — list technicians
  salesEmployees: "/sales_employees",     // GET — list sales employees

  // Lead lifecycle (Track 1 — see Track1_Telecaller_Dashboard_7Day_Plan.docx §4.2)
  leads: "/leads",
  leadDetail: (id: string) => `/leads/${id}`,
  leadVerifyPhone: (id: string) => `/leads/${id}/verify-phone`,
  leadAttempt: (id: string) => `/leads/${id}/attempt`,
  leadAttemptEdit: (id: string, attemptId: string) => `/leads/${id}/attempts/${attemptId}`,
  leadRapidQualify: (id: string) => `/leads/${id}/rapid-qualify`,
  leadFullQualify: (id: string) => `/leads/${id}/full-qualify`,
  leadZoomMeeting: (id: string) => `/leads/${id}/zoom-meeting`,
  leadPhysicalMeeting: (id: string) => `/leads/${id}/physical-meeting/schedule`,
  leadRecoveryWhatsapp: (id: string) => `/leads/${id}/recovery-whatsapp`,
  leadRecoverNumber: (id: string) => `/leads/${id}/recover-number`,
  leadReclassify: (id: string) => `/leads/${id}/reclassify`,
  leadAckReplies: (id: string) => `/leads/${id}/replies/ack`,
  leadTimeline: (id: string) => `/leads/${id}/timeline`,
  leadHandBack: (id: string) => `/leads/${id}/hand-back`,
  // Meeting SLAs (Phase 3)
  meetingSummaryUpload: (meetingId: string) => `/meetings/${meetingId}/summary`,
  meetingSlaStatus: (meetingId: string) => `/meetings/${meetingId}/sla`,
  meetingConfirmTimeline: (meetingId: string) => `/meetings/${meetingId}/confirm-timeline`,
  // Quotations (Phase 4)
  quotations: `/quotations`,
  quotationDetail: (id: string) => `/quotations/${id}`,
  quotationVersions: (id: string) => `/quotations/${id}/versions`,
  quotationSyncSap: (id: string) => `/quotations/${id}/sync-sap`,
  quotationPreviewPdf: (id: string) => `/quotations/${id}/preview-pdf`,
  quotationSendWhatsapp: (id: string) => `/quotations/${id}/send-whatsapp`,
  quotationRetrySend: (id: string) => `/quotations/${id}/retry-send`,
  leadQuotations: (id: string) => `/leads/${id}/quotations`,
  leadFollowUps: (id: string) => `/leads/${id}/follow-ups`,
  pendingFollowUps: `/follow-ups/pending`,
  completeFollowUp: (id: string) => `/follow-ups/${id}/complete`,
  // Discount approvals (Phase 6)
  discountLimit: `/config/discount-limit`,
  approvalStatus: (id: string) => `/quotations/${id}/approval-status`,
  requestApproval: (id: string) => `/quotations/${id}/request-approval`,
  approveDiscount: (id: string) => `/approvals/${id}/approve`,
  rejectDiscount: (id: string) => `/approvals/${id}/reject`,
  pendingApprovals: `/approvals/pending`,
  // Closure (Phase 6)
  closeLead: (id: string) => `/leads/${id}/close`,
  closureRecord: (id: string) => `/leads/${id}/closure`,
  // Sales handover (Phase 6 / Sales-track FE)
  handover: (id: string) => `/leads/${id}/handover`,
  salesPipeline: `/sales/pipeline`,
  salesUsers: `/sales/users`,
  // Analytics (Phase 7)
  dashboardAnalytics: `/analytics/dashboard`,
  flowOversight: `/analytics/flow-oversight`,
  reconciliationReport: `/reports/reconciliation`,
  // Notifications (Phase 7)
  notifications: `/notifications`,
  notificationCount: `/notifications/count`,
  markNotificationRead: (id: string) => `/notifications/${id}/read`,
  markAllNotificationsRead: `/notifications/read-all`,
  dripEnter: (id: string) => `/drip/enter/${id}`,
  dripExit: (id: string) => `/drip/exit/${id}`,
  sapEmployees: "/sap/employees",
  sapItems: "/sap/items",
  sapSources: "/sap/sources",
  sapStates: "/sap/states",
  queuePipeline: "/queue/pipeline",
  queueNoResponse: "/queue/no-response",
  queueDrip: "/queue/drip",
  queueIdle: "/queue/idle",
  queueDormant: "/queue/dormant",
  queueReactivation: "/queue/reactivation",
  queueSixMonth: "/queue/six-month",
  queueRequalification: "/queue/requalification",
  queueCalling: "/queue/calling",
  queueCounts: "/queue/counts",
} as const

/**
 * Builds a fully-qualified URL from a registered path (string) or path-builder
 * (function). Use this instead of string-concatenation at call sites.
 *
 *   apiUrl(endpoints.leadAttempt("L-001"))   → "<telecaller-base>/leads/L-001/attempt"
 *   sharedApiUrl(endpoints.products)         → "<chesa-prod>/crmpro"
 */
export const apiUrl = (path: string): string => `${API_BASE_URL}${path}`
export const sharedApiUrl = (path: string): string => `${SHARED_API_BASE_URL}${path}`

// ─────────────────────────────────────────────────────────────────────────
// On state management
// ─────────────────────────────────────────────────────────────────────────
// For server data (products, leads, employees), TanStack Query
// (@tanstack/react-query) is the right primitive — it handles caching,
// background refetch, and deduplication out of the box. Redux Toolkit and
// Zustand are designed for *client* state (UI toggles, theme, ephemeral form
// drafts), where TanStack Query is the wrong tool.
//
// When ready to add:
//   pnpm add @tanstack/react-query
//   - Wrap app in <QueryClientProvider> (app/layout.tsx)
//   - Replace `useProducts()` (in hooks/use-products.ts) body with
//     `useQuery({ queryKey: ['products'], queryFn: ... })`
//   - All other call sites keep the same shape — `{ data, isLoading, error }`
//
// If you later need shared client state (selected lead, filters across views),
// Zustand is the lighter option (~1 KB, no provider needed). Redux Toolkit is
// only worth it if you need devtools / time-travel / middleware for big apps.
