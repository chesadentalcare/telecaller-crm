"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

export type EngagementMode = "engaged" | "not_engaged"

const STORAGE_KEY = "telecaller-engagement-mode"

const EngagementModeContext = createContext<{
  mode: EngagementMode
  setMode: (m: EngagementMode) => void
}>({ mode: "engaged", setMode: () => {} })

export function EngagementModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<EngagementMode>("engaged")

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
    if (saved === "engaged" || saved === "not_engaged") setModeState(saved)
  }, [])

  const setMode = useCallback((m: EngagementMode) => {
    setModeState(m)
    try { window.localStorage.setItem(STORAGE_KEY, m) } catch { /* private mode */ }
  }, [])

  return (
    <EngagementModeContext.Provider value={{ mode, setMode }}>
      {children}
    </EngagementModeContext.Provider>
  )
}

export const useEngagementMode = () => useContext(EngagementModeContext)

// A call belongs to the "engaged" side when the lead was reached/interested
// (drip nurture calls + requested callbacks). first-contact / re-qualification
// calls are the "not engaged" chase side.
export const ENGAGED_REASONS = new Set(["drip_anchor", "callback"])
export const isEngagedReason = (reason: string) => ENGAGED_REASONS.has(reason)

export function EngagementSwitcher() {
  const { mode, setMode } = useEngagementMode()
  const opts: { key: EngagementMode; label: string }[] = [
    { key: "engaged", label: "Engaged" },
    { key: "not_engaged", label: "Not Engaged" },
  ]
  return (
    <div className="flex items-center rounded-lg border bg-muted/40 p-0.5" role="group" aria-label="Engagement focus">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => setMode(o.key)}
          aria-pressed={mode === o.key}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition whitespace-nowrap",
            mode === o.key ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
