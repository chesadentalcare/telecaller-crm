"use client"

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  PhoneCall,
  RotateCcw,
  Timer,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { useFlowOversight, useReconciliation } from "@/hooks/use-leads"
import { cn } from "@/lib/utils"

// P7.3 — manager flow-oversight. Team-wide health across every branch and end-state of
// the lead journey, backed by GET /analytics/flow-oversight (+ /reports/reconciliation).

const DISPOSITION_LABEL: Record<string, string> = {
  no_response: "No response",
  wrong_number: "Wrong number",
  not_interested: "Not interested",
  call_back_requested: "Callback",
  engaged: "Engaged",
  replied: "Replied",
}

const INTENT_LABEL: Record<string, string> = {
  meeting: "Meeting", zoom: "Changed / Zoom", vague: "Unclear", stop: "Opt-out",
}

function Stat({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "warn" | "danger" | "good" }) {
  const toneCls = {
    default: "text-foreground",
    warn: "text-warning",
    danger: "text-destructive",
    good: "text-success",
  }[tone]
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
      <p className={cn("text-xl font-semibold tabular-nums", toneCls)}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

// Horizontal distribution bar (count relative to the row max).
function DistRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums">{count}</span>
    </div>
  )
}

export function FlowOversightView() {
  const { data, isLoading, error } = useFlowOversight()
  const { data: recon } = useReconciliation()

  if (isLoading) return <ViewSkeleton />
  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Could not load flow oversight. Manager/admin access is required.
        </CardContent>
      </Card>
    )
  }

  const dispMax = Math.max(1, ...data.dispositions.map((d) => d.count))
  const intentEntries = Object.entries(data.inbound.byIntent)
  const intentMax = Math.max(1, ...intentEntries.map(([, n]) => n))
  const optOutRate = data.endStates.totalLeads > 0
    ? Math.round((data.endStates.optedOut / data.endStates.totalLeads) * 100)
    : 0
  const dripStale = data.engine.drip?.staleMinutes != null && data.engine.drip.staleMinutes > 15

  return (
    <div className="space-y-4">
      {/* Engine health — the observability headline */}
      <Card className={cn(dripStale && "border-destructive/40")}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-4 text-primary" /> Engine Health
          </CardTitle>
          <CardDescription>Background scheduler — drip ticks every 5m, reconciliation daily</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className={cn("rounded-lg border px-3 py-2.5", dripStale ? "border-destructive/40 bg-destructive/5" : "bg-muted/30")}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium flex items-center gap-1.5"><Timer className="size-3.5" /> Drip engine</span>
              {dripStale
                ? <Badge variant="outline" className="text-[10px] gap-1 border-destructive/40 text-destructive"><AlertTriangle className="size-3" />Stale</Badge>
                : <Badge variant="outline" className="text-[10px] gap-1 border-success/40 text-success"><CheckCircle2 className="size-3" />Live</Badge>}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {data.engine.drip
                ? `Last tick ${data.engine.drip.staleMinutes ?? "?"} min ago · ${data.engine.drip.sent} sent, ${data.engine.drip.parked} parked`
                : "No ticks recorded yet (Redis down or never run)"}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium flex items-center gap-1.5"><RotateCcw className="size-3.5" /> Reconciliation</span>
              <Badge variant="outline" className={cn("text-[10px]", (recon?.count ?? 0) > 0 ? "border-warning/40 text-warning" : "border-success/40 text-success")}>
                {recon?.count ?? data.engine.reconciliation?.orphans ?? 0} orphans
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {data.engine.reconciliation
                ? `Last scan ${data.engine.reconciliation.staleMinutes ?? "?"} min ago`
                : "No scan recorded yet"}
              {(recon?.count ?? 0) > 0 ? " — non-terminal leads with nothing scheduled" : " — every lead is tracked or terminal"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Disposition distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><PhoneCall className="size-4 text-primary" /> Disposition Distribution</CardTitle>
          <CardDescription>Call outcomes logged across the team, last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.dispositions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No attempts logged in the last 30 days</p>
          ) : (
            data.dispositions
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((d) => (
                <DistRow key={d.outcome} label={DISPOSITION_LABEL[d.outcome] ?? d.outcome} count={d.count} max={dispMax} color="bg-primary" />
              ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* First-contact health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><PhoneCall className="size-4 text-primary" /> First-Contact Health</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Stat label="Active" value={data.firstContact.active} />
            <Stat label="Reached" value={data.firstContact.reached} tone="good" />
            <Stat label="Exhausted → archived" value={data.firstContact.exhausted} tone="warn" />
            <Stat label="Cancelled" value={data.firstContact.cancelled} />
          </CardContent>
        </Card>

        {/* Callback + nudge health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Timer className="size-4 text-primary" /> Callbacks &amp; Nudges</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Stat label="Callbacks pending" value={data.callbacks.pending} />
            <Stat label="Callback exhausted" value={data.callbacks.exhausted} tone="warn" />
            <Stat label="Nudges pending" value={data.nudges.pending} />
            <Stat label="Nudges overdue" value={data.nudges.overdue} tone={data.nudges.overdue > 0 ? "danger" : "default"} />
          </CardContent>
        </Card>

        {/* Inbound by intent */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Inbox className="size-4 text-primary" /> Inbound by Intent</CardTitle>
            <CardDescription>WhatsApp replies, last 30 days · opt-out rate {optOutRate}%</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {intentEntries.map(([intent, count]) => (
              <DistRow key={intent} label={INTENT_LABEL[intent] ?? intent} count={count} max={intentMax} color="bg-sky-500" />
            ))}
            <div className="flex gap-2 pt-1">
              <Badge variant="outline" className="text-[10px]">{data.inbound.matched} matched</Badge>
              <Badge variant="outline" className={cn("text-[10px]", data.inbound.unmatched > 0 && "border-warning/40 text-warning")}>
                {data.inbound.unmatched} unmatched
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* End states + drip */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="size-4 text-primary" /> End-States &amp; Drip</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Stat label="Archived" value={data.endStates.archived} />
            <Stat label="Re-qual pending" value={data.endStates.requalPending} />
            <Stat label="Opted out" value={data.endStates.optedOut} tone={data.endStates.optedOut > 0 ? "warn" : "default"} />
            <Stat label="Drip active" value={data.drip.active} tone="good" />
            <Stat label="Drip parked" value={data.drip.parked} tone="warn" />
            <Stat label="Total leads" value={data.endStates.totalLeads} />
          </CardContent>
        </Card>
      </div>

      {/* Orphan list (live) */}
      {recon && recon.count > 0 && (
        <Card className="border-warning/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="size-4 text-warning" /> Orphaned Leads</CardTitle>
            <CardDescription>Non-terminal leads with no active drip, callback, nudge, follow-up or re-qual — re-engage or close</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-80 overflow-y-auto">
              {recon.orphans.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{o.name}</p>
                    <p className="text-[11px] text-muted-foreground">#{o.id} · stage {o.stage} · {o.assignedTo ?? "unassigned"}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{new Date(o.updatedAt).toLocaleDateString()}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unmatched inbound list */}
      {data.unmatchedInbound.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Inbox className="size-4 text-muted-foreground" /> Unmatched Inbound</CardTitle>
            <CardDescription>Replies that couldn&apos;t be tied to a lead — manual reconciliation</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-72 overflow-y-auto">
              {data.unmatchedInbound.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{m.body || <span className="italic text-muted-foreground">(no text)</span>}</p>
                    <p className="text-[11px] text-muted-foreground">{m.fromPhone} · {new Date(m.receivedAt).toLocaleString()}</p>
                  </div>
                  {m.intent && <Badge variant="outline" className="text-[10px] shrink-0">{INTENT_LABEL[m.intent] ?? m.intent}</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
