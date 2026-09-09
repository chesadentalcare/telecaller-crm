"use client"

import { UserCog, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSalesUsers } from "@/hooks/use-leads"
import { usePipelineDateFilter } from "@/lib/pipeline-date-filter"

export function PipelineSalesBar() {
  const { salesPerson, setSalesPerson } = usePipelineDateFilter()
  const { data: salesUsers = [] } = useSalesUsers(true)
  const active = !!salesPerson && salesPerson !== "__all__"

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <UserCog className="size-4" />
        <span className="hidden sm:inline">Sales rep:</span>
      </div>
      <Select value={salesPerson || "__all__"} onValueChange={(v) => setSalesPerson(v === "__all__" ? "" : v)}>
        <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All sales reps</SelectItem>
          {salesUsers.map((u) => (
            <SelectItem key={u.username} value={u.username}>{u.full_name || u.username}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {active && (
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setSalesPerson("")}>
          <X className="size-3" />Clear
        </Button>
      )}
    </div>
  )
}
