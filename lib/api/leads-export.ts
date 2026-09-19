import { api } from "@/lib/api/client"
import { apiUrl, endpoints } from "@/lib/api-config"
import { tokenStorage } from "@/lib/auth/token"

export interface LeadStateOption {
  name: string
  count: number
}

interface Envelope<T> { success: boolean; data: T }

export const fetchLeadStates = () =>
  api.get<Envelope<LeadStateOption[]>>(endpoints.leadStates).then((res) => res.data)

export const fetchLeadSalesAssignees = () =>
  api.get<Envelope<LeadStateOption[]>>(endpoints.leadSalesAssignees).then((res) => res.data)

export type LeadsExportSection = "attempts" | "messages" | "meetings" | "quotes"
export type LeadsExportOutcome = "all" | "exclude" | "won" | "lost"
export type LeadsExportNotInterested = "exclude" | "include" | "only"

export const LEAD_EXPORT_COLUMNS: { key: string; label: string }[] = [
  { key: "id", label: "Lead ID" },
  { key: "customer_name", label: "Customer" },
  { key: "phone", label: "Phone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "source", label: "Source" },
  { key: "stage", label: "Stage" },
  { key: "flagged", label: "Flagged?" },
  { key: "assigned_to", label: "Telecaller" },
  { key: "sales_assignee", label: "Sales Assignee" },
  { key: "equipment", label: "Equipment" },
  { key: "interest_level", label: "Interest" },
  { key: "budget", label: "Budget" },
  { key: "timeline", label: "Timeline" },
  { key: "drip_track", label: "Drip Track" },
  { key: "drip_status", label: "Drip Status" },
  { key: "total_calls", label: "# Calls" },
  { key: "engaged_calls", label: "# Engaged" },
  { key: "no_response_calls", label: "# No-Resp" },
  { key: "last_call_outcome", label: "Last Call Outcome" },
  { key: "last_call_at", label: "Last Call (IST)" },
  { key: "msgs_sent", label: "# Msgs Sent" },
  { key: "msgs_received", label: "# Msgs Recvd" },
  { key: "replied", label: "Replied?" },
  { key: "handed_to_sales", label: "To Sales?" },
  { key: "meetings_count", label: "# Meetings" },
  { key: "quotes_sent", label: "# Quotes" },
  { key: "created_at", label: "Created (IST)" },
  { key: "last_inbound_at", label: "Last Inbound (IST)" },
  { key: "predicted_closing_date", label: "Predicted Close" },
  { key: "archive_reason", label: "Archive Reason" },
]

export interface LeadsExportFilters {
  from?: string
  to?: string
  source?: string
  stage?: string
  state?: string
  agent?: string
  salesAssignee?: string
  flagged?: boolean
  outcome?: LeadsExportOutcome
  notInterested?: LeadsExportNotInterested
  sections?: LeadsExportSection[]
  columns?: string[]
}

const buildQuery = (f: LeadsExportFilters): string => {
  const p = new URLSearchParams()
  if (f.from) p.set("from", f.from)
  if (f.to) p.set("to", f.to)
  if (f.source) p.set("source", f.source)
  if (f.stage) p.set("stage", f.stage)
  if (f.state) p.set("state", f.state)
  if (f.agent) p.set("agent", f.agent)
  if (f.salesAssignee) p.set("salesAssignee", f.salesAssignee)
  if (f.flagged) p.set("flagged", "1")
  if (f.outcome && f.outcome !== "all") p.set("outcome", f.outcome)
  if (f.notInterested && f.notInterested !== "exclude") p.set("notInterested", f.notInterested)
  if (f.sections) p.set("sections", f.sections.length ? f.sections.join(",") : "none")
  if (f.columns && f.columns.length) p.set("columns", f.columns.join(","))
  const s = p.toString()
  return s ? `?${s}` : ""
}

export async function downloadLeadsExport(filters: LeadsExportFilters): Promise<void> {
  const token = tokenStorage.get()
  const res = await fetch(`${apiUrl(endpoints.leadsFullExport)}${buildQuery(filters)}`, {
    method: "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!res.ok) {
    const msg = await res
      .json()
      .then((j: { message?: string }) => j?.message)
      .catch(() => null)
    if (res.status === 401) {
      throw new Error("Export was not authorized — the export service may not be deployed yet, or your session expired. Try signing in again; if it persists, the backend needs a redeploy.")
    }
    throw new Error(msg || `Export failed: ${res.status}`)
  }

  const blob = await res.blob()
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
  const filename = `chesa-leads-export-${stamp}.xlsx`

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
