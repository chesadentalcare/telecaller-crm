"use client"

import { useState } from "react"
import {
  Bell, CheckCheck, Clock, AlertTriangle, FileText, MessageSquare, Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { useUnreadNotificationCount, useNotifications } from "@/hooks/use-leads"
import { useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/use-lead-mutations"
import type { NotificationRow } from "@/lib/api/leads"

const TYPE_ICONS: Record<string, typeof Bell> = {
  sla_breach: AlertTriangle,
  discount_request: Shield,
  discount_approved: Shield,
  discount_rejected: Shield,
  follow_up_due: Clock,
  follow_up_overdue: AlertTriangle,
  lead_closed: CheckCheck,
  quote_delivered: FileText,
  quote_read: MessageSquare,
  system: Bell,
}

const TYPE_COLORS: Record<string, string> = {
  sla_breach: "text-red-600",
  discount_request: "text-amber-600",
  discount_approved: "text-green-600",
  discount_rejected: "text-red-600",
  follow_up_due: "text-blue-600",
  follow_up_overdue: "text-red-600",
  lead_closed: "text-green-600",
  quote_delivered: "text-blue-600",
  quote_read: "text-amber-600",
  system: "text-muted-foreground",
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data: countData } = useUnreadNotificationCount()
  const { data: notifications } = useNotifications(15)
  const { mutate: markRead } = useMarkNotificationRead()
  const { mutate: markAllRead } = useMarkAllNotificationsRead()

  const unread = countData?.count ?? 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <Button
              variant="ghost" size="sm" className="text-xs h-6 gap-1"
              onClick={() => markAllRead()}
            >
              <CheckCheck className="size-3" /> Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <div className="max-h-80 overflow-y-auto">
          {!notifications?.length ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={() => { if (!n.is_read) markRead(n.id) }}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotificationItem({
  notification: n,
  onRead,
}: {
  notification: NotificationRow
  onRead: () => void
}) {
  const Icon = TYPE_ICONS[n.type] || Bell
  const color = TYPE_COLORS[n.type] || "text-muted-foreground"

  return (
    <div
      className={`flex gap-2.5 px-3 py-2.5 hover:bg-muted/50 cursor-pointer border-b last:border-0 ${!n.is_read ? "bg-primary/5" : ""}`}
      onClick={onRead}
    >
      <Icon className={`size-4 mt-0.5 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-xs leading-snug ${!n.is_read ? "font-medium" : "text-muted-foreground"}`}>
          {n.title}
        </p>
        {n.body && (
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
      </div>
      {!n.is_read && <div className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />}
    </div>
  )
}
