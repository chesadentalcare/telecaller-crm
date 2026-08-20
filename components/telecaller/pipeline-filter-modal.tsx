"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Filter, MapPin } from "lucide-react"

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchLeadStates } from "@/lib/api/leads-export"
import { usePipelineDateFilter } from "@/lib/pipeline-date-filter"

interface Props {
  repliedOnly: boolean
  setRepliedOnly: (v: boolean) => void
  meetingPendingOnly: boolean
  setMeetingPendingOnly: (v: boolean) => void
  unverifiedOnly: boolean
  setUnverifiedOnly: (v: boolean) => void
}

export function PipelineFilterModal({
  repliedOnly, setRepliedOnly,
  meetingPendingOnly, setMeetingPendingOnly,
  unverifiedOnly, setUnverifiedOnly,
}: Props) {
  const { state, setState } = usePipelineDateFilter()
  const [open, setOpen] = useState(false)

  const { data: states = [] } = useQuery({
    queryKey: ["lead-states"],
    queryFn: fetchLeadStates,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const stateActive = !!state && state !== "__all__"
  const activeCount = (stateActive ? 1 : 0) + (repliedOnly ? 1 : 0) + (meetingPendingOnly ? 1 : 0) + (unverifiedOnly ? 1 : 0)

  const clearAll = () => {
    setState("")
    setRepliedOnly(false)
    setMeetingPendingOnly(false)
    setUnverifiedOnly(false)
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
          <DialogDescription>State applies to every pipeline tab. The others filter the Active list.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <MapPin className="size-3.5 text-muted-foreground" />State
            </Label>
            <Select value={state || "__all__"} onValueChange={(v) => setState(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All states</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s.name} value={s.name}>{s.name} ({s.count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={clearAll} disabled={activeCount === 0}>Clear all</Button>
          <Button type="button" onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
