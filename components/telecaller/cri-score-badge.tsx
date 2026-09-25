"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useScoreHistory } from "@/hooks/use-leads"
import type { ScoreBreakdownRow } from "@/lib/api/leads"

const GEAR_LABEL: Record<number, string> = {
  1: "Closing window",
  2: "Warming",
  3: "Nurture",
  4: "Dormant",
}

const COMPONENTS: Array<{
  key: "q" | "r" | "v" | "m" | "n"
  wkey: "Q" | "R" | "V" | "M" | "N"
  label: string
  hint: string
}> = [
  { key: "q", wkey: "Q", label: "Quote depth", hint: "How far the commercial conversation has gone — quotation sent / revised, pipeline stage" },
  { key: "r", wkey: "R", label: "Two-way engagement", hint: "How much the doctor replies vs. how much we push (reciprocity)" },
  { key: "v", wkey: "V", label: "Recency & speed", hint: "How recently and how fast they've been replying (velocity)" },
  { key: "m", wkey: "M", label: "Meeting progress", hint: "Meeting booked / demo attended" },
  { key: "n", wkey: "N", label: "Touch volume", hint: "Total genuine interactions (saturates — can't carry a stale lead)" },
]

function toneFor(cri: number) {
  return cri >= 70
    ? "border-primary/30 bg-primary/10 text-primary"
    : cri >= 45
      ? "border-warning/40 text-warning"
      : "border-muted-foreground/30 text-muted-foreground"
}

function Sparkline({ rows }: { rows: ScoreBreakdownRow[] }) {
  const pts = [...rows].reverse().map((r) => r.cri)
  if (pts.length < 2) return null
  const W = 100, H = 28
  const step = W / (pts.length - 1)
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(H - (p / 100) * H).toFixed(1)}`)
    .join(" ")
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-10 w-full text-primary" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function CriScoreBadge({
  id, cri, className,
}: { id: string | number; cri: number; className?: string }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading, isError } = useScoreHistory(id, open)
  const history = data?.history ?? []
  const latest = history[0]
  const weights = data?.weights

  return (
    <>
      <button
        type="button"
        title="Close-Readiness score — tap for history & breakdown"
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        className={cn(
          "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition hover:brightness-95 cursor-pointer",
          toneFor(cri),
          className,
        )}
      >
        Score {cri}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Close-Readiness score · #{id}</DialogTitle>
            <DialogDescription>How this lead's score is built, and how it has changed over time.</DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : isError || !latest ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No score history yet for this lead.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn("flex size-14 shrink-0 flex-col items-center justify-center rounded-full border-2", toneFor(latest.cri))}>
                  <span className="text-lg font-bold leading-none tabular-nums">{latest.cri}</span>
                  <span className="text-[9px]">/ 100</span>
                </div>
                <div className="text-sm">
                  <div className="font-medium">Gear {latest.gear} · {GEAR_LABEL[latest.gear] ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    as of {new Date(latest.score_date).toLocaleDateString()} · {latest.model_version}
                  </div>
                  {latest.competitive_risk && <div className="text-xs text-destructive">⚠ competitive risk — quoted, engaged, now gone quiet</div>}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-muted-foreground">Breakdown</div>
                {COMPONENTS.map((c) => {
                  const val = latest[c.key]
                  const w = weights?.[c.wkey] ?? 0
                  const pts = Math.round(val * w)
                  return (
                    <div key={c.key} title={c.hint} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span>{c.label}</span>
                        <span className="tabular-nums text-muted-foreground">+{pts}<span className="opacity-60"> / {w}</span></span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                        <div className="h-full rounded bg-primary/70" style={{ width: `${Math.round(val * 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
                {latest.flag_bonus > 0 && (
                  <div className="flex items-center justify-between pt-1 text-xs text-emerald-600">
                    <span>Rep flag bonus — confirmed interest</span><span className="tabular-nums">+{latest.flag_bonus}</span>
                  </div>
                )}
                {latest.penalty > 0 && (
                  <div className="flex items-center justify-between pt-1 text-xs text-destructive">
                    <span>Penalty{latest.penalty_reasons.length ? ` — ${latest.penalty_reasons.join(", ")}` : ""}</span>
                    <span className="tabular-nums">−{latest.penalty}</span>
                  </div>
                )}
              </div>

              {latest.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {latest.reasons.map((r, i) => (
                    <span key={i} className="rounded-full border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{r}</span>
                  ))}
                </div>
              )}

              {history.length > 1 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-muted-foreground">History</div>
                  <Sparkline rows={history} />
                  <div className="max-h-40 space-y-0.5 overflow-y-auto pr-1">
                    {history.map((h, i) => {
                      const prev = history[i + 1]
                      const delta = prev ? h.cri - prev.cri : 0
                      return (
                        <div key={h.score_date} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{new Date(h.score_date).toLocaleDateString()}</span>
                          <span className="flex items-center gap-2 tabular-nums">
                            <span className="w-6 text-right">{h.cri}</span>
                            <span className={cn("w-10 text-right", delta > 0 ? "text-emerald-600" : delta < 0 ? "text-destructive" : "text-muted-foreground")}>
                              {delta > 0 ? `+${delta}` : delta < 0 ? delta : "—"}
                            </span>
                            <span className="w-5 text-right text-muted-foreground">G{h.gear}</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
