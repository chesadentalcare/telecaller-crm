"use client"

import { useState } from "react"
import {
  LayoutDashboard,
  Inbox,
  Timer,
  MoreHorizontal,
  UserPlus,
  PhoneCall,
  PhoneOff,
  Moon,
  Archive,
  RotateCcw,
  CalendarClock,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface BottomTabNavProps {
  activeView: string
  onViewChange: (view: string) => void
  queueCounts: {
    pipeline: number
    noResponse: number
    drip: number
    idle: number
    dormant: number
    reactivation: number
    sixMonth: number
  }
}

export function BottomTabNav({
  activeView,
  onViewChange,
  queueCounts,
}: BottomTabNavProps) {
  const [moreOpen, setMoreOpen] = useState(false)

  // 4 primary tabs always visible. Pick the most-used flows.
  const primaryTabs = [
    { id: "home", title: "Home", icon: LayoutDashboard },
    { id: "pipeline", title: "Pipeline", icon: Inbox, count: queueCounts.pipeline },
    { id: "new-lead", title: "Add Lead", icon: UserPlus },
    { id: "drip", title: "Drip", icon: Timer, count: queueCounts.drip },
  ]

  // Overflow — shown in the "More" sheet
  const moreItems = [
    {
      id: "qualification",
      title: "Rapid Qualification",
      icon: PhoneCall,
      subtitle: "Qualify a lead",
    },
    {
      id: "no-response",
      title: "No Response",
      icon: PhoneOff,
      subtitle: "4+ failed calls",
      count: queueCounts.noResponse,
    },
    {
      id: "idle",
      title: "Idle Queue",
      icon: Moon,
      subtitle: "No activity 7d",
      count: queueCounts.idle,
    },
    {
      id: "dormant",
      title: "Dormant",
      icon: Archive,
      subtitle: "No activity 30d+",
      count: queueCounts.dormant,
    },
    {
      id: "reactivation",
      title: "Reactivation Inbox",
      icon: RotateCcw,
      subtitle: "Returned from sales",
      count: queueCounts.reactivation,
    },
    {
      id: "six-month",
      title: "6+ Month Funnel",
      icon: CalendarClock,
      subtitle: "Long-cycle nurture",
      count: queueCounts.sixMonth,
    },
  ]

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

      {/* More — opens a bottom sheet with overflow items */}
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
                  {item.count !== undefined && item.count > 0 && (
                    <Badge variant="outline" className="ml-auto shrink-0">
                      {item.count}
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
