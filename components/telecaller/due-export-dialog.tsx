"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Download, FileSpreadsheet, RotateCcw } from "lucide-react"

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useRole } from "@/hooks/use-role"
import {
  downloadDueExport, fetchDueExportAgents, type DueExportType,
} from "@/lib/api/due-export"

const TYPE_OPTIONS: { key: DueExportType; label: string }[] = [
  { key: "both", label: "Both" },
  { key: "calls", label: "Calls" },
  { key: "meetings", label: "Meetings" },
]

const OUTCOME_OPTIONS: { value: string; label: string }[] = [
  { value: "engaged", label: "Engaged" },
  { value: "call_back_requested", label: "Callback Requested" },
  { value: "no_response", label: "No Response" },
  { value: "not_interested", label: "Not Interested" },
  { value: "wrong_number", label: "Wrong Number" },
  { value: "replied", label: "Replied" },
]

export function DueExportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { isManagerOrAbove } = useRole()

  const [type, setType] = useState<DueExportType>("both")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [agent, setAgent] = useState("__all__")
  const [outcomes, setOutcomes] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const { data: agents = [] } = useQuery({
    queryKey: ["due-export-agents"],
    queryFn: fetchDueExportAgents,
    enabled: open && isManagerOrAbove,
    staleTime: 5 * 60 * 1000,
  })

  const outcomeDisabled = type === "meetings"

  const reset = () => {
    setType("both")
    setFrom("")
    setTo("")
    setAgent("__all__")
    setOutcomes([])
  }

  const toggleOutcome = (value: string) =>
    setOutcomes((cur) => (cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]))

  const submit = async () => {
    if (from && to && from > to) {
      toast.error("“From” date can’t be after “To” date")
      return
    }
    setBusy(true)
    try {
      await downloadDueExport({
        type,
        from: from || undefined,
        to: to || undefined,
        agent: agent !== "__all__" ? agent : undefined,
        outcome: !outcomeDisabled && outcomes.length ? outcomes : undefined,
      })
      toast.success("Export downloaded")
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" />Export to Excel
          </DialogTitle>
          <DialogDescription>
            Pick any filters, or leave them as-is to export everything. Nothing selected = export all.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Include</Label>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border bg-muted/30 p-1">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition",
                    type === t.key
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="due-from" className="text-xs text-muted-foreground">From</Label>
              <Input id="due-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due-to" className="text-xs text-muted-foreground">To</Label>
              <Input id="due-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          {isManagerOrAbove && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Telecaller</Label>
              <Select value={agent} onValueChange={setAgent}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All agents</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.username} value={a.username}>
                      {a.full_name || a.username}{a.role !== "telecaller" ? ` (${a.role})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className={cn("text-xs text-muted-foreground", outcomeDisabled && "opacity-50")}>
              Last call outcome {outcomeDisabled ? "(calls only)" : "· leave blank for all"}
            </Label>
            <div className={cn("grid grid-cols-2 gap-x-4 gap-y-2", outcomeDisabled && "pointer-events-none opacity-40")}>
              {OUTCOME_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={outcomes.includes(o.value)}
                    onCheckedChange={() => toggleOutcome(o.value)}
                    disabled={outcomeDisabled}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={reset} className="gap-1.5">
            <RotateCcw className="size-3.5" />Reset
          </Button>
          <Button type="button" onClick={submit} disabled={busy} className="gap-1.5">
            <Download className="size-4" />{busy ? "Exporting…" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
