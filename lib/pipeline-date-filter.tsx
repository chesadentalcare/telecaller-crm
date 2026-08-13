"use client"

import { createContext, useContext, useMemo, useState } from "react"
import { CalendarDays, X } from "lucide-react"
import type { DateRange } from "@/lib/types/lead"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export type DatePreset = "all" | "today" | "yesterday" | "last7" | "month" | "custom"

const PRESET_LABEL: Record<DatePreset, string> = {
  all: "All time",
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  month: "This month",
  custom: "Custom range",
}

const localDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// Presets resolve to an inclusive from/to (YYYY-MM-DD) in the user's local day.
const presetRange = (preset: DatePreset, custom: DateRange): DateRange => {
  const now = new Date()
  const today = localDate(now)
  switch (preset) {
    case "today":
      return { from: today, to: today }
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate() - 1)
      const ys = localDate(y)
      return { from: ys, to: ys }
    }
    case "last7": {
      const s = new Date(now); s.setDate(s.getDate() - 6)
      return { from: localDate(s), to: today }
    }
    case "month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: localDate(s), to: today }
    }
    case "custom":
      return { from: custom.from || undefined, to: custom.to || undefined }
    default:
      return {}
  }
}

interface Ctx {
  range: DateRange
  active: boolean
  label: string
  preset: DatePreset
  setPreset: (p: DatePreset) => void
  custom: DateRange
  setCustom: (r: DateRange) => void
}

const EMPTY: Ctx = { range: {}, active: false, label: "All time", preset: "all", setPreset: () => {}, custom: {}, setCustom: () => {} }
const DateFilterContext = createContext<Ctx>(EMPTY)

// Effective created-date range for the current pipeline view. Safe to call
// without a provider (returns "all time" — no filter).
export const usePipelineDateRange = (): DateRange => useContext(DateFilterContext).range
export const usePipelineDateFilter = (): Ctx => useContext(DateFilterContext)

export function PipelineDateFilterProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPreset] = useState<DatePreset>("all")
  const [custom, setCustom] = useState<DateRange>({})

  const range = useMemo(() => presetRange(preset, custom), [preset, custom])
  const active = !!(range.from || range.to)
  const label = preset === "custom"
    ? `${custom.from || "…"} → ${custom.to || "…"}`
    : PRESET_LABEL[preset]

  const value = useMemo<Ctx>(() => ({ range, active, label, preset, setPreset, custom, setCustom }), [range, active, label, preset, custom])

  return <DateFilterContext.Provider value={value}>{children}</DateFilterContext.Provider>
}

export function PipelineDateBar() {
  const { preset, setPreset, custom, setCustom, active, label } = usePipelineDateFilter()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="size-4" />
        <span className="hidden sm:inline">Created:</span>
      </div>
      <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
        <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {(Object.keys(PRESET_LABEL) as DatePreset[]).map((p) => (
            <SelectItem key={p} value={p}>{PRESET_LABEL[p]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === "custom" && (
        <div className="flex items-center gap-1.5">
          <Input type="date" className="h-8 w-[150px] text-xs" value={custom.from || ""} max={custom.to || undefined} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
          <span className="text-xs text-muted-foreground">→</span>
          <Input type="date" className="h-8 w-[150px] text-xs" value={custom.to || ""} min={custom.from || undefined} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
        </div>
      )}

      {active && (
        <>
          <Badge variant="secondary" className="gap-1 text-[11px]">Showing: {label}</Badge>
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => { setPreset("all"); setCustom({}) }}>
            <X className="size-3" />Clear
          </Button>
        </>
      )}
    </div>
  )
}
