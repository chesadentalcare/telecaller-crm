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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRole } from "@/hooks/use-role"
import { useSapSources } from "@/hooks/use-sap-sources"
import { fetchDueExportAgents } from "@/lib/api/due-export"
import { downloadLeadsExport, fetchLeadStates } from "@/lib/api/leads-export"

export function LeadsExportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { isManagerOrAbove } = useRole()

  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [source, setSource] = useState("__all__")
  const [state, setState] = useState("__all__")
  const [agent, setAgent] = useState("__all__")
  const [busy, setBusy] = useState(false)

  const { data: agents = [] } = useQuery({
    queryKey: ["due-export-agents"],
    queryFn: fetchDueExportAgents,
    enabled: open && isManagerOrAbove,
    staleTime: 5 * 60 * 1000,
  })
  const { data: sources = [] } = useSapSources()
  const { data: states = [] } = useQuery({
    queryKey: ["lead-states"],
    queryFn: fetchLeadStates,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const reset = () => {
    setFrom("")
    setTo("")
    setSource("__all__")
    setState("__all__")
    setAgent("__all__")
  }

  const submit = async () => {
    if (from && to && from > to) {
      toast.error("“From” date can’t be after “To” date")
      return
    }
    setBusy(true)
    try {
      await downloadLeadsExport({
        from: from || undefined,
        to: to || undefined,
        source: source !== "__all__" ? source : undefined,
        state: state !== "__all__" ? state : undefined,
        agent: agent !== "__all__" ? agent : undefined,
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
            <FileSpreadsheet className="size-5 text-primary" />Export all lead data
          </DialogTitle>
          <DialogDescription>
            One Excel workbook with every lead plus its calls, messages sent/received, meetings and
            quotations — each on its own sheet, joined by Lead ID. Leave filters blank to export everything.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lx-from" className="text-xs text-muted-foreground">Created from</Label>
              <Input id="lx-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lx-to" className="text-xs text-muted-foreground">Created to</Label>
              <Input id="lx-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All sources</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s.sequenceNo} value={s.description}>{s.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">State</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All states</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s.name} value={s.name}>{s.name} ({s.count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
