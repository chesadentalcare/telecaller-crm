"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Download, FileSpreadsheet, RotateCcw } from "lucide-react"

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRole } from "@/hooks/use-role"
import { useSapSources } from "@/hooks/use-sap-sources"
import { fetchDueExportAgents } from "@/lib/api/due-export"
import { downloadLeadsExport, fetchLeadStates, type LeadsExportSection } from "@/lib/api/leads-export"

const SHEET_OPTIONS: { key: LeadsExportSection; label: string; hint: string }[] = [
  { key: "attempts", label: "Call attempts", hint: "Every call and its outcome" },
  { key: "messages", label: "WhatsApp messages", hint: "Conversation + sent + received" },
  { key: "meetings", label: "Meetings", hint: "Scheduled visits and demos" },
  { key: "quotes", label: "Quotations", hint: "Quotes sent" },
]
const ALL_SHEETS: Record<LeadsExportSection, boolean> = {
  attempts: true, messages: true, meetings: true, quotes: true,
}

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
  const [flagged, setFlagged] = useState("__all__")
  const [sheets, setSheets] = useState<Record<LeadsExportSection, boolean>>({ ...ALL_SHEETS })
  const [busy, setBusy] = useState(false)

  const toggleSheet = (k: LeadsExportSection) => setSheets((s) => ({ ...s, [k]: !s[k] }))

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
    setFlagged("__all__")
    setSheets({ ...ALL_SHEETS })
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
        flagged: flagged === "flagged" ? true : undefined,
        sections: SHEET_OPTIONS.map((o) => o.key).filter((k) => sheets[k]),
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
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" />Export all lead data
          </DialogTitle>
          <DialogDescription>
            One Excel workbook, each data type on its own sheet, joined by Lead ID. Pick which sheets to
            include and leave filters blank to export everything.
          </DialogDescription>
        </DialogHeader>

        <div className="-mr-2 min-h-0 flex-1 space-y-3 overflow-y-auto py-1 pr-2">
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-baseline justify-between">
              <Label className="text-xs font-medium">Include sheets</Label>
              <span className="text-[11px] text-muted-foreground">Lead summary always included</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {SHEET_OPTIONS.map((o) => (
                <label key={o.key} htmlFor={`lx-sheet-${o.key}`} className="flex cursor-pointer items-center gap-2">
                  <Checkbox id={`lx-sheet-${o.key}`} checked={sheets[o.key]} onCheckedChange={() => toggleSheet(o.key)} />
                  <span className="text-sm">{o.label}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">WhatsApp messages = conversation + sent + received sheets.</p>
          </div>

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

          <div className="grid grid-cols-2 gap-3">
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

            <div className={`space-y-1.5${isManagerOrAbove ? "" : " col-span-2"}`}>
              <Label className="text-xs text-muted-foreground">Flagged</Label>
              <Select value={flagged} onValueChange={setFlagged}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All leads</SelectItem>
                  <SelectItem value="flagged">Flagged only</SelectItem>
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
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:justify-between">
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
