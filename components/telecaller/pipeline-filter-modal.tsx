"use client"

import { useState } from "react"
import { Filter } from "lucide-react"

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

interface Props {
  repliedOnly: boolean
  setRepliedOnly: (v: boolean) => void
  meetingPendingOnly: boolean
  setMeetingPendingOnly: (v: boolean) => void
  unverifiedOnly: boolean
  setUnverifiedOnly: (v: boolean) => void
  closingCadenceOnly: boolean
  setClosingCadenceOnly: (v: boolean) => void
  closeFrom: string
  setCloseFrom: (v: string) => void
  closeTo: string
  setCloseTo: (v: string) => void
}

export function PipelineFilterModal({
  repliedOnly, setRepliedOnly,
  meetingPendingOnly, setMeetingPendingOnly,
  unverifiedOnly, setUnverifiedOnly,
  closingCadenceOnly, setClosingCadenceOnly,
  closeFrom, setCloseFrom,
  closeTo, setCloseTo,
}: Props) {
  const [open, setOpen] = useState(false)

  const activeCount =
    (repliedOnly ? 1 : 0) + (meetingPendingOnly ? 1 : 0) + (unverifiedOnly ? 1 : 0)
    + (closingCadenceOnly ? 1 : 0) + (closeFrom || closeTo ? 1 : 0)

  const clearAll = () => {
    setRepliedOnly(false)
    setMeetingPendingOnly(false)
    setUnverifiedOnly(false)
    setClosingCadenceOnly(false)
    setCloseFrom("")
    setCloseTo("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Filter className="size-3.5" />Filter
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">{activeCount}</Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filter leads</DialogTitle>
          <DialogDescription>These filter the Active list. State (in the bar above) applies to every pipeline tab.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={repliedOnly} onCheckedChange={(v) => setRepliedOnly(!!v)} />
              Replied on WhatsApp
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={meetingPendingOnly} onCheckedChange={(v) => setMeetingPendingOnly(!!v)} />
              Meeting pending
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={unverifiedOnly} onCheckedChange={(v) => setUnverifiedOnly(!!v)} />
              Unverified number
            </label>
          </div>

          <div className="space-y-1.5 border-t pt-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={closingCadenceOnly} onCheckedChange={(v) => setClosingCadenceOnly(!!v)} />
              In 1-month closing cadence
            </label>
            <p className="text-[11px] text-muted-foreground">
              Leads now in the fast 1-month calling rhythm — every 1-Month lead, plus 3-Month and 6-Month leads that have reached their closing sprint.
            </p>
          </div>

          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-medium">Projected closing date</p>
            <p className="text-[11px] text-muted-foreground">
              Show only Active leads projected to close within this range.
            </p>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={closeFrom}
                  max={closeTo || undefined}
                  onChange={(e) => setCloseFrom(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[11px] text-muted-foreground">To</label>
                <Input
                  type="date"
                  value={closeTo}
                  min={closeFrom || undefined}
                  onChange={(e) => setCloseTo(e.target.value)}
                  className="h-8"
                />
              </div>
            </div>
            {(closeFrom || closeTo) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => { setCloseFrom(""); setCloseTo("") }}
              >
                Clear dates
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={clearAll} disabled={activeCount === 0}>Clear all</Button>
          <Button type="button" onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
