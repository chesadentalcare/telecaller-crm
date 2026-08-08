"use client"

// Meetings calendar — the "big calendar" half of the Meetings page, parallel to
// UpcomingCallsCalendar. One source (useMeetingsDueLeads → today + upcoming +
// past meetings that still lack a summary). Each day shows a dot per meeting kind
// present (needs-summary / zoom / physical) plus a count; the selected day's
// meetings appear beside the grid. A past meeting with no summary reads red —
// the "not attempted / not written up yet" catch-up, same idea as Past Calls Due.

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Video, MapPin, PhoneCall, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useMeetingsDueLeads } from "@/hooks/use-leads"
import type { MeetingsDueLead } from "@/lib/types/lead"

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000)
const fullDate = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
const fmtTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
const relLabel = (d: Date, now: Date) => {
  const diff = dayDiff(d, now)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff === -1) return "Yesterday"
  return fullDate(d)
}

type Kind = "overdue" | "zoom" | "physical"
const KIND_DOT: Record<Kind, string> = { overdue: "bg-rose-500", zoom: "bg-indigo-500", physical: "bg-emerald-500" }
const KIND_LABEL: Record<Kind, string> = { overdue: "Needs summary", zoom: "Zoom", physical: "Physical" }
const KIND_ORDER: Kind[] = ["overdue", "zoom", "physical"]

const kindOf = (m: MeetingsDueLead, startToday: number): Kind =>
  m.meetingAt.getTime() < startToday && !m.summaryUploaded ? "overdue" : m.meetingType

export function MeetingsCalendar({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const { data: meetings = [] } = useMeetingsDueLeads()
  const now = new Date()
  const startToday = startOfDay(now).getTime()

  const [month, setMonth] = useState<Date>(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const byDay = useMemo(() => {
    const map = new Map<string, MeetingsDueLead[]>()
    for (const m of meetings) {
      const k = dayKey(m.meetingAt)
      const arr = map.get(k)
      if (arr) arr.push(m)
      else map.set(k, [m])
    }
    for (const arr of map.values()) arr.sort((a, b) => a.meetingAt.getTime() - b.meetingAt.getTime())
    return map
  }, [meetings])

  // Auto-point at the most useful day on arrival: today if it has meetings, else
  // the soonest upcoming, else the most recent past (a missed write-up to catch up).
  useEffect(() => {
    if (selectedDay || meetings.length === 0) return
    const t = Date.now()
    if (byDay.has(dayKey(new Date()))) { setSelectedDay(startOfDay(new Date())); return }
    const sorted = [...meetings].sort((a, b) => a.meetingAt.getTime() - b.meetingAt.getTime())
    const pick = sorted.find((m) => m.meetingAt.getTime() >= t) ?? sorted[sorted.length - 1]
    if (pick) { setSelectedDay(startOfDay(pick.meetingAt)); setMonth(pick.meetingAt) }
  }, [byDay, meetings, selectedDay])

  const selectedEntries = selectedDay ? byDay.get(dayKey(selectedDay)) ?? [] : []
  const overdueCount = meetings.filter((m) => m.meetingAt.getTime() < startToday && !m.summaryUploaded).length

  const DayButton = useMemo(() => {
    function DayButtonWithMarker(props: React.ComponentProps<typeof CalendarDayButton>) {
      const entries = byDay.get(dayKey(props.day.date)) ?? []
      const kinds = entries.length ? [...new Set(entries.map((m) => kindOf(m, startToday)))] : []
      return (
        <CalendarDayButton {...props} className={cn(props.className, "aspect-auto size-auto h-full min-h-12 w-full")}>
          {props.children}
          {entries.length > 0 && (
            <div className="flex items-center gap-0.5 leading-none">
              {kinds.map((k) => (
                <span key={k} className={cn("size-1.5 rounded-full", KIND_DOT[k])} />
              ))}
              {entries.length > 1 && <span className="text-[10px] font-semibold">{entries.length}</span>}
            </div>
          )}
        </CalendarDayButton>
      )
    }
    return DayButtonWithMarker
  }, [byDay, startToday])

  return (
    <Card className="lg:flex lg:h-[calc(100dvh-10rem)] lg:flex-col lg:overflow-hidden">
      <CardHeader className="pb-3 lg:shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />Meetings calendar
        </CardTitle>
        <CardDescription>
          Every meeting on its day — past, today and upcoming.{" "}
          {overdueCount > 0 ? (
            <span className="font-medium text-rose-600">{overdueCount} past meeting{overdueCount === 1 ? "" : "s"} still need a summary.</span>
          ) : (
            <>Past meetings drop off once their summary is uploaded.</>
          )}{" "}
          Tap a day to see its meetings.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        <div className="grid gap-5 px-4 pb-4 lg:h-full lg:grid-cols-[minmax(0,1fr)_22rem] lg:pb-0">
          <div className="min-w-0 lg:flex lg:min-h-0 lg:flex-col">
            <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
              <Calendar
                mode="single"
                month={month}
                onMonthChange={setMonth}
                selected={selectedDay ?? undefined}
                onDayClick={(day) => setSelectedDay(day)}
                showOutsideDays
                className="[--cell-size:--spacing(9)] lg:h-full"
                classNames={{
                  root: "w-full lg:flex lg:h-full lg:min-h-0 lg:flex-col",
                  months: "relative flex flex-col gap-4 lg:h-full lg:min-h-0 lg:flex-1",
                  month: "flex w-full flex-col gap-2 lg:h-full lg:min-h-0 lg:flex-1",
                  month_grid: "w-full lg:flex lg:min-h-0 lg:flex-1 lg:flex-col",
                  weeks: "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-1",
                  week: "flex w-full mt-2 lg:mt-0 lg:min-h-0 lg:flex-1",
                  day: "relative w-full select-none p-0 text-center group/day lg:h-full",
                }}
                components={{ DayButton }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-muted-foreground lg:shrink-0">
              {KIND_ORDER.map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full", KIND_DOT[k])} />
                  {KIND_LABEL[k]}
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded bg-accent" />today
              </span>
            </div>
          </div>

          <MeetingDayAgenda day={selectedDay} entries={selectedEntries} now={now} startToday={startToday} onOpenLead={onOpenLead} />
        </div>
      </CardContent>
    </Card>
  )
}

function MeetingDayAgenda({
  day, entries, now, startToday, onOpenLead,
}: {
  day: Date | null
  entries: MeetingsDueLead[]
  now: Date
  startToday: number
  onOpenLead: (id: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-col lg:min-h-0 lg:border-l lg:pl-5">
      <div className="mb-2 flex items-end justify-between gap-2 lg:shrink-0">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{day ? relLabel(day, now) : "Pick a day"}</p>
          {day && <p className="text-[11px] text-muted-foreground">{fullDate(day)}</p>}
        </div>
        {entries.length > 0 && (
          <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px]">
            {entries.length} {entries.length === 1 ? "meeting" : "meetings"}
          </Badge>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center">
          <CalendarDays className="mx-auto mb-2 size-5 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">{day ? "No meetings this day." : "Pick a day to see its meetings."}</p>
        </div>
      ) : (
        <div className="min-w-0 max-h-[58vh] space-y-1 overflow-y-auto overflow-x-hidden pr-1 lg:max-h-none lg:min-h-0 lg:flex-1">
          {entries.map((m) => (
            <MeetingAgendaRow key={m.meetingId} meeting={m} startToday={startToday} onOpenLead={onOpenLead} />
          ))}
        </div>
      )}
    </div>
  )
}

function MeetingAgendaRow({
  meeting, startToday, onOpenLead,
}: {
  meeting: MeetingsDueLead
  startToday: number
  onOpenLead: (id: string) => void
}) {
  const tel = meeting.phone.replace(/\D/g, "")
  const isZoom = meeting.meetingType === "zoom"
  const needsSummary = meeting.meetingAt.getTime() < startToday && !meeting.summaryUploaded
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenLead(meeting.id)}
      onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onOpenLead(meeting.id) } }}
      className={cn(
        "group flex cursor-pointer items-center gap-2.5 rounded-lg border bg-card px-2.5 py-2 transition-colors hover:bg-accent",
        needsSummary && "border-rose-200 bg-rose-50/60 hover:bg-rose-100/60",
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", needsSummary ? KIND_DOT.overdue : isZoom ? KIND_DOT.zoom : KIND_DOT.physical)} />
      <div className="shrink-0">
        <span className="whitespace-nowrap text-xs font-semibold tabular-nums">{fmtTime(meeting.meetingAt)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{meeting.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {isZoom ? "Zoom" : "Physical"}
          {!isZoom && meeting.location ? ` · ${meeting.location}` : ""}
          {meeting.assignedSalesperson ? ` · with ${meeting.assignedSalesperson}` : ""}
          {meeting.summaryUploaded ? (
            <span className="ml-1 inline-flex items-center gap-0.5 text-success"><CheckCircle2 className="size-3" />summary in</span>
          ) : needsSummary ? (
            <span className="ml-1 inline-flex items-center gap-0.5 font-medium text-rose-600"><AlertCircle className="size-3" />needs summary</span>
          ) : null}
        </p>
      </div>
      {isZoom && meeting.joinUrl ? (
        <a
          href={meeting.joinUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(ev) => ev.stopPropagation()}
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          title="Join meeting"
        >
          <Video className="size-3.5" />
        </a>
      ) : tel.length >= 10 ? (
        <a
          href={`tel:${tel}`}
          onClick={(ev) => ev.stopPropagation()}
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          title={`Call ${meeting.name}`}
        >
          <PhoneCall className="size-3.5" />
        </a>
      ) : (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
      )}
    </div>
  )
}
