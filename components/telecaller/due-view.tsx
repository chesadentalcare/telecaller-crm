"use client"

import { useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { PhoneCall, CalendarClock, FileSpreadsheet, MessageSquare, Flame } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CallsDueView } from "./calls-due-view"
import { MeetingsDueView } from "./meetings-due-view"
import { RepliesDueView } from "./replies-due-view"
import { SuggestionsView } from "./suggestions-view"
import { DueExportDialog } from "./due-export-dialog"
import { useQueueCounts } from "@/hooks/use-queue-counts"
import { useMeetingsDueLeads } from "@/hooks/use-leads"
import { SHOW_CLOSE_TODAY } from "@/lib/feature-flags"

type DueTab = "close" | "calls" | "meetings" | "replies"

interface DueViewProps {
  onOpenLead: (id: string, action?: string) => void
  initialTab?: DueTab
}

// "Due" merges the old Calls Due + Meetings Due into one screen with two tabs,
// so the sidebar carries a single item. Each tab keeps its own internal
// Today / Past / Upcoming views (rendered by CallsDueView / MeetingsDueView).
export function DueView({ onOpenLead, initialTab = "close" }: DueViewProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const urlTab = searchParams.get("duetab")
  const rawTab: DueTab =
    urlTab === "close" || urlTab === "calls" || urlTab === "meetings" || urlTab === "replies" ? urlTab : initialTab
  const tab: DueTab = !SHOW_CLOSE_TODAY && rawTab === "close" ? "calls" : rawTab
  const setTab = (t: DueTab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("duetab", t)
    window.history.pushState(null, "", `${pathname}?${params.toString()}`)
  }
  const [exportOpen, setExportOpen] = useState(false)
  const counts = useQueueCounts()
  const { data: meetings = [] } = useMeetingsDueLeads()

  const tabs = [
    ...(SHOW_CLOSE_TODAY
      ? [{ key: "close" as const, label: "Close Today", icon: Flame, count: counts.closeToday }]
      : []),
    { key: "calls" as const, label: "Calls", icon: PhoneCall, count: counts.callsDue },
    { key: "meetings" as const, label: "Meetings", icon: CalendarClock, count: meetings.length },
    { key: "replies" as const, label: "WhatsApp Replies", icon: MessageSquare, count: counts.pipelineAwaitingReply },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">Close today, calls &amp; meetings</p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setExportOpen(true)}>
          <FileSpreadsheet className="size-4" />Export to Excel
        </Button>
      </div>

      <DueExportDialog open={exportOpen} onOpenChange={setExportOpen} />

      <div className={cn(
        "grid grid-cols-2 gap-1.5 rounded-xl border bg-muted/30 p-1",
        tabs.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3",
      )}>
        {tabs.map((t) => {
          const active = tab === t.key
          const Icon = t.icon
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition",
                active ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t.label}
              {t.count > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 justify-center px-1.5 text-[11px]">
                  {t.count}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {tab === "close" ? (
        <SuggestionsView onOpenLead={onOpenLead} />
      ) : tab === "calls" ? (
        <CallsDueView onOpenLead={onOpenLead} />
      ) : tab === "meetings" ? (
        <MeetingsDueView onOpenLead={onOpenLead} />
      ) : (
        <RepliesDueView onOpenLead={onOpenLead} />
      )}
    </div>
  )
}
