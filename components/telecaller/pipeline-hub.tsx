"use client"

// Pipeline hub — the single "all leads" surface. The sidebar used to list every
// lifecycle bucket (Drip, No Response, Idle, 6-Month, Re-qualify, Reactivation,
// Archived) as its own tab, which overwhelmed the rep. They're all just status
// SEGMENTS of the same book, so they live here behind one in-page segmented
// control. Each segment mounts the existing, unchanged queue view — no queue
// logic is duplicated. The active segment is synced to the `segment` URL param
// so deep-links / browser-back / shared links work.

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useSearchParams, usePathname } from "next/navigation"
import {
  Inbox, PhoneOff, RotateCcw, Archive, RefreshCw, XCircle, Trophy, FileSpreadsheet, ClipboardCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ViewSkeleton } from "./view-skeleton"
import { LeadsExportDialog } from "./leads-export-dialog"
import { PipelineDateFilterProvider, PipelineDateBar } from "@/lib/pipeline-date-filter"
import { useQueueCounts } from "@/hooks/use-queue-counts"
import { useRole } from "@/hooks/use-role"
import type { QueueCounts } from "@/lib/types/lead"

// Lazy-load each segment so only the selected one is fetched/rendered — preserves
// the per-view code-splitting the registry had before.
const PipelineView = dynamic(() => import("./pipeline-view").then((m) => ({ default: m.PipelineView })), { loading: () => <ViewSkeleton /> })
const PendingFollowUpsCard = dynamic(() => import("./drip-queue-view").then((m) => ({ default: m.PendingFollowUpsCard })), { loading: () => null })
const NoResponseView = dynamic(() => import("./no-response-view").then((m) => ({ default: m.NoResponseView })), { loading: () => <ViewSkeleton /> })
const RequalificationView = dynamic(() => import("./requalification-view").then((m) => ({ default: m.RequalificationView })), { loading: () => <ViewSkeleton /> })
const ReactivationView = dynamic(() => import("./reactivation-view").then((m) => ({ default: m.ReactivationView })), { loading: () => <ViewSkeleton /> })
const DripCompletedView = dynamic(() => import("./drip-completed-view").then((m) => ({ default: m.DripCompletedView })), { loading: () => <ViewSkeleton /> })
const ArchivedView = dynamic(() => import("./archived-view").then((m) => ({ default: m.ArchivedView })), { loading: () => <ViewSkeleton /> })
const LostView = dynamic(() => import("./lost-view").then((m) => ({ default: m.LostView })), { loading: () => <ViewSkeleton /> })
const WonView = dynamic(() => import("./won-view").then((m) => ({ default: m.WonView })), { loading: () => <ViewSkeleton /> })

type SegmentId =
  | "active" | "no-response"
  | "requalification" | "reactivation" | "drip-completed" | "archived" | "lost" | "won"

interface Segment {
  id: SegmentId
  label: string
  icon: typeof Inbox
  countKey?: keyof QueueCounts
  render: (onOpenLead: (id: string) => void) => React.ReactNode
}

const SEGMENTS: Segment[] = [
  { id: "active",         label: "Active",      icon: Inbox,        countKey: "pipeline",        render: (open) => (<div className="space-y-4"><PipelineView onOpenLead={open} /><PendingFollowUpsCard /></div>) },
  { id: "no-response",    label: "No Response", icon: PhoneOff,     countKey: "noResponse",      render: (open) => <NoResponseView onOpenLead={open} /> },
  { id: "requalification", label: "Re-qualify", icon: RefreshCw,    countKey: "requalification", render: (open) => <RequalificationView onOpenLead={open} /> },
  { id: "reactivation",   label: "Reactivation", icon: RotateCcw,   countKey: "reactivation",    render: (open) => <ReactivationView onOpenLead={open} /> },
  { id: "drip-completed", label: "Drip Completed", icon: ClipboardCheck, countKey: "dripCompleted", render: (open) => <DripCompletedView onOpenLead={open} /> },
  { id: "archived",       label: "Archived",    icon: Archive,      countKey: "archived",        render: (open) => <ArchivedView onOpenLead={open} /> },
  { id: "lost",           label: "Lost",        icon: XCircle,      countKey: "lost",            render: (open) => <LostView onOpenLead={open} /> },
  { id: "won",            label: "Won",         icon: Trophy,       countKey: "won",             render: (open) => <WonView onOpenLead={open} /> },
]

interface PipelineHubProps {
  onOpenLead: (id: string) => void
}

export function PipelineHub({ onOpenLead }: PipelineHubProps) {
  return (
    <PipelineDateFilterProvider>
      <PipelineHubInner onOpenLead={onOpenLead} />
    </PipelineDateFilterProvider>
  )
}

// Inner lives INSIDE the date-filter provider so the tab badge counts (and the
// segment lists) both react to the selected created-date range.
function PipelineHubInner({ onOpenLead }: PipelineHubProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const counts = useQueueCounts()
  const { isManagerOrAbove, isTelecaller } = useRole()
  const [exportOpen, setExportOpen] = useState(false)

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
    // Static export served by Apache: router.push for a query-only change can
    // intermittently hard-navigate (full page reload). pushState is a pure
    // client-side URL update — Next 16 keeps useSearchParams reactive.
    window.history.pushState(null, "", `${pathname}?${params.toString()}`)
  }

  const current = SEGMENTS.find((s) => s.id === active) ?? SEGMENTS[0]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PipelineDateBar />
        {(isManagerOrAbove || isTelecaller) && (
          <div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setExportOpen(true)}>
              <FileSpreadsheet className="size-4" />Export all data
            </Button>
            <LeadsExportDialog open={exportOpen} onOpenChange={setExportOpen} />
          </div>
        )}
      </div>

      {/* Segmented control — single scrollable strip (no messy wrap on mobile) */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
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
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
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
