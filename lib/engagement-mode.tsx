"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"

export type EngagementMode = "all" | "engaged" | "not_engaged"

const STORAGE_KEY = "telecaller-engagement-mode"

const EngagementModeContext = createContext<{
  mode: EngagementMode
  setMode: (m: EngagementMode) => void
}>({ mode: "all", setMode: () => {} })

export function EngagementModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<EngagementMode>("all")

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
    if (saved === "all" || saved === "engaged" || saved === "not_engaged") setModeState(saved)
  }, [])

  const setMode = useCallback((m: EngagementMode) => {
    setModeState(m)
    try { window.localStorage.setItem(STORAGE_KEY, m) } catch { /* private mode */ }
  }, [])

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode])

  return (
    <EngagementModeContext.Provider value={value}>
      {children}
    </EngagementModeContext.Provider>
  )
}

export const useEngagementMode = () => useContext(EngagementModeContext)

// Engaged = interested leads being nurtured — drip (1/3/6-month) anchor/nudge
// calls. Everything else on the worklist (callback / first-contact / re-qual) is
// the "not engaged" chase side: no-response, wrong-number, call-back-later, not-interested.
export const ENGAGED_REASONS = new Set(["drip_anchor"])
export const isEngagedReason = (reason: string) => ENGAGED_REASONS.has(reason)
export const isEngagedOutcome = (outcome: string | null | undefined) => outcome === "engaged"

export function EngagementSwitcher() {
  const { mode, setMode } = useEngagementMode()
  const opts: { key: EngagementMode; label: string }[] = [
    { key: "all", label: "All" },
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
