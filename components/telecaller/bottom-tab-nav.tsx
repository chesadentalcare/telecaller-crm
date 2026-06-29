"use client"

import { useMemo, useState } from "react"
import {
  LayoutDashboard,
  Inbox,
  MoreHorizontal,
  UserPlus,
  PhoneCall,
  Briefcase,
  Activity,
  ClipboardCheck,
} from "lucide-react"
import { useRole } from "@/hooks/use-role"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { QueueCounts } from "@/lib/types/lead"

interface BottomTabNavProps {
  activeView: string
  onViewChange: (view: string) => void
  queueCounts: QueueCounts
}

export function BottomTabNav({
  activeView,
  onViewChange,
  queueCounts,
}: BottomTabNavProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const { isManagerOrAbove, isSalesperson, isTelecaller } = useRole()
  // A pure sales role (sale_staff/coordinator/sale_head) — not a telecaller and
  // not a manager/admin. Their bottom nav is sales-centric, not intake-centric.
  const salesOnly = isSalesperson && !isManagerOrAbove && !isTelecaller
  // A pure telecaller — worklist-first, no manager surfaces.
  const teleOnly = isTelecaller && !isManagerOrAbove

  // Lean nav (Amendment): the status buckets (drip / no-response / idle / 6-month /
  // re-qualify / reactivation / archived) are now segments INSIDE Pipeline, so the
  // bottom bar only carries the primary work surfaces.
  const primaryTabs = useMemo(
    () =>
      salesOnly
        ? [
            { id: "home",           title: "Home",     icon: LayoutDashboard },
            { id: "sales-pipeline", title: "Sales",    icon: Briefcase },
            { id: "pipeline",       title: "Pipeline", icon: Inbox, count: queueCounts.pipelineAwaitingReply },
          ]
        : teleOnly
        ? [
            // Badge counts = un-replied WhatsApp responses, not queue size.
            { id: "calls-due", title: "Calls Due", icon: PhoneCall, count: queueCounts.callsDueAwaitingReply },
            { id: "pipeline",  title: "Pipeline",  icon: Inbox,     count: queueCounts.pipelineAwaitingReply },
            { id: "new-lead",  title: "Add Lead",  icon: UserPlus },
            { id: "home",      title: "Home",      icon: LayoutDashboard },
          ]
        : [
            // Manager / admin
            { id: "home",      title: "Home",      icon: LayoutDashboard },
            { id: "calls-due", title: "Calls Due", icon: PhoneCall, count: queueCounts.callsDueAwaitingReply },
            { id: "pipeline",  title: "Pipeline",  icon: Inbox,     count: queueCounts.pipelineAwaitingReply },
          ],
    [queueCounts, salesOnly, teleOnly],
  )

  // Only manager/admin keep an overflow sheet (their oversight surfaces). For
  // telecaller/sales everything lives in the primary tabs + Pipeline segments.
  const moreItems = useMemo(
    () =>
      isManagerOrAbove
        ? [
            { id: "sales-pipeline", title: "Sales Pipeline", icon: Briefcase,      subtitle: "Handed-over leads" },
            { id: "flow-oversight", title: "Flow Oversight", icon: Activity,       subtitle: "Team analytics & health" },
            { id: "approvals",      title: "Approvals",      icon: ClipboardCheck, subtitle: "Discount requests" },
          ]
        : [],
    [isManagerOrAbove],
  )

  const isMoreActive = moreItems.some((i) => i.id === activeView)

  const handleSelect = (id: string) => {
    onViewChange(id)
    setMoreOpen(false)
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border bg-card h-16 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
      aria-label="Primary"
    >
      {primaryTabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeView === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleSelect(tab.id)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 h-full px-1 py-1.5 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-5" />
            <span className="text-[10px] font-medium leading-none truncate w-full text-center">
              {tab.title}
            </span>
            {tab.count !== undefined && tab.count > 0 && (
              <Badge
                variant="destructive"
                className="absolute top-1 right-1/4 h-4 min-w-4 px-1 text-[9px] font-medium leading-none pointer-events-none"
              >
                {tab.count > 9 ? "9+" : tab.count}
              </Badge>
            )}
          </button>
        )
      })}

      {/* More — opens a bottom sheet with overflow items (manager/admin only) */}
      {moreItems.length > 0 && (
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 h-full px-1 py-1.5 transition-colors",
              isMoreActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="More"
          >
            <MoreHorizontal className="size-5" />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left">
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="mt-2 space-y-1">
            {moreItems.map((item) => {
              const Icon = item.icon
              const isActive = activeView === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
      )}
    </nav>
  )
}
