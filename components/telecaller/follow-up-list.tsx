"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Clock, CheckCircle2, AlertTriangle, Calendar,
  MessageSquare, ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { ApiError } from "@/lib/api/client"
import { useLeadFollowUps } from "@/hooks/use-leads"
import { useCompleteFollowUp } from "@/hooks/use-lead-mutations"
import {
  followUpCompleteSchema, OBJECTION_TYPES,
  type FollowUpCompleteValues,
} from "@/lib/schemas/follow-up"
import type { FollowUpTaskRow } from "@/lib/api/leads"

// ── Follow-Up List Card ──────────────────────────────────────────────
export function FollowUpListCard({ opportunityDocEntry }: { opportunityDocEntry: number }) {
  const { data: tasks, isLoading } = useLeadFollowUps(opportunityDocEntry)

  const pending = tasks?.filter((t) => t.status === "pending" || t.status === "overdue") || []
  const completed = tasks?.filter((t) => t.status === "completed") || []
  const hasOverdue = pending.some((t) => t.status === "overdue")

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="size-4" />
            Follow-Ups
            {hasOverdue && (
              <Badge variant="destructive" className="text-[10px]">
                Overdue
              </Badge>
            )}
          </CardTitle>
          {pending.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {pending.length} pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading follow-ups...</p>
        ) : !tasks?.length ? (
          <p className="text-xs text-muted-foreground">
            No follow-ups yet. Send a quotation via WhatsApp to auto-create follow-up tasks.
          </p>
        ) : (
          <div className="space-y-2">
            {pending.map((t) => (
              <FollowUpTaskItem key={t.id} task={t} />
            ))}
            {completed.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pt-2">
                  Completed
                </p>
                {completed.map((t) => (
                  <FollowUpTaskItem key={t.id} task={t} />
                ))}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Individual Task Row ──────────────────────────────────────────────
const TASK_LABELS: Record<number, string> = {
  1: "Day 1 Follow-Up",
  2: "Day 3 Follow-Up",
  3: "Day 7 Follow-Up",
  4: "Day 14 Follow-Up",
}

function FollowUpTaskItem({ task: t }: { task: FollowUpTaskRow }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const isActionable = t.status === "pending" || t.status === "overdue"

  const statusConfig = {
    pending: { icon: Clock, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
    overdue: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" },
    completed: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
    cancelled: { icon: Clock, color: "text-gray-400", bg: "bg-gray-50 dark:bg-gray-900" },
  }[t.status] || { icon: Clock, color: "text-gray-400", bg: "bg-gray-50" }

  const StatusIcon = statusConfig.icon

  return (
    <>
      <div
        className={`rounded-md border p-2.5 flex items-center gap-3 ${statusConfig.bg} ${isActionable ? "cursor-pointer hover:ring-1 hover:ring-primary/30" : ""}`}
        onClick={() => isActionable && setDialogOpen(true)}
      >
        <StatusIcon className={`size-4 shrink-0 ${statusConfig.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">
              {TASK_LABELS[t.task_number] || `Follow-Up #${t.task_number}`}
            </span>
            <Badge
              variant={t.status === "overdue" ? "destructive" : "outline"}
              className="text-[10px]"
            >
              {t.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              Due: {new Date(t.due_at).toLocaleDateString("en-IN")}
            </span>
            {t.quote_number && <span>Quote: {t.quote_number}</span>}
          </div>
          {t.status === "completed" && t.objection_type && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
              <MessageSquare className="size-3" />
              <span className="capitalize">{t.objection_type}</span>
              {t.next_action_date && (
                <span>Next: {new Date(t.next_action_date).toLocaleDateString("en-IN")}</span>
              )}
            </div>
          )}
        </div>
        {isActionable && <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
      </div>

      {isActionable && (
        <CompleteFollowUpDialog
          task={t}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  )
}

// ── Complete Follow-Up Dialog ────────────────────────────────────────
function CompleteFollowUpDialog({
  task,
  open,
  onOpenChange,
}: {
  task: FollowUpTaskRow
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { mutateAsync: complete, isPending } = useCompleteFollowUp(task.id)

  const {
    control, handleSubmit, reset,
    formState: { errors },
  } = useForm<FollowUpCompleteValues>({
    resolver: zodResolver(followUpCompleteSchema),
    defaultValues: {
      objectionType: undefined,
      nextActionDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
      notes: "",
    },
  })

  const onSubmit = async (values: FollowUpCompleteValues) => {
    try {
      await complete(values)
      toast.success("Follow-up completed")
      onOpenChange(false)
      reset()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to complete follow-up")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Complete {TASK_LABELS[task.task_number] || `Follow-Up #${task.task_number}`}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {task.quote_number && `Quote: ${task.quote_number} — `}
            Due: {new Date(task.due_at).toLocaleDateString("en-IN")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <Controller
            control={control}
            name="objectionType"
            render={({ field }) => (
              <div className="space-y-1.5">
                <Label className="text-xs">Customer Objection *</Label>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select objection type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {OBJECTION_TYPES.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.objectionType && (
                  <p className="text-[11px] text-destructive">{errors.objectionType.message}</p>
                )}
              </div>
            )}
          />

          <Controller
            control={control}
            name="nextActionDate"
            render={({ field }) => (
              <div className="space-y-1.5">
                <Label className="text-xs">Next Action Date *</Label>
                <Input type="date" {...field} className="text-xs" />
                {errors.nextActionDate && (
                  <p className="text-[11px] text-destructive">{errors.nextActionDate.message}</p>
                )}
              </div>
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea {...field} rows={3} placeholder="Call summary, next steps..." className="text-xs" />
              </div>
            )}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Saving..." : "Mark Complete"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
