"use client"

// Pipeline hub — the single "all leads" surface. The sidebar used to list every
// lifecycle bucket (Drip, No Response, Idle, 6-Month, Re-qualify, Reactivation,
// Archived) as its own tab, which overwhelmed the rep. They're all just status
// SEGMENTS of the same book, so they live here behind one in-page segmented
// control. Each segment mounts the existing, unchanged queue view — no queue
// logic is duplicated. The active segment is synced to the `segment` URL param
// so deep-links / browser-back / shared links work.

import { useMemo } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  Inbox, Timer, PhoneOff, Moon, CalendarClock, RotateCcw, Archive, RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ViewSkeleton } from "./view-skeleton"
import { useQueueCounts } from "@/hooks/use-queue-counts"
import type { QueueCounts } from "@/lib/types/lead"

// Lazy-load each segment so only the selected one is fetched/rendered — preserves
// the per-view code-splitting the registry had before.
const PipelineView = dynamic(() => import("./pipeline-view").then((m) => ({ default: m.PipelineView })), { loading: () => <ViewSkeleton /> })
const DripQueueView = dynamic(() => import("./drip-queue-view").then((m) => ({ default: m.DripQueueView })), { loading: () => <ViewSkeleton /> })
const NoResponseView = dynamic(() => import("./no-response-view").then((m) => ({ default: m.NoResponseView })), { loading: () => <ViewSkeleton /> })
const IdleQueueView = dynamic(() => import("./idle-queue-view").then((m) => ({ default: m.IdleQueueView })), { loading: () => <ViewSkeleton /> })
const SixMonthFunnelView = dynamic(() => import("./six-month-funnel-view").then((m) => ({ default: m.SixMonthFunnelView })), { loading: () => <ViewSkeleton /> })
const RequalificationView = dynamic(() => import("./requalification-view").then((m) => ({ default: m.RequalificationView })), { loading: () => <ViewSkeleton /> })
const ReactivationView = dynamic(() => import("./reactivation-view").then((m) => ({ default: m.ReactivationView })), { loading: () => <ViewSkeleton /> })
const ArchivedView = dynamic(() => import("./archived-view").then((m) => ({ default: m.ArchivedView })), { loading: () => <ViewSkeleton /> })

type SegmentId =
  | "active" | "drip" | "no-response" | "idle"
  | "six-month" | "requalification" | "reactivation" | "archived"

interface Segment {
  id: SegmentId
  label: string
  icon: typeof Inbox
  countKey?: keyof QueueCounts
  render: (onOpenLead: (id: string) => void) => React.ReactNode
}

const SEGMENTS: Segment[] = [
  { id: "active",         label: "Active",      icon: Inbox,        countKey: "pipeline",        render: (open) => <PipelineView onOpenLead={open} /> },
  { id: "drip",           label: "Nurturing",   icon: Timer,        countKey: "drip",            render: (open) => <DripQueueView onOpenLead={open} /> },
  { id: "no-response",    label: "No Response", icon: PhoneOff,     countKey: "noResponse",      render: (open) => <NoResponseView onOpenLead={open} /> },
  { id: "idle",           label: "Idle",        icon: Moon,         countKey: "idle",            render: () => <IdleQueueView /> },
  { id: "six-month",      label: "Long-cycle",  icon: CalendarClock, countKey: "sixMonth",       render: (open) => <SixMonthFunnelView onOpenLead={open} /> },
  { id: "requalification", label: "Re-qualify", icon: RefreshCw,    countKey: "requalification", render: (open) => <RequalificationView onOpenLead={open} /> },
  { id: "reactivation",   label: "Reactivation", icon: RotateCcw,   countKey: "reactivation",    render: (open) => <ReactivationView onOpenLead={open} /> },
  { id: "archived",       label: "Archived",    icon: Archive,      countKey: "archived",        render: (open) => <ArchivedView onOpenLead={open} /> },
]

interface PipelineHubProps {
  onOpenLead: (id: string) => void
}

export function PipelineHub({ onOpenLead }: PipelineHubProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const counts = useQueueCounts()

  const param = searchParams.get("segment")
  const active = useMemo<SegmentId>(
    () => (SEGMENTS.some((s) => s.id === param) ? (param as SegmentId) : "active"),
    [param],
  )

  const setSegment = (id: SegmentId) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("view", "pipeline")
    if (id === "active") params.delete("segment")
    else params.set("segment", id)
    params.delete("leadId")
    router.push(`${pathname}?${params.toString()}`)
  }

  const current = SEGMENTS.find((s) => s.id === active) ?? SEGMENTS[0]

  return (
    <div className="space-y-4">
      {/* Segmented control */}
      <div className="flex flex-wrap gap-1.5">
        {SEGMENTS.map((seg) => {
          const Icon = seg.icon
          const isActive = seg.id === active
          const count = seg.countKey ? counts[seg.countKey] : 0
          return (
            <button
              key={seg.id}
              type="button"
              onClick={() => setSegment(seg.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {seg.label}
              {count > 0 && (
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className="ml-0.5 h-4 min-w-4 px-1 text-[10px] font-semibold leading-none"
                >
                  {count > 99 ? "99+" : count}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Active segment body */}
      <div>{current.render(onOpenLead)}</div>
    </div>
  )
}
