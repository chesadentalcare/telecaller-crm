import { apiUrl, endpoints } from "@/lib/api-config"
import { tokenStorage } from "@/lib/auth/token"

export interface LeadsExportFilters {
  from?: string
  to?: string
  source?: string
  stage?: string
  agent?: string
}

const buildQuery = (f: LeadsExportFilters): string => {
  const p = new URLSearchParams()
  if (f.from) p.set("from", f.from)
  if (f.to) p.set("to", f.to)
  if (f.source) p.set("source", f.source)
  if (f.stage) p.set("stage", f.stage)
  if (f.agent) p.set("agent", f.agent)
  const s = p.toString()
  return s ? `?${s}` : ""
}

export async function downloadLeadsExport(filters: LeadsExportFilters): Promise<void> {
  const token = tokenStorage.get()
  const res = await fetch(`${apiUrl(endpoints.leadsFullExport)}${buildQuery(filters)}`, {
    method: "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (res.status === 401) {
    tokenStorage.clear()
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.assign("/login")
    }
    throw new Error("Your session expired — please sign in again.")
  }
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
