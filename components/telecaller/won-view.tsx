"use client"

import { useMemo, useState } from "react"
import { Trophy, FileText, IndianRupee, CalendarDays, UserRound } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { useWonLeads, useWonOrders } from "@/hooks/use-leads"
import type { DateRange } from "@/lib/types/lead"

type Preset = "all" | "today" | "7d" | "30d" | "custom"

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return fmt(d)
}
const amount = (n: number | null) => (n == null ? null : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }))

function presetRange(p: Preset, custom: { from: string; to: string }): DateRange | undefined {
  const today = fmt(new Date())
  if (p === "today") return { from: today, to: today }
  if (p === "7d") return { from: daysAgo(6), to: today }
  if (p === "30d") return { from: daysAgo(29), to: today }
  if (p === "custom") return custom.from || custom.to ? { from: custom.from || undefined, to: custom.to || undefined } : undefined
  return undefined
}

const CHIPS: { key: Preset; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "custom", label: "Custom" },
]

export function WonView({ onOpenLead }: { onOpenLead?: (id: string) => void }) {
  const [preset, setPreset] = useState<Preset>("all")
  const [custom, setCustom] = useState({ from: "", to: "" })
  const range = presetRange(preset, custom)
  const filtering = preset !== "all"

  const { data: leads = [], isLoading } = useWonLeads()
  const { data: orders = [], isFetching: ordersFetching } = useWonOrders(range)

  const orderById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders])
  const rows = useMemo(() => {
    if (!filtering) return leads
    const inRange = new Set(orders.map((o) => o.id))
    return leads.filter((l) => inRange.has(l.id))
  }, [leads, orders, filtering])

  if (isLoading) return <ViewSkeleton />

  return (
    <Card>
      <CardHeader className="pb-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="size-4 text-emerald-500" />Won
            </CardTitle>
            <CardDescription>
              Leads that converted into a sale, with the attached SAP sales order — number,
              amount, posting date and sales employee.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">{rows.length} won</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {CHIPS.map((c) => (
            <Button
              key={c.key}
              size="sm"
              variant={preset === c.key ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setPreset(c.key)}
            >
              {c.label}
            </Button>
          ))}
          {preset === "custom" && (
            <span className="flex items-center gap-1.5">
              <Input type="date" value={custom.from} onChange={(e) => setCustom((s) => ({ ...s, from: e.target.value }))} className="h-7 w-[9.5rem] text-xs" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={custom.to} onChange={(e) => setCustom((s) => ({ ...s, to: e.target.value }))} className="h-7 w-[9.5rem] text-xs" />
            </span>
          )}
          {filtering && (
            <span className="text-[11px] text-muted-foreground">by order posting date{ordersFetching ? " · loading…" : ""}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            {filtering ? "No won orders in this date range" : "No won leads yet"}
          </p>
        ) : (
          <div className="divide-y">
            {rows.map((lead) => {
              const o = orderById.get(lead.id)
              return (
                <LeadQueueRow
                  key={lead.id}
                  id={lead.id}
                  name={lead.name}
                  phone={lead.phone}
                  equipment={lead.equipment}
                  replied={lead.replied}
                  flagged={lead.flagged}
                  onOpen={onOpenLead}
                  meta={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-medium text-emerald-600">Won</span>
                      {lead.wonDaysAgo != null && (
                        <span className="text-muted-foreground">{lead.wonDaysAgo === 0 ? "today" : `${lead.wonDaysAgo}d ago`}</span>
                      )}
                      {o?.orderNumber ? (
                        <>
                          <span className="inline-flex items-center gap-1 font-medium">
                            <FileText className="size-3" />SO {o.orderNumber}
                          </span>
                          {amount(o.amount) && (
                            <span className="inline-flex items-center gap-0.5 font-medium text-emerald-700">
                              <IndianRupee className="size-3" />{amount(o.amount)}
                            </span>
                          )}
                          {o.postingDate && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <CalendarDays className="size-3" />{o.postingDate}
                            </span>
                          )}
                          {o.salesEmployee && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <UserRound className="size-3" />{o.salesEmployee}
                            </span>
                          )}
                        </>
                      ) : ordersFetching ? (
                        <span className="text-[11px] text-muted-foreground">loading order…</span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">order not linked</span>
                      )}
                    </span>
                  }
                  badge={<Badge variant="secondary" className="text-[10px]">Won</Badge>}
                  actions={
                    <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={() => onOpenLead?.(lead.id)}>
                      Open
                    </Button>
                  }
                />
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
