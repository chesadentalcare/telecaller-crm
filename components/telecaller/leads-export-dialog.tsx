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
import { downloadLeadsExport, fetchLeadStates, fetchLeadSalesAssignees, LEAD_EXPORT_COLUMNS, LEAD_EXPORT_HIDDEN_GROUPS, type LeadsExportHiddenGroup, type LeadsExportNotInterested, type LeadsExportOutcome, type LeadsExportSection } from "@/lib/api/leads-export"

const SHEET_OPTIONS: { key: LeadsExportSection; label: string; hint: string }[] = [
  { key: "attempts", label: "Call attempts", hint: "Every call and its outcome" },
  { key: "messages", label: "WhatsApp messages", hint: "Conversation + sent + received" },
  { key: "meetings", label: "Meetings", hint: "Scheduled visits and demos" },
  { key: "quotes", label: "Quotations", hint: "Quotes sent" },
]
const NO_SHEETS: Record<LeadsExportSection, boolean> = {
  attempts: false, messages: false, meetings: false, quotes: false,
}
const ALL_COLUMNS = LEAD_EXPORT_COLUMNS.reduce<Record<string, boolean>>((acc, c) => {
  acc[c.key] = true
  return acc
}, {})
const DEFAULT_COLUMN_KEYS = [
  "id", "customer_name", "phone", "city", "state", "flagged",
  "sales_assignee", "equipment", "interest_level", "budget", "predicted_closing_date",
]
const DEFAULT_COLUMNS = LEAD_EXPORT_COLUMNS.reduce<Record<string, boolean>>((acc, c) => {
  acc[c.key] = DEFAULT_COLUMN_KEYS.includes(c.key)
  return acc
}, {})

export function LeadsExportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { isFullAccess } = useRole()

  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [source, setSource] = useState("__all__")
  const [state, setState] = useState("__all__")
  const [agent, setAgent] = useState("__all__")
  const [salesAssignee, setSalesAssignee] = useState("__all__")
  const [flagged, setFlagged] = useState("__all__")
  const [outcome, setOutcome] = useState<LeadsExportOutcome>("exclude")
  const [notInterested, setNotInterested] = useState<LeadsExportNotInterested>("exclude")
  const [includeHidden, setIncludeHidden] = useState<Record<LeadsExportHiddenGroup, boolean>>({
    no_response: false, new: false, opted_out: false, wrong_number: false,
  })
  const [sheets, setSheets] = useState<Record<LeadsExportSection, boolean>>({ ...NO_SHEETS })
  const [customizeColumns, setCustomizeColumns] = useState(false)
  const [columns, setColumns] = useState<Record<string, boolean>>({ ...DEFAULT_COLUMNS })
  const [busy, setBusy] = useState(false)

  const toggleSheet = (k: LeadsExportSection) => setSheets((s) => ({ ...s, [k]: !s[k] }))
  const toggleHidden = (k: LeadsExportHiddenGroup) => setIncludeHidden((s) => ({ ...s, [k]: !s[k] }))
  const toggleColumn = (k: string) => {
    if (k === "id") return
    setColumns((c) => ({ ...c, [k]: !c[k] }))
  }
  const selectAllColumns = () => setColumns({ ...ALL_COLUMNS })
  const clearColumns = () =>
    setColumns(LEAD_EXPORT_COLUMNS.reduce<Record<string, boolean>>((acc, c) => {
      acc[c.key] = c.key === "id"
      return acc
    }, {}))

  const { data: agents = [] } = useQuery({
    queryKey: ["due-export-agents"],
    queryFn: fetchDueExportAgents,
    enabled: open && isFullAccess,
    staleTime: 5 * 60 * 1000,
  })
  const { data: sources = [] } = useSapSources()
  const { data: states = [] } = useQuery({
    queryKey: ["lead-states"],
    queryFn: fetchLeadStates,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })
  const { data: salesAssignees = [] } = useQuery({
    queryKey: ["lead-sales-assignees"],
    queryFn: fetchLeadSalesAssignees,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const reset = () => {
    setFrom("")
    setTo("")
    setSource("__all__")
    setState("__all__")
    setAgent("__all__")
    setSalesAssignee("__all__")
    setFlagged("__all__")
    setOutcome("exclude")
    setNotInterested("exclude")
    setIncludeHidden({ no_response: false, new: false, opted_out: false, wrong_number: false })
    setSheets({ ...NO_SHEETS })
    setCustomizeColumns(false)
    setColumns({ ...DEFAULT_COLUMNS })
  }

  const submit = async () => {
    if (from && to && from > to) {
      toast.error("“From” date can’t be after “To” date")
      return
    }
    setBusy(true)
    try {
      const selectedColumns = LEAD_EXPORT_COLUMNS.map((c) => c.key).filter((k) => columns[k])
      if (selectedColumns.filter((k) => k !== "id").length === 0) {
        toast.error("Pick at least one column for the Leads sheet")
        return
      }
      const columnsArg =
        selectedColumns.length === LEAD_EXPORT_COLUMNS.length
          ? undefined
          : Array.from(new Set(["id", ...selectedColumns]))
      await downloadLeadsExport({
        from: from || undefined,
        to: to || undefined,
        source: source !== "__all__" ? source : undefined,
        state: state !== "__all__" ? state : undefined,
        agent: agent !== "__all__" ? agent : undefined,
        salesAssignee: salesAssignee !== "__all__" ? salesAssignee : undefined,
        flagged: flagged === "flagged" ? true : undefined,
        outcome,
        notInterested,
        includeHidden: LEAD_EXPORT_HIDDEN_GROUPS.map((g) => g.key).filter((k) => includeHidden[k]),
        sections: SHEET_OPTIONS.map((o) => o.key).filter((k) => sheets[k]),
        columns: columnsArg,
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
            One Excel workbook, each data type on its own sheet, joined by Lead ID. Pick which sheets and
            columns to include, and leave filters blank to export everything.
          </DialogDescription>
        </DialogHeader>

        <div className="-mr-2 min-h-0 flex-1 space-y-3 overflow-y-auto py-1 pr-2">
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-baseline justify-between">
              <Label className="text-xs font-medium">Columns (Leads sheet)</Label>
              {customizeColumns ? (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={selectAllColumns} className="text-[11px] font-medium text-primary hover:underline">Select all</button>
                  <button type="button" onClick={clearColumns} className="text-[11px] font-medium text-primary hover:underline">Clear</button>
                  <button type="button" onClick={() => setCustomizeColumns(false)} className="text-[11px] font-medium text-muted-foreground hover:underline">Done</button>
                </div>
              ) : (
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setCustomizeColumns(true)}>Customize</Button>
              )}
            </div>
            {customizeColumns ? (
              <>
                <div className="grid max-h-48 grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto pr-1">
                  {LEAD_EXPORT_COLUMNS.map((c) => (
                    <label key={c.key} htmlFor={`lx-col-${c.key}`} className="flex cursor-pointer items-center gap-2">
                      <Checkbox id={`lx-col-${c.key}`} checked={columns[c.key]} disabled={c.key === "id"} onCheckedChange={() => toggleColumn(c.key)} />
                      <span className="text-sm">{c.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">Lead ID is always included — it joins the Leads sheet to the others.</p>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">{LEAD_EXPORT_COLUMNS.filter((c) => columns[c.key]).length} of {LEAD_EXPORT_COLUMNS.length} columns selected. Customize to change; Lead ID always included.</p>
            )}
          </div>

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
              <Label className="text-xs text-muted-foreground">Won / Lost</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as LeadsExportOutcome)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclude">Exclude won &amp; lost</SelectItem>
                  <SelectItem value="all">Include won &amp; lost</SelectItem>
                  <SelectItem value="won">Won only</SelectItem>
                  <SelectItem value="lost">Lost only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Not interested</Label>
              <Select value={notInterested} onValueChange={(v) => setNotInterested(v as LeadsExportNotInterested)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclude">Exclude not interested</SelectItem>
                  <SelectItem value="include">Include not interested</SelectItem>
                  <SelectItem value="only">Not interested only</SelectItem>
                </SelectContent>
              </Select>
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

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Flagged</Label>
              <Select value={flagged} onValueChange={setFlagged}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All leads</SelectItem>
                  <SelectItem value="flagged">Flagged only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sales Assignee</Label>
              <Select value={salesAssignee} onValueChange={setSalesAssignee}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All sales assignees</SelectItem>
                  {salesAssignees.map((s) => (
                    <SelectItem key={s.name} value={s.name}>{s.name} ({s.count})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isFullAccess && (
              <div className="col-span-2 space-y-1.5">
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

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-baseline justify-between">
              <Label className="text-xs font-medium">Include hidden leads</Label>
              <span className="text-[11px] text-muted-foreground">Excluded by default</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {LEAD_EXPORT_HIDDEN_GROUPS.map((g) => (
                <label key={g.key} htmlFor={`lx-hidden-${g.key}`} className="flex cursor-pointer items-start gap-2">
                  <Checkbox id={`lx-hidden-${g.key}`} checked={includeHidden[g.key]} onCheckedChange={() => toggleHidden(g.key)} className="mt-0.5" />
                  <span className="text-sm leading-tight">{g.label}<span className="block text-[11px] text-muted-foreground">{g.hint}</span></span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">By default the export hides no-response, new/uncalled, opted-out (STOP) and wrong-number leads. Tick any to add them back.</p>
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
