import { apiUrl, endpoints } from "@/lib/api-config"
import { tokenStorage } from "@/lib/auth/token"

export interface WonExportRange {
  from?: string
  to?: string
}

export async function downloadWonExport(range?: WonExportRange): Promise<void> {
  const token = tokenStorage.get()
  const p = new URLSearchParams()
  if (range?.from) p.set("from", range.from)
  if (range?.to) p.set("to", range.to)
  const qs = p.toString()

  const res = await fetch(`${apiUrl(endpoints.wonOrdersExport)}${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!res.ok) {
    const msg = await res
      .json()
      .then((j: { message?: string }) => j?.message)
      .catch(() => null)
    if (res.status === 401) {
      throw new Error("Export was not authorized — try signing in again; if it persists, the backend needs a redeploy.")
    }
    throw new Error(msg || `Export failed: ${res.status}`)
  }

  const blob = await res.blob()
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `chesa-won-orders-${stamp}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
