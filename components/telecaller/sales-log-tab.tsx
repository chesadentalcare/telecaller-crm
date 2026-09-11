"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Briefcase, MessageSquarePlus, Clock, CalendarClock, CheckCircle2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
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
  follow_up_at?: string | null
  follow_up_note?: string | null
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

const toneText = (tone?: string) => tone?.match(/text-[\w-]+/)?.[0] ?? "text-muted-foreground"

const eventIcon = (value?: string | null) => {
  if (value === "won") return CheckCircle2
  if (value === "lost") return XCircle
  return Briefcase
}

const fmtDate = (v: string) =>
  new Date(v).toLocaleDateString(undefined, { day: "2-digit", month: "short" })

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
  const [followUpAt, setFollowUpAt] = useState("")
  const [followUpNote, setFollowUpNote] = useState("")
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
        follow_up_at: followUpAt || undefined,
        follow_up_note: followUpAt && followUpNote.trim() ? followUpNote.trim() : undefined,
      })
      setEvent("")
      setNotes("")
      setAmount("")
      setFollowUpAt("")
      setFollowUpNote("")
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sales-followup" className="text-xs">
              Follow up on <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="sales-followup"
              type="date"
              value={followUpAt}
              onChange={(e) => setFollowUpAt(e.target.value)}
            />
          </div>
          {followUpAt && (
            <div className="space-y-1.5">
              <Label htmlFor="sales-followup-note" className="text-xs">
                Follow-up note <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="sales-followup-note"
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="e.g. confirm the PO number"
              />
            </div>
          )}
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
          <ol className="space-y-3">
            {sorted.map((u, index) => {
              const cfg = u.event ? EVENT_BY_VALUE[u.event] : undefined
              const Icon = eventIcon(u.event)
              const color = toneText(cfg?.tone)
              const n = sorted.length - index
              return (
                <li key={u.id} className="flex gap-3 text-sm">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted">
                      <Icon className={cn("size-3.5", color)} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-medium">Update #{n}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={cn("text-xs font-medium", color)}>
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
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {u.logged_at
                          ? new Date(u.logged_at).toLocaleString(undefined, {
                              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                            })
                          : "—"}
                      </span>
                      {u.logged_by && <span>by {u.logged_by}</span>}
                    </p>
                    {u.notes && <p className="mt-1 whitespace-pre-wrap text-foreground">{u.notes}</p>}
                    {u.follow_up_at && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        <CalendarClock className="size-3" />
                        Follow up: {fmtDate(u.follow_up_at)}
                        {u.follow_up_note ? ` — ${u.follow_up_note}` : ""}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
