"use client"

import { useState } from "react"
import { Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SalesUserOptions } from "./sales-user-options"
import { useSalesUsers } from "@/hooks/use-leads"
import { useAllocateSales } from "@/hooks/use-lead-mutations"

/** Row-action button: shows the allocated sales rep (if any) and opens the
 *  reused sales-user picker to (re)allocate the lead to a territory rep. */
export function AllocateSalesButton({
  leadId,
  assignedName,
  className,
}: {
  leadId: string
  assignedName?: string | null
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState("")
  const { data: salesUsers = [], isLoading } = useSalesUsers(open, leadId)
  const { mutateAsync, isPending } = useAllocateSales(leadId)

  const submit = async () => {
    if (!target) return
    try {
      await mutateAsync({ salesUsername: target })
      setOpen(false)
      setTarget("")
    } catch {
      /* the hook toasts the error */
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={className ? `gap-1.5 ${className}` : "gap-1.5"}
        title={assignedName ? `Sales: ${assignedName} — click to re-allocate` : "Allocate to a sales rep"}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      >
        <Briefcase className="size-3.5" />
        {assignedName ? `Sales: ${assignedName}` : "Allocate"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{assignedName ? "Re-allocate to sales" : "Allocate to sales"}</DialogTitle>
          </DialogHeader>
          {assignedName && (
            <p className="-mt-1 text-xs text-muted-foreground">
              Currently: <span className="font-medium text-foreground">{assignedName}</span>
            </p>
          )}
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="h-9" disabled={isLoading}>
              <SelectValue placeholder={isLoading ? "Loading salespeople…" : "Select a salesperson"} />
            </SelectTrigger>
            <SelectContent>
              <SalesUserOptions salesUsers={salesUsers} loading={isLoading} />
            </SelectContent>
          </Select>
          <Button className="w-full gap-1.5" disabled={isPending || !target} onClick={submit}>
            <Briefcase className="size-4" />
            {isPending ? "Allocating…" : assignedName ? "Re-allocate" : "Allocate"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
