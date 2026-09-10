"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Briefcase, MessageSquarePlus, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useAddSalesUpdate } from "@/hooks/use-lead-mutations"
import { ApiError } from "@/lib/api/client"

export interface SalesUpdateEntry {
  id: number | string
  event: string | null
  notes: string | null
  logged_by: string | null
  source: string
  logged_at?: string | null
  amount?: number | null
}

const SALES_EVENTS: {
  value: string
  label: string
  group: "progress" | "terminal"
  amount?: boolean
  tone: string
}[] = [
  { value: "no_update", label: "No update from rep", group: "progress", tone: "bg-amber-100 text-amber-800" },
  { value: "visit_scheduled", label: "Visit scheduled", group: "progress", tone: "bg-sky-100 text-sky-800" },
  { value: "visited", label: "Visited the doctor", group: "progress", tone: "bg-sky-100 text-sky-800" },
  { value: "quotation_shared", label: "Quotation shared", group: "progress", amount: true, tone: "bg-violet-100 text-violet-800" },
  { value: "negotiating", label: "Negotiating / price discussion", group: "progress", tone: "bg-violet-100 text-violet-800" },
  { value: "awaiting_decision", label: "Awaiting doctor's decision", group: "progress", tone: "bg-slate-200 text-slate-700" },
  { value: "stalled", label: "Stalled / gone cold", group: "progress", tone: "bg-rose-100 text-rose-800" },
  { value: "won", label: "Won — order placed", group: "terminal", amount: true, tone: "bg-emerald-100 text-emerald-800" },
  { value: "lost", label: "Lost", group: "terminal", tone: "bg-rose-100 text-rose-800" },
]

const EVENT_BY_VALUE = Object.fromEntries(SALES_EVENTS.map((e) => [e.value, e]))

const SOURCE_LABEL: Record<string, string> = {
  call: "Coordinator call",
  dashboard: "Sales app",
  whatsapp: "WhatsApp",
  coordinator: "Coordinator",
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`

export function SalesLogTab({
  leadId,
  salesName,
  updates = [],
}: {
  leadId: string
  salesName?: string | null
  updates?: SalesUpdateEntry[]
}) {
  const [event, setEvent] = useState("")
  const [notes, setNotes] = useState("")
  const [amount, setAmount] = useState("")
  const { mutateAsync: addSalesUpdate, isPending } = useAddSalesUpdate(leadId)

  const selected = event ? EVENT_BY_VALUE[event] : undefined
  const showAmount = !!selected?.amount

  const submit = async () => {
    if (!notes.trim()) {
      toast.error("Add a note on what the rep reported")
      return
    }
    try {
      await addSalesUpdate({
        notes: notes.trim(),
        event: event || undefined,
        amount: showAmount && amount ? Number(amount) : undefined,
      })
      setEvent("")
      setNotes("")
      setAmount("")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to log the sales update")
    }
  }

  const sorted = [...updates].sort(
    (a, b) => new Date(b.logged_at ?? 0).getTime() - new Date(a.logged_at ?? 0).getTime(),
  )

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-background p-3 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Briefcase className="size-3.5 text-muted-foreground" />
          Log a sales update
          {salesName && <span className="font-normal text-muted-foreground">· rep: {salesName}</span>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">What&apos;s happening</Label>
            <Select value={event} onValueChange={setEvent}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Pick a status" />
              </SelectTrigger>
              <SelectContent>
                {SALES_EVENTS.map((e) => (
                  <SelectItem key={e.value} value={e.value} className="text-xs">
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showAmount && (
            <div className="space-y-1.5">
              <Label htmlFor="sales-amount" className="text-xs">
                Amount <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="sales-amount"
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 450000"
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sales-notes" className="text-xs">Notes</Label>
          <Textarea
            id="sales-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Called Sudhir — visited the doctor today, quotation requested, decision expected next week."
            rows={3}
          />
        </div>

        <div className="flex justify-end">
          <Button size="sm" className="gap-1.5" disabled={isPending} onClick={submit}>
            <MessageSquarePlus className="size-3.5" />
            {isPending ? "Saving…" : "Log update"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground">Sales update history</p>
        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            No sales updates yet. Reps&apos; updates (Sales app / WhatsApp) and coordinator calls will appear here.
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((u) => {
              const cfg = u.event ? EVENT_BY_VALUE[u.event] : undefined
              return (
                <li key={u.id} className="rounded-lg border bg-background p-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cfg?.tone ?? "bg-muted text-muted-foreground"}`}>
                      {cfg?.label ?? u.event ?? "Update"}
                    </span>
                    {typeof u.amount === "number" && u.amount > 0 && (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        {inr(u.amount)}
                      </span>
                    )}
                    <Badge variant="outline" className="h-4 px-1 text-[9px]">
                      {SOURCE_LABEL[u.source] ?? u.source}
                    </Badge>
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="size-3" />
                      {u.logged_at
                        ? new Date(u.logged_at).toLocaleString(undefined, {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </span>
                  </div>
                  {u.notes && <p className="mt-1.5 whitespace-pre-wrap text-foreground">{u.notes}</p>}
                  {u.logged_by && <p className="mt-1 text-[10px] text-muted-foreground">by {u.logged_by}</p>}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
