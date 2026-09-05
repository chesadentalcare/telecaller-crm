"use client"

// Meetings page — a two-state segmented view that mirrors Calls Due exactly:
//   • Today     — today's meetings + a "Past Meetings Due" catch-up section for
//                 past meetings that still have no summary uploaded (not attempted /
//                 not written up). A passed meeting shows pastel-red.
//   • Calendar  — a big month calendar of every meeting (past / today / upcoming);
//                 click a day for its schedule (MeetingsCalendar).

import { useState } from "react"
import { CalendarClock, Video, MapPin, PhoneCall, AlertCircle, CheckCircle2, History, CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { MeetingsCalendar } from "./meetings-calendar"
import { RescheduleMeetingDialog } from "./reschedule-meeting-dialog"
import { useMeetingsDueLeads } from "@/hooks/use-leads"
import type { MeetingsDueLead } from "@/lib/types/lead"

interface MeetingsDueViewProps {
  onOpenLead: (id: string) => void
}

export function MeetingsDueView({ onOpenLead }: MeetingsDueViewProps) {
  const { data: meetings = [], isLoading } = useMeetingsDueLeads()
  const [rescheduleTarget, setRescheduleTarget] = useState<MeetingsDueLead | null>(null)
  const [status, setStatus] = useState<"active" | "won" | "lost" | "all">("active")
  if (isLoading) return <ViewSkeleton />

  // Split by the meeting's DAY (the server returns today + upcoming + past meetings
  // that still lack a summary):
  //   • today    — scheduled for today; a passed time shows pastel-red.
  //   • upcoming — a later day; listed inline too because meetings are few (unlike
  //                calls, whose future list is long and stays on the calendar).
  //   • pastDue  — an earlier day with no summary yet → its own "Past Meetings Due"
  //                catch-up section (parallel to Past Calls Due).
  const isWon = (s: string) => s === "won" || s === "closed_won"
  const isLost = (s: string) => s === "lost" || s === "closed_lost"
  const isClosed = (s: string) => isWon(s) || isLost(s) || s === "archived" || s === "dormant"
  const counts = {
    active: meetings.filter((m) => !isClosed(m.stage)).length,
    won: meetings.filter((m) => isWon(m.stage)).length,
    lost: meetings.filter((m) => isLost(m.stage)).length,
    all: meetings.length,
  }
  const visible = meetings.filter((m) =>
    status === "all" ? true : status === "won" ? isWon(m.stage) : status === "lost" ? isLost(m.stage) : !isClosed(m.stage),
  )

  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)
  const today = visible.filter(
    (m) => m.meetingAt.getTime() >= startOfToday.getTime() && m.meetingAt.getTime() <= endOfToday.getTime(),
  )
  const upcoming = visible.filter((m) => m.meetingAt.getTime() > endOfToday.getTime())
  const pastDue = visible.filter((m) => m.meetingAt.getTime() < startOfToday.getTime() && !m.summaryUploaded)

  // Shared row renderer. `tone` drives the pastel-red highlight, matching Calls Due:
  //   'overdue' — due today but the time has passed.
  //   'past'    — an earlier day, still no summary (a deeper rose).
  const renderRow = (m: MeetingsDueLead, tone: "due" | "overdue" | "past") => {
    const tel = m.phone.replace(/\D/g, "")
    const isZoom = m.meetingType === "zoom"
    const rowClass = m.flagged
      ? "bg-slate-900 text-white border-l-4 border-l-amber-400 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-slate-900 [&_*]:text-white [&_*]:hover:text-white"
      : tone === "past"
        ? "bg-rose-100/60 hover:bg-rose-100"
        : tone === "overdue"
          ? "bg-rose-50 hover:bg-rose-100/70"
          : undefined
    return (
      <LeadQueueRow
        key={m.meetingId}
        id={m.id}
        name={m.name}
        phone={m.phone}
        equipment={m.equipment}
        flagged={m.flagged}
        onOpen={() => onOpenLead(m.id)}
        className={rowClass}
        meta={
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              {isZoom ? <Video className="size-3" /> : <MapPin className="size-3" />}
              {m.meetingAt.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
            {!isZoom && m.location && <span>· {m.location}</span>}
            {m.assignedSalesperson && <span>· with {m.assignedSalesperson}</span>}
            {m.summaryUploaded ? (
              <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="size-3" />Summary in</span>
            ) : tone === "overdue" ? (
              <span className="inline-flex items-center gap-1 font-medium text-rose-600"><AlertCircle className="size-3" />Meeting time passed</span>
            ) : tone === "past" ? (
              <span className="inline-flex items-center gap-1 font-medium text-rose-700"><AlertCircle className="size-3" />Missed — no summary yet</span>
            ) : null}
          </span>
        }
        badge={<Badge variant="outline" className="text-[10px]">{isZoom ? "Zoom" : "Physical"}</Badge>}
        actions={
          <div className="flex items-center gap-1.5">
            {isZoom && m.joinUrl ? (
              <Button asChild size="sm" className="gap-1.5"><a href={m.joinUrl} target="_blank" rel="noreferrer"><Video className="size-3.5" />Join</a></Button>
            ) : tel.length >= 10 ? (
              <Button asChild size="sm" variant="outline" className={`gap-1.5${m.flagged ? " border-slate-600 bg-slate-800 text-white hover:bg-slate-700 hover:text-white" : ""}`}><a href={`tel:${tel}`}><PhoneCall className="size-3.5" />Call</a></Button>
            ) : null}
            <Button size="sm" variant="outline" className={`gap-1.5${m.flagged ? " border-slate-600 bg-slate-800 text-white hover:bg-slate-700 hover:text-white" : ""}`} onClick={() => setRescheduleTarget(m)}><CalendarClock className="size-3.5" />Reschedule</Button>
            <Button size="sm" variant="ghost" onClick={() => onOpenLead(m.id)}>Open</Button>
          </div>
        }
      />
    )
  }

  return (
    <>
    <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5 w-fit">
      {([
        { key: "active", label: "Active", n: counts.active },
        { key: "won", label: "Won", n: counts.won },
        { key: "lost", label: "Lost", n: counts.lost },
        { key: "all", label: "All", n: counts.all },
      ] as const).map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => setStatus(o.key)}
          aria-pressed={status === o.key}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition whitespace-nowrap ${status === o.key ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
        >
          {o.label}{o.n > 0 ? ` ${o.n}` : ""}
        </button>
      ))}
    </div>
    <Tabs defaultValue="today" className="gap-4">
      <TabsList className="h-auto w-full justify-start gap-5 rounded-none border-b bg-transparent p-0">
        <TabsTrigger value="today" className="gap-1.5 rounded-none border-b-2 border-transparent px-0.5 pb-2.5 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none">
          <CalendarClock className="size-3.5" />Today
          {today.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">{today.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="calendar" className="gap-1.5 rounded-none border-b-2 border-transparent px-0.5 pb-2.5 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none">
          <CalendarDays className="size-3.5" />Calendar
          {pastDue.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px] border-rose-300 text-rose-700">{pastDue.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ── Meetings Today ──────────────────────────────────────────────────── */}
      <TabsContent value="today" className="mt-0 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" />Meetings today
            </CardTitle>
            <CardDescription>Zoom &amp; physical meetings for today, earliest first — a passed meeting with no summary is highlighted in red.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {today.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No meetings due today</p>
            ) : (
              <div className="divide-y">
                {today.map((m) => renderRow(m, m.meetingAt.getTime() < now.getTime() ? "overdue" : "due"))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Meetings — later days, listed inline since meetings are few. */}
        {upcoming.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock className="size-4 text-primary" />Upcoming Meetings
                  </CardTitle>
                  <CardDescription>Meetings scheduled for the days ahead — earliest first.</CardDescription>
                </div>
                <Badge variant="secondary" className="text-[10px]">{upcoming.length} upcoming</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {upcoming.map((m) => renderRow(m, "due"))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Past Meetings Due — an earlier day, still no summary. Kept separate from
            Today so a stale meeting can't masquerade as a today task. */}
        {pastDue.length > 0 && (
          <Card className="border-rose-200">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="size-4 text-rose-600" />Past Meetings Due
                  </CardTitle>
                  <CardDescription>Meetings from an earlier day that still have no summary — write these up to close them off.</CardDescription>
                </div>
                <Badge variant="outline" className="border-rose-300 text-rose-700 text-[10px]">{pastDue.length} pending</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {pastDue.map((m) => renderRow(m, "past"))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ── Calendar ────────────────────────────────────────────────────────── */}
      <TabsContent value="calendar" className="mt-0">
        <MeetingsCalendar onOpenLead={onOpenLead} />
      </TabsContent>
    </Tabs>
    {rescheduleTarget && (
      <RescheduleMeetingDialog
        key={rescheduleTarget.meetingId}
        meeting={rescheduleTarget}
        open
        onOpenChange={(o) => { if (!o) setRescheduleTarget(null) }}
      />
    )}
    </>
  )
}
