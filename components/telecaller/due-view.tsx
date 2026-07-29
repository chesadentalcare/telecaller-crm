"use client"

import { useState } from "react"
import { PhoneCall, CalendarClock, FileSpreadsheet } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CallsDueView } from "./calls-due-view"
import { MeetingsDueView } from "./meetings-due-view"
import { DueExportDialog } from "./due-export-dialog"
import { useQueueCounts } from "@/hooks/use-queue-counts"
import { useMeetingsDueLeads } from "@/hooks/use-leads"

type DueTab = "calls" | "meetings"

interface DueViewProps {
  onOpenLead: (id: string) => void
  initialTab?: DueTab
}

// "Due" merges the old Calls Due + Meetings Due into one screen with two tabs,
// so the sidebar carries a single item. Each tab keeps its own internal
// Today / Past / Upcoming views (rendered by CallsDueView / MeetingsDueView).
export function DueView({ onOpenLead, initialTab = "calls" }: DueViewProps) {
  const [tab, setTab] = useState<DueTab>(initialTab)
  const [exportOpen, setExportOpen] = useState(false)
  const counts = useQueueCounts()
  const { data: meetings = [] } = useMeetingsDueLeads()

  const tabs = [
    { key: "calls" as const, label: "Calls", icon: PhoneCall, count: counts.callsDue },
    { key: "meetings" as const, label: "Meetings", icon: CalendarClock, count: meetings.length },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">Calls &amp; meetings due</p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setExportOpen(true)}>
          <FileSpreadsheet className="size-4" />Export to Excel
        </Button>
      </div>

      <DueExportDialog open={exportOpen} onOpenChange={setExportOpen} />

      <div className="grid grid-cols-2 gap-1.5 rounded-xl border bg-muted/30 p-1">
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

      {tab === "calls"
        ? <CallsDueView onOpenLead={onOpenLead} />
        : <MeetingsDueView onOpenLead={onOpenLead} />}
    </div>
  )
}
