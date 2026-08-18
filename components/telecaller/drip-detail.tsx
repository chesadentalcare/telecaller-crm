"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Calendar, Trash2, Phone, MessageSquare } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Countdown } from "./drip-countdown"
import { useExitDrip } from "@/hooks/use-lead-mutations"
import { ApiError } from "@/lib/api/client"
import type { DripProjection } from "@/lib/types/lead"

function ago(date?: Date | null): string {
  if (!date || date.getTime() === 0) return "—"
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime() }
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

function channelWord(c?: "call" | "whatsapp" | null): string {
  return c === "call" ? "Call" : c === "whatsapp" ? "WhatsApp" : "sent"
}

// The drip progress/next/projection block, shown on a queue row when the lead is on an
// active drip. Mirrors the old Nurturing-tab meta so no detail is lost after the merge.
export function DripMeta({
  messagesSent = 0,
  totalMessages = 0,
  nextMessageIn = 0,
  lastEngagement,
  nextChannel,
  lastChannel,
  nextLabel,
  lastLabel,
  projection,
}: {
  messagesSent?: number
  totalMessages?: number
  nextMessageIn?: number
  lastEngagement?: Date | null
  nextChannel?: "call" | "whatsapp" | null
  lastChannel?: "call" | "whatsapp" | null
  nextLabel?: string | null
  lastLabel?: string | null
  projection?: DripProjection
}) {
  const progress = totalMessages > 0 ? (messagesSent / totalMessages) * 100 : 0
  const hasLast = !!lastEngagement && lastEngagement.getTime() !== 0
  return (
    <div className="mt-1 space-y-0.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
        <Progress value={progress} className="h-1.5 w-16" />
        <span className="font-medium text-foreground/80">Stage {messagesSent}/{totalMessages}</span>
        <span>•</span>
        <span title={nextLabel ?? undefined}>
          <Countdown seconds={nextMessageIn} channel={nextChannel} />
        </span>
        {hasLast && (
          <>
            <span>•</span>
            <span className="inline-flex items-center gap-1" title={lastLabel ?? undefined}>
              {lastChannel === "call" ? <Phone className="size-3" /> : <MessageSquare className="size-3" />}
              last drip: {channelWord(lastChannel)} · {ago(lastEngagement)}
            </span>
          </>
        )}
      </div>
      {projection && (
        <div className="inline-flex items-center gap-1 text-[11px] text-foreground/80">
          <Calendar className="size-3 text-primary" />
          Projected completion {new Date(projection.projectedCompletionAt).toLocaleDateString()}
          <span className="text-muted-foreground">· {projection.stageLabel}</span>
        </div>
      )}
    </div>
  )
}

// Self-contained "remove this lead from its drip" icon button + reason dialog. Used in the
// merged Active row's actions (only when the lead is on an active drip).
export function RemoveFromDripButton({
  leadId,
  className,
}: {
  leadId: string | number
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const { mutateAsync: exitDrip, isPending } = useExitDrip(leadId)

  const handleExit = async () => {
    if (!reason) {
      toast.error("Please select a reason")
      return
    }
    try {
      await exitDrip({ reason })
      toast.success("Lead removed from drip")
      setOpen(false)
      setReason("")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove from drip")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={className}
          title="Remove from drip"
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Remove lead from drip</DialogTitle>
          <DialogDescription>
            Select a reason. The lead leaves the sequence and a record is kept for audit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label className="text-xs">Reason</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger>
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replied">Replied — re-enter qualification</SelectItem>
              <SelectItem value="meeting_booked">Meeting booked via CTA</SelectItem>
              <SelectItem value="opted_out">Opted out</SelectItem>
              <SelectItem value="purchased_elsewhere">Purchased elsewhere</SelectItem>
              <SelectItem value="wrong_lead">Wrong lead / spam</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleExit} disabled={isPending}>
            {isPending ? "Removing…" : "Confirm Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
