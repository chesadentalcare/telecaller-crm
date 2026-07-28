"use client"

import { useState } from "react"
import { Inbox, ArrowRightLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import { useRole } from "@/hooks/use-role"
import { PipelineHub } from "./pipeline-hub"
import { SalesPipelineView } from "./sales-pipeline-view"

type PipeTab = "mine" | "sales"

interface PipelineTabsViewProps {
  onOpenLead: (id: string) => void
  initialTab?: PipeTab
}

// "Pipeline" merges the telecaller's own lead book with the "Sent to Sales"
// tracker (handed-over leads) into one screen with two tabs. Sales staff work in
// a separate app, so the Sales tab here is a read-only visibility view. A
// telecaller sees the leads THEY handed over (backend scopes it by handoff_from),
// so they know where their leads went.
export function PipelineTabsView({ onOpenLead, initialTab = "mine" }: PipelineTabsViewProps) {
  const { role, isManagerOrAbove, hasRole } = useRole()
  const canSeeSales = isManagerOrAbove || (role !== null && hasRole("telecaller", "sale_staff", "coordinator", "sale_head"))

  const [tab, setTab] = useState<PipeTab>(initialTab === "sales" && canSeeSales ? "sales" : "mine")

  // Pure telecaller (no sales visibility): just their pipeline, no tab bar.
  if (!canSeeSales) return <PipelineHub onOpenLead={onOpenLead} />

  const tabs = [
    { key: "mine" as const, label: "My Leads", icon: Inbox },
    { key: "sales" as const, label: "Sent to Sales", icon: ArrowRightLeft },
  ]

  return (
    <div className="space-y-4">
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
            </button>
          )
        })}
      </div>

      {tab === "mine"
        ? <PipelineHub onOpenLead={onOpenLead} />
        : <SalesPipelineView onOpenLead={onOpenLead} />}
    </div>
  )
}
