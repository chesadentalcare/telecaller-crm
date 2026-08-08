"use client"

import {
  ArrowDown,
  CalendarCheck,
  CheckCircle2,
  Droplets,
  MapPin,
  MessageSquare,
  PhoneCall,
  PhoneOutgoing,
  PlusCircle,
  type LucideIcon,
} from "lucide-react"

import type { LeadDetail } from "@/lib/api/leads"
import { buildLeadJourney, type JourneyPhase, type JourneyTone } from "@/lib/lead-journey"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const PHASE: Record<JourneyPhase, { ring: string; bg: string; text: string; Icon: LucideIcon }> = {
  intake:  { ring: "border-l-blue-500",    bg: "bg-blue-500/10",    text: "text-blue-600",    Icon: PlusCircle },
  contact: { ring: "border-l-teal-500",    bg: "bg-teal-500/10",    text: "text-teal-600",    Icon: PhoneOutgoing },
  qualify: { ring: "border-l-purple-500",  bg: "bg-purple-500/10",  text: "text-purple-600",  Icon: CheckCircle2 },
  call:    { ring: "border-l-amber-500",   bg: "bg-amber-500/10",   text: "text-amber-600",   Icon: PhoneCall },
  drip:    { ring: "border-l-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-600", Icon: Droplets },
  reply:   { ring: "border-l-yellow-500",  bg: "bg-yellow-500/10",  text: "text-yellow-600",  Icon: MessageSquare },
  meeting: { ring: "border-l-indigo-500",  bg: "bg-indigo-500/10",  text: "text-indigo-600",  Icon: CalendarCheck },
  current: { ring: "border-l-foreground",  bg: "bg-foreground/10",  text: "text-foreground",  Icon: MapPin },
}

const TONE: Record<JourneyTone, string> = {
  neutral: "bg-slate-400",
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-red-500",
}

function fmt(at?: string | null): string {
  if (!at) return ""
  const d = new Date(at)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function LeadJourney({ detail }: { detail?: LeadDetail | null }) {
  if (!detail) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading the journey…</p>
  }

  const { steps, summary } = buildLeadJourney(detail)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Lead journey</h3>
        <p className="text-xs text-muted-foreground">The actual path this lead has travelled, rebuilt from its real activity.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="text-[11px]">Stage: {summary.stage}</Badge>
        <Badge variant="outline" className="text-[11px]">Route: {summary.route}</Badge>
        {summary.qualified && <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 text-[11px]">Qualified</Badge>}
        {summary.inDrip && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[11px]">In drip · {summary.dripTrack}</Badge>}
        {summary.awaitingReply && <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[11px]">Needs reply</Badge>}
        {summary.optedOut && <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[11px]">Opted out</Badge>}
        {summary.terminal && <Badge className="bg-slate-500/15 text-slate-600 border-slate-500/30 text-[11px]">Closed: {summary.terminal}</Badge>}
        <Badge variant="outline" className="text-[11px]">WhatsApp sent: {summary.outbound.total} ({summary.outbound.drip} drip)</Badge>
      </div>

      <div>
        {steps.map((s, i) => {
          const style = PHASE[s.phase]
          const isCurrent = s.phase === "current"
          const { Icon } = style
          return (
            <div key={s.key}>
              <div
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-l-4 bg-card p-3",
                  style.ring,
                  isCurrent && "ring-2 ring-foreground/20 shadow-sm",
                )}
              >
                <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", style.bg, style.text)}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 shrink-0 rounded-full", TONE[s.tone])} />
                    <p className={cn("text-sm", isCurrent ? "font-semibold" : "font-medium")}>{s.title}</p>
                  </div>
                  {s.detail && <p className="mt-0.5 break-words text-xs text-muted-foreground">{s.detail}</p>}
                </div>
                {s.at && <time className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">{fmt(s.at)}</time>}
              </div>
              {i < steps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="size-4 text-muted-foreground/60" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
