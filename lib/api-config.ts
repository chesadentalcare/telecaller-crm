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

/** Per-environment base URLs. Edit here to change where each env points. */
export const API_BASE_URLS: Record<Environment, string> = {
  dev:     "http://localhost:4002",
  staging: "https://staging-api.chesadentalcare.com",
  prod:    "https://api.chesadentalcare.com",
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
  leads: "/api/telecaller/leads",
  leadDetail: (id: string) => `/api/telecaller/leads/${id}`,
  leadVerifyPhone: (id: string) => `/api/telecaller/leads/${id}/verify-phone`,
  leadAttempt: (id: string) => `/api/telecaller/leads/${id}/attempt`,
  leadRapidQualify: (id: string) => `/api/telecaller/leads/${id}/rapid-qualify`,
  leadFullQualify: (id: string) => `/api/telecaller/leads/${id}/full-qualify`,
  leadZoomMeeting: (id: string) => `/api/telecaller/leads/${id}/zoom-meeting`,
  leadPhysicalMeeting: (id: string) => `/api/telecaller/leads/${id}/physical-meeting/schedule`,
  leadRecoveryWhatsapp: (id: string) => `/api/telecaller/leads/${id}/recovery-whatsapp`,
  leadTimeline: (id: string) => `/api/telecaller/leads/${id}/timeline`,
  leadHandBack: (id: string) => `/api/telecaller/leads/${id}/hand-back`,
  // Meeting SLAs (Phase 3)
  meetingSummaryUpload: (meetingId: string) => `/api/telecaller/meetings/${meetingId}/summary`,
  meetingSlaStatus: (meetingId: string) => `/api/telecaller/meetings/${meetingId}/sla`,
  meetingConfirmTimeline: (meetingId: string) => `/api/telecaller/meetings/${meetingId}/confirm-timeline`,
  // Quotations (Phase 4)
  quotations: `/api/telecaller/quotations`,
  quotationDetail: (id: string) => `/api/telecaller/quotations/${id}`,
  quotationVersions: (id: string) => `/api/telecaller/quotations/${id}/versions`,
  quotationSyncSap: (id: string) => `/api/telecaller/quotations/${id}/sync-sap`,
  quotationSendWhatsapp: (id: string) => `/api/telecaller/quotations/${id}/send-whatsapp`,
  leadQuotations: (id: string) => `/api/telecaller/leads/${id}/quotations`,
  leadFollowUps: (id: string) => `/api/telecaller/leads/${id}/follow-ups`,
  pendingFollowUps: `/api/telecaller/follow-ups/pending`,
  completeFollowUp: (id: string) => `/api/telecaller/follow-ups/${id}/complete`,
  dripEnter: (id: string) => `/api/telecaller/drip/enter/${id}`,
  dripExit: (id: string) => `/api/telecaller/drip/exit/${id}`,
  sapEmployees: "/api/telecaller/sap/employees",
  sapItems: "/api/telecaller/sap/items",
  queuePipeline: "/api/telecaller/queue/pipeline",
  queueNoResponse: "/api/telecaller/queue/no-response",
  queueDrip: "/api/telecaller/queue/drip",
  queueIdle: "/api/telecaller/queue/idle",
  queueDormant: "/api/telecaller/queue/dormant",
  queueReactivation: "/api/telecaller/queue/reactivation",
  queueSixMonth: "/api/telecaller/queue/six-month",
  queueCounts: "/api/telecaller/queue/counts",
} as const

/**
 * Builds a fully-qualified URL from a registered path (string) or path-builder
 * (function). Use this instead of string-concatenation at call sites.
 *
 *   apiUrl(endpoints.leadAttempt("L-001"))   → "<telecaller-base>/api/telecaller/leads/L-001/attempt"
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
