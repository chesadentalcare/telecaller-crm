"use client"

// Amendment 2 (Theme 1) — the rep's single "calls required" COCKPIT, now a two-state
// segmented page:
//   • Calls Today    — today's worklist + a "Past Calls Due" catch-up section, each
//                      row expandable into the full inline cockpit (log/qualify/meeting).
//                      A call whose time has passed turns pastel-red.
//   • Upcoming Calls  — a big month calendar of every future call; click a day for its
//                      full schedule (UpcomingCallsCalendar).

import { useState } from "react"
import { PhoneCall, ChevronDown, ChevronRight, SlidersHorizontal, CalendarClock, History, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { LeadCockpitPanel } from "./lead-cockpit-panel"
import { UpcomingCallsCalendar } from "./upcoming-calls-calendar"
import { useCallsDueLeads, useUpcomingCalls } from "@/hooks/use-leads"
import { REASON_LABEL, lastOutcomeLabel } from "@/lib/calls/flatten-upcoming"
import type { CallsDueLead } from "@/lib/types/lead"

interface CallsDueViewProps {
  onOpenLead: (id: string) => void
}

export function CallsDueView({ onOpenLead }: CallsDueViewProps) {
  const { data: leads = [], isLoading } = useCallsDueLeads()
  const { data: upcoming } = useUpcomingCalls()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  if (isLoading) return <ViewSkeleton />

  const toggle = (id: string) => setExpandedId((cur) => (cur === id ? null : id))
  const upcomingCount = (upcoming?.scheduled.length ?? 0) + (upcoming?.drip.length ?? 0)

  // Split the worklist by the call's scheduled DAY (server returns today + overdue):
  //   • today    — scheduled for today; if its TIME has already passed it shows pastel-red.
  //   • pastDue  — scheduled on an earlier day with no log since → its own "Past Calls Due"
  //                section so the rep gets a clear today / past / upcoming picture.
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const today = leads.filter((l) => l.scheduledAt.getTime() >= startOfToday.getTime())
  const pastDue = leads.filter((l) => l.scheduledAt.getTime() < startOfToday.getTime())

  // Shared row renderer. `tone` drives the pastel-red highlight:
  //   'overdue' — due today but the scheduled time has passed (call it on time, not called).
  //   'past'    — scheduled on an earlier day (a deeper rose).
  const renderRow = (lead: CallsDueLead, tone: "due" | "overdue" | "past") => {
    const tel = lead.phone.replace(/\D/g, "")
    const expanded = expandedId === lead.id
    const rowClass =
      tone === "past"
        ? "bg-rose-100/60 hover:bg-rose-100"
        : tone === "overdue"
          ? "bg-rose-50 hover:bg-rose-100/70"
          : undefined
    return (
      <div key={`${lead.id}-${lead.reason}-${lead.scheduledAt.getTime()}`}>
        <LeadQueueRow
          id={lead.id}
          name={lead.name}
          phone={lead.phone}
          equipment={lead.equipment}
          replied={lead.replied}
          className={rowClass}
          onOpen={() => toggle(lead.id)}
          meta={
            <span className="flex flex-wrap items-center gap-1.5">
              {lead.reason === "callback" ? (
                <span className="font-medium text-foreground">📞 Callback at {lead.scheduledAt.toLocaleString()}</span>
              ) : (
                <span>Scheduled {lead.scheduledAt.toLocaleString()}</span>
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
              {tone === "overdue" && (
                <span className="inline-flex items-center gap-1 font-medium text-rose-600">
                  <AlertCircle className="size-3" />Overdue — due earlier today
                </span>
              )}
              {tone === "past" && (
                <span className="inline-flex items-center gap-1 font-medium text-rose-700">
                  <AlertCircle className="size-3" />Missed — not called on its day
                </span>
              )}
            </span>
          }
          badge={<Badge variant="outline" className="text-[10px]">{REASON_LABEL[lead.reason] ?? lead.reason}</Badge>}
          actions={
            <div className="flex items-center gap-1.5">
              {tel.length >= 10 ? (
                <Button asChild size="sm" className="gap-1.5"><a href={`tel:${tel}`}><PhoneCall className="size-3.5" />Call</a></Button>
              ) : (
                <Button size="sm" disabled className="gap-1.5"><PhoneCall className="size-3.5" />No number</Button>
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
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="today" className="gap-1.5">
          <PhoneCall className="size-3.5" />Calls Today
          {today.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">{today.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="upcoming" className="gap-1.5">
          <CalendarClock className="size-3.5" />Upcoming Calls
          {upcomingCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">{upcomingCount}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ── Calls Today ─────────────────────────────────────────────────────── */}
      <TabsContent value="today" className="mt-0 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <PhoneCall className="size-4 text-primary" />Calls Due — Today
                </CardTitle>
                <CardDescription>Calls scheduled for today, oldest first — first contacts, callbacks &amp; drip anchors. A call whose time has already passed turns <span className="font-medium text-rose-600">pastel red</span> so you can catch it on time. Future-dated calls live under the <span className="font-medium text-foreground">Upcoming Calls</span> tab until their day.</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px]">{today.length} due</Badge>
            </div>
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
