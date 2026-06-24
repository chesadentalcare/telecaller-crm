"use client"

// Dependency-free flowchart renderer for the "Learn about this outcome" explainer.
// No diagram library is installed (and one isn't warranted for static per-outcome flows),
// so this hand-rolls a two-lane (Frontend | Backend) vertical flow from the registry's
// typed nodes + edges. Nodes are colored by kind; backend nodes gated behind a server
// flag (ROUTE_OUTCOMES) are dimmed with a "go-live" badge so the explainer stays honest
// about what fires today vs at go-live.

import { Lock, ArrowRight, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FlowNode, FlowEdge, FlowNodeKind, OutcomeContext } from "@/lib/outcome-flows"
import { fillTokens } from "@/lib/outcome-flows"

const KIND_STYLE: Record<FlowNodeKind, string> = {
  start: "border-slate-400/40 bg-slate-500/10 text-slate-700 dark:text-slate-200",
  "fe-action": "border-primary/40 bg-primary/10 text-primary",
  api: "border-dashed border-violet-500/50 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  "be-effect": "border-muted-foreground/30 bg-muted/60 text-foreground",
  decision: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  terminal: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
}
const TONE_STYLE: Record<string, string> = {
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
}

function NodeCard({
  node,
  incomingLabel,
  routeOutcomesEnabled,
  ctx,
}: {
  node: FlowNode
  incomingLabel?: string
  routeOutcomesEnabled: boolean
  ctx: OutcomeContext
}) {
  const dimmed = node.gated === "ROUTE_OUTCOMES" && !routeOutcomesEnabled
  const style = node.tone ? TONE_STYLE[node.tone] : KIND_STYLE[node.kind]
  return (
    <div className="flex flex-col items-stretch">
      {incomingLabel && (
        <div className="flex items-center justify-center gap-1 py-0.5 text-[9px] font-medium text-muted-foreground">
          <ArrowDown className="size-2.5" />
          {incomingLabel}
        </div>
      )}
      <div
        className={cn(
          "rounded-md border px-2.5 py-1.5 text-[11px] leading-tight shadow-sm",
          style,
          dimmed && "opacity-45",
        )}
      >
        <div className="flex items-start justify-between gap-1.5">
          <span className="font-medium">{fillTokens(node.label, ctx)}</span>
          {node.gated && (
            <span
              title={dimmed ? "Activates at go-live" : "Server-side step"}
              className="shrink-0 rounded-full bg-background/60 p-0.5"
            >
              <Lock className="size-2.5" />
            </span>
          )}
        </div>
        {node.detail && <p className="mt-0.5 text-[9px] opacity-70">{fillTokens(node.detail, ctx)}</p>}
      </div>
    </div>
  )
}

function Lane({
  title,
  nodes,
  edges,
  routeOutcomesEnabled,
  ctx,
}: {
  title: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  routeOutcomesEnabled: boolean
  ctx: OutcomeContext
}) {
  // The label on the edge that lands on a node (shown above that node).
  const incoming = (id: string) => edges.find((e) => e.to === id && e.label)?.label
  return (
    <div className="flex-1 min-w-0">
      <div className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1.5">
        {nodes.length === 0 ? (
          <p className="text-center text-[10px] text-muted-foreground">—</p>
        ) : (
          nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              incomingLabel={incoming(node.id)}
              routeOutcomesEnabled={routeOutcomesEnabled}
              ctx={ctx}
            />
          ))
        )}
      </div>
    </div>
  )
}

export function FlowDiagram({
  nodes,
  edges,
  ctx,
  routeOutcomesEnabled = false,
}: {
  nodes: FlowNode[]
  edges: FlowEdge[]
  ctx: OutcomeContext
  routeOutcomesEnabled?: boolean
}) {
  const fe = nodes.filter((n) => n.lane === "fe")
  const be = nodes.filter((n) => n.lane === "be")
  const hasGated = nodes.some((n) => n.gated === "ROUTE_OUTCOMES")

  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-2">
        <Lane title="Frontend (the rep)" nodes={fe} edges={edges} routeOutcomesEnabled={routeOutcomesEnabled} ctx={ctx} />
        <div className="flex w-5 shrink-0 items-center justify-center">
          <ArrowRight className="size-4 text-muted-foreground" />
        </div>
        <Lane title="Backend (the system)" nodes={be} edges={edges} routeOutcomesEnabled={routeOutcomesEnabled} ctx={ctx} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-[9px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm border border-primary/40 bg-primary/10" />FE action</span>
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm border border-dashed border-violet-500/50 bg-violet-500/10" />API call</span>
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm border border-muted-foreground/30 bg-muted/60" />BE effect</span>
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm border border-amber-500/50 bg-amber-500/10" />Decision</span>
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm border border-emerald-500/40 bg-emerald-500/10" />End state</span>
        {hasGated && !routeOutcomesEnabled && (
          <span className="inline-flex items-center gap-1"><Lock className="size-2.5" />Dimmed steps activate at go-live</span>
        )}
      </div>
    </div>
  )
}
