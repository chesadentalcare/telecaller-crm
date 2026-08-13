"use client"

import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReplyIndicator } from "@/lib/types/lead"

export function isAwaitingReply(lead: { replied?: ReplyIndicator }): boolean {
  return !!(lead.replied?.hasUnread || lead.replied?.awaitingReply)
}

export function RepliesFilterToggle({
  count,
  active,
  onToggle,
  className,
}: {
  count: number
  active: boolean
  onToggle: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      title="Show only leads whose customer replied and is awaiting a reply back"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-chart-1 bg-chart-1/10 text-chart-1"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      <MessageSquare className="size-3.5" />
      Replies
      {count > 0 && (
        <span className="ml-0.5 rounded-full bg-chart-1/20 px-1.5 text-[10px] font-semibold leading-none">{count}</span>
      )}
    </button>
  )
}
