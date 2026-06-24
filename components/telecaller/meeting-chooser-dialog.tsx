"use client"

// Engaged → meeting: the atomic guided modal (Amendment-3 outcome-driven flow).
// When the rep picks "Engaged · ready to schedule", the call is NOT logged yet — this
// modal opens and meeting details become MANDATORY. On confirm it books the meeting AND
// logs the engaged attempt together. Ordering is meeting-FIRST then attempt-log, so a
// partial failure can never leave an orphan "engaged" call with no meeting; if the
// meeting books but the attempt-log then fails, we keep the modal open and retry ONLY the
// log (meetingBooked guard) so we never double-book.
//
// Reuses the existing master endpoints (physical → named-salesperson handover; zoom →
// design-fee branch) and their schemas, so there's no backend change.

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { MapPinned, Video, AlertTriangle, CheckCircle2 } from "lucide-react"

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { physicalMeetingSchema, physicalMeetingDefaults, type PhysicalMeetingValues } from "@/lib/schemas/physical-meeting"
import { zoomMeetingSchema, zoomMeetingDefaults, type ZoomMeetingValues } from "@/lib/schemas/zoom-meeting"
import { usePhysicalMeeting, useZoomMeeting, useLogAttempt } from "@/hooks/use-lead-mutations"
import { useSalesUsers } from "@/hooks/use-leads"
import { ApiError } from "@/lib/api/client"

export interface EngagedCallValues {
  predictedClosingDate: string
  notes: string
}

export function MeetingChooserDialog({
  open,
  onOpenChange,
  leadId,
  address,
  isFullyQualified,
  callValues,
  onLogged,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  leadId: string | number
  address?: string
  /** Physical + Zoom both require full qualification (qualificationGate). */
  isFullyQualified: boolean
  /** The engaged-call fields collected on the main form (logged together with the meeting). */
  callValues: EngagedCallValues
  /** Called after BOTH the meeting and the engaged attempt are committed. */
  onLogged: () => void
}) {
  const [type, setType] = useState<"physical" | "zoom">("physical")
  // Once the meeting books we must not re-book on a log retry.
  const [meetingBooked, setMeetingBooked] = useState(false)

  const { mutateAsync: logAttempt } = useLogAttempt(leadId)

  const logEngaged = async () => {
    await logAttempt({
      outcome: "engaged",
      ready_now: true,
      ...(callValues.predictedClosingDate ? { predicted_closing_date: callValues.predictedClosingDate } : {}),
      notes: callValues.notes,
    })
  }

  const finish = () => {
    setMeetingBooked(false)
    onOpenChange(false)
    onLogged()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setMeetingBooked(false)
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule the meeting &amp; log the call</DialogTitle>
          <DialogDescription>
            The engaged call logs together with this meeting. Pick the meeting type and fill the details.
          </DialogDescription>
        </DialogHeader>

        {!isFullyQualified && (
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="size-4 text-amber-600" />
            <AlertDescription className="text-xs">
              Complete the lead's qualification first — both meeting types require it. Use “Update Qualification” on the Call Log tab, then come back.
            </AlertDescription>
          </Alert>
        )}

        {meetingBooked && (
          <Alert className="border-destructive/40 bg-destructive/5">
            <AlertTriangle className="size-4 text-destructive" />
            <AlertDescription className="text-xs">
              Meeting booked, but logging the engaged call failed. Click <b>Log the call</b> to finish — the meeting won't be re-booked.
            </AlertDescription>
          </Alert>
        )}

        {meetingBooked ? (
          <div className="flex justify-end">
            <Button
              onClick={async () => {
                try {
                  await logEngaged()
                  toast.success("Call logged — meeting + engagement saved")
                  finish()
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : "Logging the call failed — retry")
                }
              }}
            >
              Log the call
            </Button>
          </div>
        ) : (
          <Tabs value={type} onValueChange={(v) => setType(v as "physical" | "zoom")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="physical" className="gap-1.5 text-xs"><MapPinned className="size-3.5" />Physical</TabsTrigger>
              <TabsTrigger value="zoom" className="gap-1.5 text-xs"><Video className="size-3.5" />Zoom</TabsTrigger>
            </TabsList>

            <TabsContent value="physical" className="mt-3">
              <PhysicalBody
                leadId={leadId}
                address={address}
                disabled={!isFullyQualified}
                onMeetingBooked={() => setMeetingBooked(true)}
                logEngaged={logEngaged}
                finish={finish}
              />
            </TabsContent>
            <TabsContent value="zoom" className="mt-3">
              <ZoomBody
                leadId={leadId}
                disabled={!isFullyQualified}
                onMeetingBooked={() => setMeetingBooked(true)}
                logEngaged={logEngaged}
                finish={finish}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Physical meeting body (named salesperson + address reconfirm → auto handover) ──
function PhysicalBody({
  leadId, address, disabled, onMeetingBooked, logEngaged, finish,
}: {
  leadId: string | number
  address?: string
  disabled: boolean
  onMeetingBooked: () => void
  logEngaged: () => Promise<void>
  finish: () => void
}) {
  const { mutateAsync: schedulePhysical } = usePhysicalMeeting(leadId)
  const { data: salesUsers = [], isLoading: salesLoading } = useSalesUsers(true)
  const { control, handleSubmit, formState } = useForm<PhysicalMeetingValues>({
    resolver: zodResolver(physicalMeetingSchema),
    defaultValues: { ...physicalMeetingDefaults, address: address ?? "" },
    mode: "onChange",
  })
  const { errors, isSubmitting } = formState

  const onSubmit = async (values: PhysicalMeetingValues) => {
    try {
      const res = await schedulePhysical(values)
      onMeetingBooked()
      if (res.sapSynced === false) toast.warning("Booked, but the SAP ownership assignment failed — re-sync later.")
      await logEngaged()
      toast.success("Physical meeting booked + engaged call logged")
      finish()
    } catch (err) {
      // If the meeting itself failed, meetingBooked stays false → nothing orphaned.
      toast.error(err instanceof ApiError ? err.message : "Failed to book the meeting")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <Controller control={control} name="meetingAt" render={({ field }) => (
        <Field label="Date & time" error={errors.meetingAt?.message}>
          <Input type="datetime-local" {...field} />
        </Field>
      )} />
      <Controller control={control} name="location" render={({ field }) => (
        <Field label="Location" error={errors.location?.message}>
          <Input {...field} placeholder="Clinic address or city" />
        </Field>
      )} />
      <Controller control={control} name="salesUsername" render={({ field }) => (
        <Field label="Assign sales employee" error={errors.salesUsername?.message}>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="h-9" disabled={salesLoading}>
              <SelectValue placeholder={salesLoading ? "Loading…" : "Select a salesperson"} />
            </SelectTrigger>
            <SelectContent>
              {salesUsers.map((u) => (
                <SelectItem key={u.username} value={u.username} disabled={!u.sales_person_code}>
                  {u.full_name || u.username}<span className="text-muted-foreground"> · {u.role.replace("_", " ")}</span>
                  {!u.sales_person_code ? " · ⚠ no SAP code" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )} />
      <Controller control={control} name="address" render={({ field }) => (
        <Field label="Reconfirm address" error={errors.address?.message} hint="Confirm or correct — written back to the lead & SAP.">
          <Input {...field} placeholder="Lead's confirmed address" />
        </Field>
      )} />
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || disabled} className="gap-1.5">
          <CheckCircle2 className="size-3.5" />
          {isSubmitting ? "Booking…" : "Book meeting & log call"}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ── Zoom meeting body (stays with the telecaller; design-fee branch) ──
function ZoomBody({
  leadId, disabled, onMeetingBooked, logEngaged, finish,
}: {
  leadId: string | number
  disabled: boolean
  onMeetingBooked: () => void
  logEngaged: () => Promise<void>
  finish: () => void
}) {
  const { mutateAsync: scheduleZoom } = useZoomMeeting(leadId)
  const { control, handleSubmit, watch, formState } = useForm<ZoomMeetingValues>({
    resolver: zodResolver(zoomMeetingSchema),
    defaultValues: { ...zoomMeetingDefaults, layoutShared: "no", designFeeStatus: "discussed" },
    mode: "onChange",
  })
  const { errors, isSubmitting } = formState
  const feeStatus = watch("designFeeStatus")

  const onSubmit = async (values: ZoomMeetingValues) => {
    try {
      await scheduleZoom(values)
      onMeetingBooked()
      await logEngaged()
      toast.success("Zoom meeting booked + engaged call logged")
      finish()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to book the Zoom meeting")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <Controller control={control} name="meetingAt" render={({ field }) => (
        <Field label="Date & time" error={errors.meetingAt?.message}>
          <Input type="datetime-local" {...field} />
        </Field>
      )} />
      <Controller control={control} name="layoutShared" render={({ field }) => (
        <Field label="Layout shared?" error={errors.layoutShared?.message}>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )} />
      <Controller control={control} name="designFeeStatus" render={({ field }) => (
        <Field label="Design fee (₹5,000)" error={errors.designFeeStatus?.message}>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="discussed">Discussed (pending)</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )} />
      {feeStatus === "paid" && (
        <Controller control={control} name="paymentProof" render={({ field }) => (
          <Field label="Payment proof" error={errors.paymentProof?.message as string | undefined}>
            <Input type="file" accept="image/*,application/pdf" onChange={(e) => field.onChange(e.target.files?.[0] ?? null)} />
          </Field>
        )} />
      )}
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || disabled} className="gap-1.5">
          <CheckCircle2 className="size-3.5" />
          {isSubmitting ? "Booking…" : "Book Zoom & log call"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}
