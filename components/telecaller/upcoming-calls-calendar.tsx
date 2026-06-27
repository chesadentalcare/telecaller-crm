"use client"

// Upcoming Calls — the simple "big calendar" half of the Calls Due page. No colours
// or legend to learn: each day just shows HOW MANY calls it holds, and the selected
// day's calls appear right beside the grid. It opens already pointed at the rep's next
// calls (today, or the soonest day with calls) so they feel connected on arrival.
//
// The grid merges BOTH worklist sources so it's never empty around today:
//   • useCallsDueLeads()  → today + overdue/past calls
//   • useUpcomingCalls()  → future callbacks/re-qual + projected drip touches
// Days are bucketed by a LOCAL key (see flatten-upcoming.ts) so IST evening calls
// don't slip into the adjacent day.

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { PhoneCall, CalendarDays, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useCallsDueLeads, useUpcomingCalls } from "@/hooks/use-leads"
import {
  buildByDay, dayKey, distinctKinds, flattenCallsDue, flattenUpcoming, pickDefaultDay,
  lastOutcomeLabel, KIND_DOT, KIND_LABEL, KIND_ORDER, TRACK_LABEL, type CallEntry,
} from "@/lib/calls/flatten-upcoming"

// ── Friendly date helpers ──────────────────────────────────────────────────
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000)
const fullDate = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
const fmtTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })

// "Today" / "Tomorrow" / "Yesterday" / "Fri 28 Jun"
const relLabel = (d: Date, now: Date) => {
  const diff = dayDiff(d, now)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff === -1) return "Yesterday"
  return fullDate(d)
}

const kindOf = (e: CallEntry) =>
  e.kind === "drip" && e.track ? `${TRACK_LABEL[e.track] ?? e.track} drip` : KIND_LABEL[e.kind]

export function UpcomingCallsCalendar({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const { data: leads = [] } = useCallsDueLeads()
  const { data: upcoming } = useUpcomingCalls()
  const now = new Date()

  const [month, setMonth] = useState<Date>(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Day-bucketed entries from both sources (memoised on the query data).
  const byDay = useMemo(
    () => buildByDay([...flattenCallsDue(leads), ...flattenUpcoming(upcoming)]),
    [leads, upcoming],
  )

  // Auto-point the agenda at the rep's next calls the moment data lands, so they
  // don't have to hunt — "connected on arrival". Only until they pick a day themselves.
  useEffect(() => {
    if (selectedDay) return
    const best = pickDefaultDay(byDay, new Date())
    if (best) { setSelectedDay(best); setMonth(best) }
  }, [byDay, selectedDay])

  // Natural-language summary: count + the single soonest upcoming call.
  const nextUp = useMemo(() => {
    const t = Date.now()
    return flattenUpcoming(upcoming)
      .filter((e) => e.at.getTime() >= t)
      .sort((a, b) => a.at.getTime() - b.at.getTime())
  }, [upcoming])
  const next = nextUp[0]
  const nextWhen = next
    ? (() => {
        const diff = dayDiff(next.at, now)
        const rel = diff === 0 ? "today" : diff === 1 ? "tomorrow" : `on ${fullDate(next.at)}`
        return `${rel}, ${fmtTime(next.at)}`
      })()
    : null

  const selectedEntries = selectedDay ? byDay.get(dayKey(selectedDay)) ?? [] : []

  // DayButton override — a colour dot per call TYPE present that day (professional
  // at-a-glance recognition) plus the total count. Memoised on byDay.
  const DayButton = useMemo(() => {
    function DayButtonWithMarker(props: React.ComponentProps<typeof CalendarDayButton>) {
      const entries = byDay.get(dayKey(props.day.date)) ?? []
      const kinds = entries.length ? distinctKinds(entries) : []
      return (
        // Drop the primitive's aspect-square so the day fills its (flex-sized) cell —
        // the grid stretches to fill both the column width and the viewport height.
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
  }, [byDay])

  return (
    // On desktop the whole view fits the viewport (header + paddings + tab strip ≈ 10rem
    // of chrome) so the page never scrolls and the day agenda on the right is ALWAYS in
    // view. On mobile it falls back to natural stacked flow.
    <Card className="lg:flex lg:h-[calc(100dvh-10rem)] lg:flex-col lg:overflow-hidden">
      <CardHeader className="pb-3 lg:shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />Upcoming Calls
        </CardTitle>
        <CardDescription>
          {next ? (
            <>
              You have <span className="font-medium text-foreground">{nextUp.length} call{nextUp.length === 1 ? "" : "s"}</span> coming up.{" "}
              Next: <span className="font-medium text-foreground">{next.name}</span> — {nextWhen}. Pick any day to see who to call.
            </>
          ) : (
            <>No upcoming calls scheduled. Calls you book or that the nurture flow schedules will appear here.</>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        <div className="grid gap-5 px-4 pb-4 lg:h-full lg:grid-cols-[minmax(0,1fr)_22rem] lg:pb-0">
          {/* Big month calendar — the grid flex-fills the column so it spans the full
              width AND height (week rows share the height); nav/caption stay on top. */}
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
            {/* Legend — what each colour means, so the dots read instantly */}
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
            <p className="mt-1 px-1 text-[11px] text-muted-foreground/80 lg:shrink-0">
              Each dot is a call type; the number is how many calls that day. Tap a day to see the list.
            </p>
          </div>

          {/* Auto-opened day agenda — fills the column height with its own scroll */}
          <DayAgenda day={selectedDay} entries={selectedEntries} now={now} onOpenLead={onOpenLead} />
        </div>
      </CardContent>
    </Card>
  )
}

function DayAgenda({
  day, entries, now, onOpenLead,
}: {
  day: Date | null
  entries: CallEntry[]
  now: Date
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
            {entries.length} {entries.length === 1 ? "call" : "calls"}
          </Badge>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center">
          <CalendarDays className="mx-auto mb-2 size-5 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">{day ? "No calls this day." : "Pick a day to see its calls."}</p>
        </div>
      ) : (
        // Native scroll (not Radix ScrollArea — its display:table viewport grows to
        // content width and defeats truncation, overflowing the column).
        <div className="min-w-0 max-h-[58vh] space-y-1 overflow-y-auto overflow-x-hidden pr-1 lg:max-h-none lg:min-h-0 lg:flex-1">
          {entries.map((e) => (
            <AgendaRow key={`${e.leadId}-${e.kind}-${e.at.getTime()}`} entry={e} onOpenLead={onOpenLead} />
          ))}
        </div>
      )}
    </div>
  )
}

function AgendaRow({ entry, onOpenLead }: { entry: CallEntry; onOpenLead: (id: string) => void }) {
  const tel = entry.phone.replace(/\D/g, "")
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenLead(entry.leadId)}
      onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onOpenLead(entry.leadId) } }}
      className="group flex cursor-pointer items-center gap-2.5 rounded-lg border bg-card px-2.5 py-2 transition-colors hover:bg-accent"
    >
      <span className={cn("size-2 shrink-0 rounded-full", KIND_DOT[entry.kind])} title={kindOf(entry)} />
      <div className="shrink-0">
        <span className="whitespace-nowrap text-xs font-semibold tabular-nums">{fmtTime(entry.at)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {entry.equipment && entry.equipment !== "—" ? `${entry.equipment} · ` : ""}{kindOf(entry)}
          {" · "}
          <span className={entry.lastOutcome ? "text-foreground/70" : "font-medium text-primary"}>
            {lastOutcomeLabel(entry.lastOutcome)}
          </span>
        </p>
      </div>
      {tel.length >= 10 ? (
        <a
          href={`tel:${tel}`}
          onClick={(ev) => ev.stopPropagation()}
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          title={`Call ${entry.name}`}
        >
          <PhoneCall className="size-3.5" />
        </a>
      ) : (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
      )}
    </div>
  )
}
