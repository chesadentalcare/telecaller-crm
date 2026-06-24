"use client"

// "Learn about this outcome" modal. Given the resolved OutcomeFlow it shows: what the
// outcome does, the rep-facing thresholds, and the full FE+BE flow as a flowchart. Reads
// from the SAME registry the form's guided behavior uses, so the explanation always
// matches what actually happens.

import { BookOpen, Zap } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { FlowDiagram } from "./flow-diagram"
import type { OutcomeFlow, OutcomeContext } from "@/lib/outcome-flows"
import { fillTokens } from "@/lib/outcome-flows"

const GUIDED_LABEL: Record<string, string> = {
  none: "Logs the call",
  "open-meeting-modal": "Opens a meeting booking (required)",
  "enter-drip": "Enters the nurture drip",
  "schedule-callback": "Schedules a callback",
  "recovery-whatsapp": "Offers the recovery WhatsApp",
}

export function OutcomeExplainerDialog({
  open,
  onOpenChange,
  flow,
  ctx,
  routeOutcomesEnabled = false,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  flow: OutcomeFlow | null
  ctx: OutcomeContext
  routeOutcomesEnabled?: boolean
}) {
  if (!flow) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            {flow.title}
          </DialogTitle>
          <DialogDescription>{flow.whatThisDoes}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Guided action + what the rep does next */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Zap className="size-3" />
              {GUIDED_LABEL[flow.guidedAction] ?? "Logs the call"}
            </Badge>
            {flow.mandatoryBeforeCommit && (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 bg-amber-500/10 text-amber-700">
                Details required before the call logs
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">
              Predicted close: {flow.predictedClose}
            </Badge>
          </div>

          {/* Thresholds */}
          {flow.thresholds.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">What to expect</p>
              <ul className="space-y-1">
                {flow.thresholds.map((t, i) => (
                  <li key={i} className="flex gap-1.5 text-[11px] text-foreground">
                    <span className="text-muted-foreground">•</span>
                    <span>{fillTokens(t, ctx)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* The flowchart */}
          <div className="rounded-md border p-3">
            <p className="mb-2 text-[11px] font-semibold text-muted-foreground">How it flows — frontend &amp; backend</p>
            <FlowDiagram nodes={flow.nodes} edges={flow.edges} ctx={ctx} routeOutcomesEnabled={routeOutcomesEnabled} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
