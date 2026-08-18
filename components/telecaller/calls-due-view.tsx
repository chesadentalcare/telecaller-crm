"use client"

// Amendment 2 (Theme 1) — the rep's single "calls required" COCKPIT, now a two-state
// segmented page:
//   • Calls Today    — today's worklist + a "Past Calls Due" catch-up section, each
//                      row expandable into the full inline cockpit (log/qualify/meeting).
//                      A call whose time has passed turns pastel-red.
//   • Upcoming Calls  — a big month calendar of every future call; click a day for its
//                      full schedule (UpcomingCallsCalendar).

import { useState } from "react"
import { toast } from "sonner"
import { PhoneCall, ChevronDown, ChevronRight, SlidersHorizontal, CalendarClock, History, AlertCircle, CheckCircle2, MessageSquarePlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { LeadCockpitPanel } from "./lead-cockpit-panel"
import { UpcomingCallsCalendar } from "./upcoming-calls-calendar"
import { useCallsDueLeads, useUpcomingCalls } from "@/hooks/use-leads"
import { useAddSalesUpdate } from "@/hooks/use-lead-mutations"
import { REASON_LABEL, lastOutcomeLabel } from "@/lib/calls/flatten-upcoming"
import { repColor } from "@/lib/rep-color"
import { useEngagementMode, isEngagedReason } from "@/lib/engagement-mode"
import { ApiError } from "@/lib/api/client"
import type { CallsDueLead } from "@/lib/types/lead"

interface CallsDueViewProps {
  onOpenLead: (id: string) => void
}

// Post-meeting follow-up — a small dialog to record the sales rep's response when the
// telecaller had to call the rep (the rep's side wasn't yet reported via the sales app /
// their WhatsApp). Mirrors RemoveFromDripButton's structure.
function LogRepResponseButton({ leadId, salesName }: { leadId: string; salesName?: string | null }) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [event, setEvent] = useState("")
  const { mutateAsync: addSalesUpdate, isPending } = useAddSalesUpdate(leadId)

  const handleSubmit = async () => {
    if (!notes.trim()) {
      toast.error("Please add a note on what the rep said")
      return
    }
    try {
      await addSalesUpdate({ notes: notes.trim(), event: event.trim() || undefined })
      setOpen(false)
      setNotes("")
      setEvent("")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to log the rep's response")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <MessageSquarePlus className="size-3.5" />Log rep&apos;s response
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Log the sales rep&apos;s response</DialogTitle>
          <DialogDescription>
            Record what {salesName || "the sales rep"} reported about the visit — this shows on the follow-up card.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="rep-notes" className="text-xs">Notes</Label>
            <Textarea
              id="rep-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Visited today, doctor liked the chair, quotation requested."
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rep-event" className="text-xs">Event <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="rep-event"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              placeholder="e.g. visited / quoted / closing soon"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : "Save response"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CallsDueView({ onOpenLead }: CallsDueViewProps) {
  const { data: leads = [], isLoading } = useCallsDueLeads()
  const { data: upcoming } = useUpcomingCalls()
  const { mode } = useEngagementMode()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  if (isLoading) return <ViewSkeleton />

  const toggle = (id: string) =>
    setExpandedIds((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const upcomingCount = (upcoming?.scheduled.length ?? 0) + (upcoming?.drip.length ?? 0)

  // Split the worklist by the call's scheduled DAY (server returns today + overdue):
  //   • today    — scheduled for today; if its TIME has already passed it shows pastel-red.
  //   • pastDue  — scheduled on an earlier day with no log since → its own "Past Calls Due"
  //                section so the rep gets a clear today / past / upcoming picture.
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const modeLeads = mode === "all" ? leads : leads.filter((l) => isEngagedReason(l.reason) === (mode === "engaged"))
  const today = modeLeads.filter((l) => l.scheduledAt.getTime() >= startOfToday.getTime())
  const pastDue = modeLeads.filter((l) => l.scheduledAt.getTime() < startOfToday.getTime())

  // Shared row renderer. `tone` drives the pastel-red highlight:
  //   'overdue' — due today but the scheduled time has passed (call it on time, not called).
  //   'past'    — scheduled on an earlier day (a deeper rose).
  const renderRow = (lead: CallsDueLead, tone: "due" | "overdue" | "past") => {
    const tel = lead.phone.replace(/\D/g, "")
    const salesTel = (lead.salesPhone ?? "").replace(/\D/g, "")
    const expanded = expandedIds.has(lead.id)
    const rowClass =
      tone === "past"
        ? "bg-rose-100/60 hover:bg-rose-100"
        : tone === "overdue"
          ? "bg-rose-50 hover:bg-rose-100/70"
          : undefined
    return (
      <div key={`${lead.id}-${lead.reason}`}>
        <LeadQueueRow
          id={lead.id}
          name={lead.name}
          phone={lead.phone}
          equipment={lead.equipment}
          location={[lead.city, lead.state].filter((v) => v && v !== "—").join(", ") || undefined}
          replied={lead.replied}
          className={rowClass}
          onOpen={() => toggle(lead.id)}
          meta={
            <span className="flex flex-wrap items-center gap-1.5">
              {lead.reason === "callback" ? (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <PhoneCall className="size-3" />Callback at {lead.scheduledAt.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              ) : (
                <span>Scheduled {lead.scheduledAt.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              )}
              {/* Previous call outcome — or "Fresh call" if never called. */}
              <span
                className={
                  lead.lastOutcome
                    ? "inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                    : "inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                }
              >
                {lastOutcomeLabel(lead.lastOutcome)}
              </span>
              {lead.lastOutcome && lead.lastOutcomeBy && (
                <span className="text-[10px] text-muted-foreground">
                  by{" "}
                  <span className="font-bold" style={{ color: repColor(lead.lastOutcomeBy) }}>
                    {lead.lastOutcomeBy}
                  </span>
                  {lead.lastOutcomeAt
                    ? ` · ${new Date(lead.lastOutcomeAt).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
                    : ""}
                </span>
              )}
              {tone === "overdue" && (
                <span className="inline-flex items-center gap-1 font-medium text-rose-600">
                  <AlertCircle className="size-3" />Overdue — was due {lead.scheduledAt.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" })} today
                </span>
              )}
              {tone === "past" && (
                <span className="inline-flex items-center gap-1 font-medium text-rose-700">
                  <AlertCircle className="size-3" />Missed {lead.scheduledAt.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} — not called on its day
                </span>
              )}
              {/* Post-meeting follow-up — the rep's reported update (already in), else a
                  prompt to call the rep + log their response. */}
              {lead.reason === "post_meeting" && lead.salesUpdate ? (
                <span className="inline-flex w-full items-center gap-1 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 className="size-3 shrink-0" />
                  Sales: {lead.salesUpdate.event ? `${lead.salesUpdate.event} — ` : ""}{lead.salesUpdate.notes || "reported"}
                  {lead.salesUpdate.loggedBy ? ` · ${lead.salesUpdate.loggedBy}` : ""}
                  {` via ${lead.salesUpdate.source}`}
                </span>
              ) : lead.reason === "post_meeting" && lead.salesPhone ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  Sales rep not reported yet — call {lead.salesName || "the rep"} to verify the visit
                </span>
              ) : null}
            </span>
          }
          badge={<Badge variant="outline" className="text-[10px]">{REASON_LABEL[lead.reason] ?? lead.reason}</Badge>}
          actions={
            <div className="flex flex-wrap items-center gap-1.5">
              {tel.length >= 10 ? (
                <Button asChild size="sm" className="gap-1.5"><a href={`tel:${tel}`}><PhoneCall className="size-3.5" />{lead.reason === "post_meeting" ? "Call doctor" : "Call"}</a></Button>
              ) : (
                <Button size="sm" disabled className="gap-1.5"><PhoneCall className="size-3.5" />No number</Button>
              )}
              {/* Post-meeting follow-up — call the rep + log their response, only while the
                  rep hasn't reported yet and we have a number to call. */}
              {lead.reason === "post_meeting" && !lead.salesUpdate && lead.salesPhone && (
                <>
                  {salesTel.length >= 10 && (
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <a href={`tel:${salesTel}`}><PhoneCall className="size-3.5" />Call {lead.salesName || "sales rep"}</a>
                    </Button>
                  )}
                  <LogRepResponseButton leadId={lead.id} salesName={lead.salesName} />
                </>
              )}
              <Button size="sm" variant="outline" onClick={() => toggle(lead.id)} className="gap-1" title="Open cockpit">
                {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                <SlidersHorizontal className="size-3.5" />Cockpit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onOpenLead(lead.id)}>Open</Button>
            </div>
          }
        />
        {expanded && <LeadCockpitPanel leadId={lead.id} onOpenFull={onOpenLead} />}
      </div>
    )
  }

  return (
    <Tabs defaultValue="today" className="gap-4">
      <TabsList className="h-auto w-full justify-start gap-5 rounded-none border-b bg-transparent p-0">
        <TabsTrigger value="today" className="gap-1.5 rounded-none border-b-2 border-transparent px-0.5 pb-2.5 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none">
          <PhoneCall className="size-3.5" />Today
          {today.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">{today.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="upcoming" className="gap-1.5 rounded-none border-b-2 border-transparent px-0.5 pb-2.5 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none">
          <CalendarClock className="size-3.5" />Upcoming
          {upcomingCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">{upcomingCount}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ── Calls Today ─────────────────────────────────────────────────────── */}
      <TabsContent value="today" className="mt-0 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PhoneCall className="size-4 text-primary" />Calls due today
            </CardTitle>
            <CardDescription>Scheduled for today, oldest first — overdue calls are highlighted in red.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {today.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No calls due today</p>
            ) : (
              <div className="divide-y">
                {today.map((lead) =>
                  renderRow(lead, lead.scheduledAt.getTime() < now.getTime() ? "overdue" : "due"),
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past Calls Due — scheduled on an earlier day, never logged since. Kept
            separate from Today so an old callback can't masquerade as a today task. */}
        {pastDue.length > 0 && (
          <Card className="border-rose-200">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="size-4 text-rose-600" />Past Calls Due
                  </CardTitle>
                  <CardDescription>Calls that were due on an earlier day and still have no log — call these to catch up.</CardDescription>
                </div>
                <Badge variant="outline" className="border-rose-300 text-rose-700 text-[10px]">{pastDue.length} missed</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {pastDue.map((lead) => renderRow(lead, "past"))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ── Upcoming Calls (calendar) ───────────────────────────────────────── */}
      <TabsContent value="upcoming" className="mt-0">
        <UpcomingCallsCalendar onOpenLead={onOpenLead} />
      </TabsContent>
    </Tabs>
  )
}
