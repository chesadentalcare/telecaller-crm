"use client"

import { useMemo, useState } from "react"
import { Trophy, FileText, IndianRupee, CalendarDays, UserRound, Loader2, Download } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { useWonLeads, useWonOrders, useOrderLines } from "@/hooks/use-leads"
import { downloadWonExport } from "@/lib/api/won-export"
import type { DateRange } from "@/lib/types/lead"

const money = (n: number | null | undefined) =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

function OrderProductsDialog({ docNum, onClose }: { docNum: string | null; onClose: () => void }) {
  const { data, isLoading, error } = useOrderLines(docNum)
  return (
    <Dialog open={!!docNum} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <FileText className="size-4" />Sales Order {docNum}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />Loading products from SAP…
          </p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">Couldn&apos;t load this order from SAP.</p>
        ) : data ? (
          <div className="space-y-3">
            {(data.cardName || data.docDate) && (
              <p className="text-xs text-muted-foreground">
                {data.cardName}{data.cardName && data.docDate ? " · " : ""}{data.docDate}
              </p>
            )}
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">Item</th>
                    <th className="px-2 py-1.5 text-right font-medium">Qty</th>
                    <th className="px-2 py-1.5 text-right font-medium">Unit</th>
                    <th className="px-2 py-1.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.length === 0 ? (
                    <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">No line items.</td></tr>
                  ) : (
                    data.lines.map((l, i) => (
                      <tr key={`${l.itemCode}-${i}`} className="border-t">
                        <td className="px-2 py-1.5">
                          <span className="font-mono">{l.itemCode}</span>
                          {l.description ? <span className="text-muted-foreground"> · {l.description}</span> : null}
                        </td>
                        <td className="px-2 py-1.5 text-right">{l.quantity ?? "—"}</td>
                        <td className="px-2 py-1.5 text-right">{money(l.unitPrice)}</td>
                        <td className="px-2 py-1.5 text-right">{money(l.lineTotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {data.docTotal != null && (
                  <tfoot>
                    <tr className="border-t bg-muted/30 font-medium">
                      <td className="px-2 py-1.5" colSpan={3}>Order total</td>
                      <td className="px-2 py-1.5 text-right">{money(data.docTotal)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

type Preset = "all" | "today" | "7d" | "30d" | "month" | "custom"

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return fmt(d)
}
const monthStart = () => {
  const d = new Date()
  return fmt(new Date(d.getFullYear(), d.getMonth(), 1))
}
const amount = (n: number | null) => (n == null ? null : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }))

function presetRange(p: Preset, custom: { from: string; to: string }): DateRange | undefined {
  const today = fmt(new Date())
  if (p === "today") return { from: today, to: today }
  if (p === "7d") return { from: daysAgo(6), to: today }
  if (p === "30d") return { from: daysAgo(29), to: today }
  if (p === "month") return { from: monthStart(), to: today }
  if (p === "custom") return custom.from || custom.to ? { from: custom.from || undefined, to: custom.to || undefined } : undefined
  return undefined
}

const CHIPS: { key: Preset; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
]

export function WonView({ onOpenLead }: { onOpenLead?: (id: string) => void }) {
  const [preset, setPreset] = useState<Preset>("all")
  const [custom, setCustom] = useState({ from: "", to: "" })
  const [openOrder, setOpenOrder] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const range = presetRange(preset, custom)
  const filtering = preset !== "all"

  const onExport = async () => {
    setExporting(true)
    try {
      await downloadWonExport(range)
      toast.success("Won export downloaded")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed")
    } finally {
      setExporting(false)
    }
  }

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
    <>
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
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{rows.length} won</Badge>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={onExport}
              disabled={exporting}
              title="Download won leads with SAP order value and line items for the selected date range"
            >
              {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              Export data
            </Button>
          </div>
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
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setOpenOrder(o.orderNumber) }}
                            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                            title="View products in this order"
                          >
                            <FileText className="size-3" />SO {o.orderNumber}
                          </button>
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
      <OrderProductsDialog docNum={openOrder} onClose={() => setOpenOrder(null)} />
    </>
  )
}
