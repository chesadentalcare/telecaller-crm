"use client"

// Issue 1 — one consolidated row/card per lead, shared by every queue view so a
// lead is never split across a 4+ column table. Layout:
//   line 1: avatar · name · #id · (Replied badge)
//   line 2: phone · equipment
//   line 3: `meta` — the queue-specific status line (track / attempts / idle days…)
//   reply snippet (Issue 3) when the lead has an inbound reply
//   right:  `badge` (status) + `actions` (call / WhatsApp / row menu)
//
// The queue view owns the per-queue bits (`meta`, `badge`, `actions`); this
// component owns identity + the cross-cutting reply indicator.

import type { ReactNode } from "react"
import { MessageSquare, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ReplyIndicator } from "@/lib/types/lead"

const INTENT_LABEL: Record<string, string> = {
  meeting: "wants a meeting",
  zoom: "wants Zoom / changed details",
  stop: "asked to stop",
  vague: "needs a reply",
}

export interface LeadQueueRowProps {
  id: string
  name: string
  phone?: string
  equipment?: string
  /** Queue-specific status line (track, attempts, idle days, …). */
  meta?: ReactNode
  /** Right-aligned status badge shown before the actions. */
  badge?: ReactNode
  /** Inbound-reply indicator (Issue 3). */
  replied?: ReplyIndicator
  /** Urgent flag shown as a red badge next to the name (e.g. a wrong-number lead whose
      calling is locked and needs recovery). Undefined = not urgent. */
  urgent?: { label: string }
  /** Row actions (call, WhatsApp, menu). */
  actions?: ReactNode
  onOpen?: (id: string) => void
  /** Extra classes for the row wrapper (e.g. pastel-red overdue highlight). */
  className?: string
}

export function LeadQueueRow({
  id, name, phone, equipment, meta, badge, replied, urgent, actions, onOpen, className,
}: LeadQueueRowProps) {
  const initials =
    name.split(" ").filter(Boolean).slice(-2).map((n) => n[0]).join("").toUpperCase() || "#"

  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 p-4 hover:bg-muted/50 transition-colors", className)}>
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-xs shrink-0">
          {initials}
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onOpen?.(id)}
              className="text-sm font-medium text-foreground hover:underline text-left truncate"
            >
              {name}
            </button>
            <span className="font-mono text-xs text-primary">#{id}</span>
            {/* URGENT flag (e.g. wrong number — calling is locked, needs recovery). Shown
                first so it's the thing the eye lands on when scanning the pipeline. */}
            {urgent && (
              <Badge className="gap-1 bg-destructive/15 text-destructive border-destructive/40 text-[10px] font-semibold">
                <AlertTriangle className="size-3" />URGENT · {urgent.label}
              </Badge>
            )}
            {/* Awaiting reply (customer messaged, rep hasn't replied back) takes
                priority — amber "Needs reply" matches the nav awaiting-reply count.
                Otherwise an already-answered inbound still shows a muted "Replied". */}
            {replied?.awaitingReply ? (
              <Badge className="gap-1 bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                <MessageSquare className="size-3" />Needs reply
              </Badge>
            ) : replied?.hasUnread ? (
              <Badge className="gap-1 bg-success/15 text-success border-success/30 text-[10px]">
                <MessageSquare className="size-3" />Replied
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            {phone && phone !== "—" && (
              <>
                <span>{phone}</span>
                <span>•</span>
              </>
            )}
            <span className="truncate">{equipment || "—"}</span>
          </div>
          {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
          {replied?.body && (
            <p className="text-xs italic text-foreground/80 bg-muted/60 rounded px-2 py-1 mt-1 max-w-md line-clamp-2">
              “{replied.body}”
              {replied.intent && (
                <span className="not-italic text-muted-foreground"> · {INTENT_LABEL[replied.intent] ?? replied.intent}</span>
              )}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badge}
        {actions}
      </div>
    </div>
  )
}
