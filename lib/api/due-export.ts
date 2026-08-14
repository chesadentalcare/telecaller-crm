import { api } from "./client"
import { apiUrl, endpoints } from "@/lib/api-config"
import { tokenStorage } from "@/lib/auth/token"

interface Envelope<T> {
  success: boolean
  message?: string
  data: T
}

export type DueExportType = "both" | "calls" | "meetings" | "replies"

export interface DueExportFilters {
  type: DueExportType
  from?: string
  to?: string
  agent?: string
  outcome?: string[]
}

export interface DueExportAgent {
  username: string
  full_name: string | null
  role: string
}

const buildQuery = (f: DueExportFilters): string => {
  const p = new URLSearchParams()
  if (f.type && f.type !== "both") p.set("type", f.type)
  if (f.from) p.set("from", f.from)
  if (f.to) p.set("to", f.to)
  if (f.agent) p.set("agent", f.agent)
  if (f.outcome?.length) p.set("outcome", f.outcome.join(","))
  const s = p.toString()
  return s ? `?${s}` : ""
}

export async function downloadDueExport(filters: DueExportFilters): Promise<void> {
  const token = tokenStorage.get()
  const res = await fetch(`${apiUrl(endpoints.dueExport)}${buildQuery(filters)}`, {
    method: "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!res.ok) {
    const msg = await res
      .json()
      .then((j: { message?: string }) => j?.message)
      .catch(() => null)
    throw new Error(msg || `Export failed: ${res.status}`)
  }

  const blob = await res.blob()
  const disposition = res.headers.get("Content-Disposition") || ""
  const match = disposition.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] || `calls-meetings-due.xlsx`

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const fetchDueExportAgents = () =>
  api
    .get<Envelope<DueExportAgent[]>>(endpoints.dueExportAgents)
    .then((res) => res.data)
