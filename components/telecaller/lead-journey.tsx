"use client"

import { Fragment, useEffect, useState } from "react"
import {
  PlusCircle, PhoneOutgoing, CheckCircle2, PhoneCall, Droplets, MessageSquare,
  CalendarCheck, FileText, Handshake, Moon, MapPin, ChevronRight, ChevronLeft,
  CornerDownLeft, CornerDownRight, type LucideIcon,
} from "lucide-react"

import type { LeadDetail } from "@/lib/api/leads"
import { buildLeadJourney, type JourneyActor, type JourneyPhase, type JourneyStep, type JourneyTone } from "@/lib/lead-journey"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const PHASE: Record<JourneyPhase, { border: string; bg: string; text: string; Icon: LucideIcon }> = {
  intake:  { border: "border-l-sky-500",     bg: "bg-sky-50",     text: "text-sky-600",     Icon: PlusCircle },
  contact: { border: "border-l-teal-500",    bg: "bg-teal-50",    text: "text-teal-600",    Icon: PhoneOutgoing },
  qualify: { border: "border-l-violet-500",  bg: "bg-violet-50",  text: "text-violet-600",  Icon: CheckCircle2 },
  call:    { border: "border-l-amber-500",   bg: "bg-amber-50",   text: "text-amber-600",   Icon: PhoneCall },
  drip:    { border: "border-l-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600", Icon: Droplets },
  reply:   { border: "border-l-rose-500",    bg: "bg-rose-50",    text: "text-rose-600",    Icon: MessageSquare },
  meeting: { border: "border-l-indigo-500",  bg: "bg-indigo-50",  text: "text-indigo-600",  Icon: CalendarCheck },
  quote:   { border: "border-l-cyan-500",    bg: "bg-cyan-50",    text: "text-cyan-600",    Icon: FileText },
  sales:   { border: "border-l-fuchsia-500", bg: "bg-fuchsia-50", text: "text-fuchsia-600", Icon: Handshake },
  dormant: { border: "border-l-slate-400",   bg: "bg-slate-100",  text: "text-slate-500",   Icon: Moon },
  current: { border: "border-l-primary",     bg: "bg-primary/10", text: "text-primary",     Icon: MapPin },
}

const TONE: Record<JourneyTone, string> = {
  neutral: "bg-slate-400", good: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-rose-500",
}

const ACTOR: Record<JourneyActor, { label: string; cls: string }> = {
  system:   { label: "auto",     cls: "bg-slate-200 text-slate-600" },
  rep:      { label: "rep",      cls: "bg-blue-100 text-blue-700" },
  customer: { label: "customer", cls: "bg-amber-100 text-amber-700" },
  sales:    { label: "sales",    cls: "bg-fuchsia-100 text-fuchsia-700" },
}

function fmt(at?: string | null): string {
  if (!at) return ""
  const d = new Date(at)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
}

// Responsive column count for the serpentine grid.
function useCols(): number {
  const [cols, setCols] = useState(3)
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth
      setCols(w < 640 ? 2 : w < 1024 ? 3 : 4)
    }
    compute()
    window.addEventListener("resize", compute)
    return () => window.removeEventListener("resize", compute)
  }, [])
  return cols
}

function StepBox({ step, order }: { step: JourneyStep; order: number }) {
  const s = PHASE[step.phase]
  const isCurrent = step.phase === "current"
  const { Icon } = s
  return (
    <div
      style={{ animationDelay: `${Math.min(order, 40) * 45}ms`, animationDuration: "320ms" }}
      className={cn(
        "animate-in fade-in-0 zoom-in-95 fill-mode-both",
        "relative flex min-w-0 flex-1 basis-28 flex-col gap-0.5 rounded-lg border border-l-[3px] px-2 py-1.5 shadow-sm",
        s.border, s.bg,
        isCurrent && "ring-2 ring-primary/50",
      )}
    >
      <div className="flex items-center gap-1">
        <span className={cn("size-1.5 shrink-0 rounded-full", TONE[step.tone])} />
        <Icon className={cn("size-3.5 shrink-0", s.text)} />
        <span className="truncate text-[11px] font-semibold leading-tight">{step.title}</span>
      </div>
      {step.detail && (
        <span className="truncate text-[10px] leading-tight text-muted-foreground" title={step.detail}>{step.detail}</span>
      )}
      <div className="mt-0.5 flex items-center justify-between gap-1">
        <span className="truncate text-[9px] text-muted-foreground">{fmt(step.at)}</span>
        <span className={cn("shrink-0 rounded px-1 py-px text-[8px] font-medium leading-none", ACTOR[step.actor].cls)}>
          {ACTOR[step.actor].label}
        </span>
      </div>
    </div>
  )
}

export function LeadJourney({ detail }: { detail?: LeadDetail | null }) {
  const cols = useCols()
  if (!detail) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading the journey…</p>
  }

  const { steps, summary } = buildLeadJourney(detail)

  const rows: { step: JourneyStep; gi: number }[][] = []
  for (let i = 0; i < steps.length; i += cols) {
    rows.push(steps.slice(i, i + cols).map((step, j) => ({ step, gi: i + j })))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Lead journey</h3>
          <p className="text-[11px] text-muted-foreground">
            Every event this lead went through — rep actions, customer replies and automated jobs. {summary.totalEvents} events.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {summary.qualified && <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30 text-[10px]">Qualified</Badge>}
          {summary.inDrip && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">Drip · {summary.dripTrack}</Badge>}
          {summary.awaitingReply && <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">Needs reply</Badge>}
          {summary.optedOut && <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px]">Opted out</Badge>}
          {summary.terminal && <Badge className="bg-slate-500/15 text-slate-600 border-slate-500/30 text-[10px]">{summary.terminal}</Badge>}
        </div>
      </div>

      {/* Serpentine flow — small boxes snaking L→R then R→L, connected by arrows. */}
      <div className="space-y-0.5">
        {rows.map((rowItems, r) => {
          const ltr = r % 2 === 0
          const ordered = ltr ? rowItems : [...rowItems].reverse()
          return (
            <div key={r}>
              <div className="flex items-stretch gap-1">
                {ordered.map(({ step, gi }, i) => (
                  <Fragment key={step.key}>
                    <StepBox step={step} order={gi} />
                    {i < ordered.length - 1 && (
                      ltr
                        ? <ChevronRight className="size-4 shrink-0 self-center text-muted-foreground/50" />
                        : <ChevronLeft className="size-4 shrink-0 self-center text-muted-foreground/50" />
                    )}
                  </Fragment>
                ))}
              </div>
              {r < rows.length - 1 && (
                <div className={cn("flex px-3 py-0.5", ltr ? "justify-end" : "justify-start")}>
                  {ltr
                    ? <CornerDownLeft className="size-4 text-muted-foreground/50" />
                    : <CornerDownRight className="size-4 text-muted-foreground/50" />}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actor legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[10px] text-muted-foreground">
        {(Object.keys(ACTOR) as JourneyActor[]).map((a) => (
          <span key={a} className="flex items-center gap-1">
            <span className={cn("rounded px-1 py-px text-[8px] font-medium leading-none", ACTOR[a].cls)}>{ACTOR[a].label}</span>
            {a === "system" ? "automated job" : a === "rep" ? "telecaller" : a === "customer" ? "the lead" : "sales team"}
          </span>
        ))}
      </div>
    </div>
  )
}
