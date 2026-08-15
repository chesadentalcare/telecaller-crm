"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CalendarClock } from "lucide-react"

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRescheduleMeeting } from "@/hooks/use-lead-mutations"
import type { MeetingsDueLead } from "@/lib/types/lead"

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function RescheduleMeetingDialog({
  meeting, open, onOpenChange,
}: {
  meeting: MeetingsDueLead
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [when, setWhen] = useState(() => toLocalInput(meeting.meetingAt))
  const { mutate, isPending } = useRescheduleMeeting(meeting.meetingId)

  const submit = () => {
    if (!when) { toast.error("Pick a new date & time"); return }
    mutate({ meeting_at: when }, { onSuccess: () => onOpenChange(false) })
  }

  const isZoom = meeting.meetingType === "zoom"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-4" />Reschedule meeting
          </DialogTitle>
          <DialogDescription>
            {meeting.name} · {isZoom ? "Zoom" : "Physical"} meeting.{" "}
            {isZoom
              ? "The customer receives an updated invite (email + WhatsApp) with the same join link."
              : "The customer and the assigned sales employee are re-notified with the new time."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-xs">New date &amp; time</Label>
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={submit} disabled={isPending} className="gap-1.5">
            <CalendarClock className="size-3.5" />{isPending ? "Rescheduling…" : "Reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
