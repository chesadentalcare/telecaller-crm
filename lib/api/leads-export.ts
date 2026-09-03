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

export type LeadsExportSection = "attempts" | "messages" | "meetings" | "quotes"

export interface LeadsExportFilters {
  from?: string
  to?: string
  source?: string
  stage?: string
  state?: string
  agent?: string
  flagged?: boolean
  sections?: LeadsExportSection[]
}

const buildQuery = (f: LeadsExportFilters): string => {
  const p = new URLSearchParams()
  if (f.from) p.set("from", f.from)
  if (f.to) p.set("to", f.to)
  if (f.source) p.set("source", f.source)
  if (f.stage) p.set("stage", f.stage)
  if (f.state) p.set("state", f.state)
  if (f.agent) p.set("agent", f.agent)
  if (f.flagged) p.set("flagged", "1")
  if (f.sections) p.set("sections", f.sections.length ? f.sections.join(",") : "none")
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
  const disposition = res.headers.get("Content-Disposition") || ""
  const match = disposition.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] || "chesa-leads-export.xlsx"

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
