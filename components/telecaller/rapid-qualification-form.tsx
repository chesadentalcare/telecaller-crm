"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  ClipboardList, Phone, Video, MapPin, Droplets, CheckCircle2,
  User, Building2, Clock, IndianRupee, Swords, ShoppingCart, UserCheck, Landmark,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  qualificationSchema,
  qualificationDefaults,
  type QualificationValues,
  DENTIST_TYPES, PRACTICE_TYPES, TIMELINE_OPTIONS, BUDGET_RANGES,
  COMPETITOR_OPTIONS, FUNDING_METHODS, PURCHASE_TYPES,
} from "@/lib/schemas/qualification"
import { useQualify, useEnterDrip } from "@/hooks/use-lead-mutations"
import { ApiError } from "@/lib/api/client"

// Amendment 2 (Theme 3): the ONE qualification bar. The old rapid/full split is gone —
// this single form captures the union of every qualification field (all mandatory) and
// lands the lead at the single 'qualified' stage via PUT /leads/:id/qualify.
// (Component kept named `RapidQualificationForm` so existing call sites are unchanged.)

const ROUTE_OPTIONS = [
  { id: "online_meeting", label: "Online Meeting", desc: "Schedule video demo", icon: Video, color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary" },
  { id: "physical_meeting", label: "Physical Meeting", desc: "In-person clinic demo", icon: MapPin, color: "text-success", bgColor: "bg-success/10", borderColor: "border-success" },
  { id: "drip_info", label: "Add to Drip", desc: "Nurture over time", icon: Droplets, color: "text-chart-3", bgColor: "bg-chart-3/10", borderColor: "border-chart-3" },
] as const

// Engaged · "No — nurture" path: the route choice is Zoom consult vs Drip ONLY
// (Physical is the "Yes" path). Online_meeting is relabelled "Zoom consult" here.
const ENGAGED_NURTURE_ROUTES = [
  { id: "online_meeting", label: "Zoom consult", desc: "Schedule a Zoom demo", icon: Video, color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary" },
  { id: "drip_info", label: "Add to Drip", desc: "Nurture over time", icon: Droplets, color: "text-chart-3", bgColor: "bg-chart-3/10", borderColor: "border-chart-3" },
] as const

interface LeadInfo {
  name: string
  phone: string
  equipment: string
}

interface RapidQualificationFormProps {
  lead?: LeadInfo
  leadId?: string | number
  /** Pre-fill from the lead's current values (gap-fill an already-partly-qualified lead). */
  defaults?: Partial<QualificationValues>
  /** Re-qualification: start blank + show the >= 6-month close note. */
  requalify?: boolean
  /** Called after a successful qualify (e.g. close a dialog / refresh). */
  onQualified?: () => void
  /**
   * Engaged · "No — nurture" mode. When set, the Next Step Route is restricted to
   * Zoom consult + Add to Drip, and on Complete the form QUALIFIES then hands the
   * chosen route back to the caller (which opens the Zoom modal or enters the drip
   * AND logs the engaged call) instead of running its own drip-entry / success card.
   */
  engagedNurture?: { onRoute: (route: "online_meeting" | "drip_info", timeline: string) => void }
}

export function RapidQualificationForm({ lead, leadId, defaults, requalify, onQualified, engagedNurture }: RapidQualificationFormProps) {
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [lastRoute, setLastRoute] = useState<string>("")

  const { mutateAsync: qualify } = useQualify(leadId ?? "")
  const { mutateAsync: enterDrip } = useEnterDrip(leadId ?? "")

  const routeOptions = engagedNurture ? ENGAGED_NURTURE_ROUTES : ROUTE_OPTIONS
  // In nurture mode, drop a pre-filled Physical route (not offered here) so the rep
  // makes an explicit Zoom-vs-Drip choice. Otherwise keep the lead's current route.
  const initialRoute =
    engagedNurture && defaults?.route !== "online_meeting" && defaults?.route !== "drip_info"
      ? ""
      : (defaults?.route ?? qualificationDefaults.route)

  const { control, handleSubmit, reset, formState } = useForm<QualificationValues>({
    resolver: zodResolver(qualificationSchema),
    // Re-qualification clears everything ("never carry stale data forward"); otherwise
    // pre-fill so the rep only fills the gaps.
    defaultValues: requalify
      ? qualificationDefaults
      : { ...qualificationDefaults, ...defaults, route: initialRoute as QualificationValues["route"] },
    mode: "onChange",
  })
  const { isValid, isSubmitting } = formState

  const onSubmit = async (values: QualificationValues) => {
    if (!leadId) {
      toast.error("Open this form from a lead's detail view")
      return
    }
    try {
      const res = await qualify(values)
      if (res?.sapSynced === false) {
        toast.warning("Qualification saved, but the SAP sync failed — it will need a re-sync.")
      }
      // Engaged · "No — nurture": qualification is saved; hand the chosen route back to
      // the caller, which opens the Zoom modal or enters the drip AND logs the engaged
      // call. No success card here — the caller closes this dialog and takes over.
      if (engagedNurture) {
        engagedNurture.onRoute(values.route as "online_meeting" | "drip_info", values.timeline)
        return
      }
      // Drip route → enter the nurture track immediately (no extra clicks).
      if (values.route === "drip_info") {
        try {
          const drip = await enterDrip({ timelineBucket: values.timeline })
          if (drip?.projection) {
            const date = new Date(drip.projection.projectedCompletionAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
            toast.success(`Lead entered drip — projected close ${date} (${drip.projection.totalStages}-touch nurture)`)
          }
        } catch {
          toast.warning("Qualification saved, but drip entry failed — retry from the Drip tab")
        }
      } else if (res?.predictedClosingDate) {
        const date = new Date(res.predictedClosingDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
        toast.success(`Lead qualified — projected close ${date}`)
      }
      setLastRoute(values.route)
      setSubmitSuccess(true)
      onQualified?.()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save qualification")
    }
  }

  if (submitSuccess) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex size-16 items-center justify-center rounded-full bg-success/10 mb-4">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Lead Qualified!</h3>
          <p className="text-sm text-muted-foreground text-center">
            {lastRoute === "drip_info"
              ? "Lead has been added to the drip queue."
              : `${lastRoute === "online_meeting" ? "Online" : "Physical"} meeting to be scheduled.`}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSubmitSuccess(false)
              reset(qualificationDefaults)
            }}
          >
            Qualify Another Lead
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardList className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{requalify ? "Re-Qualification" : "Qualification"}</CardTitle>
            <CardDescription className="text-xs">
              {requalify
                ? "Fresh capture — old qualification was cleared. Projected close ≥ 6 months."
                : lead ? `Qualifying: ${lead.name}` : "Qualify lead for next steps"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Phone verified switch */}
          <Controller
            control={control}
            name="phoneVerified"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-background">
                    <Phone className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <Label htmlFor="phoneVerified" className="text-sm font-medium text-foreground cursor-pointer">
                      Phone Verified
                    </Label>
                    <p className="text-[11px] text-muted-foreground">Contact successfully reached</p>
                  </div>
                </div>
                <Switch id="phoneVerified" checked={field.value} onCheckedChange={field.onChange} />
              </div>
            )}
          />

          {/* Decision maker (new in the union bar) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <UserCheck className="size-3 text-muted-foreground" />
              Decision Maker
            </Label>
            <Controller
              control={control}
              name="decisionMaker"
              render={({ field }) => (
                <Input className="h-9" placeholder="Name / role of the decision maker" {...field} />
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <User className="size-3 text-muted-foreground" />
                Dentist Type
              </Label>
              <Controller
                control={control}
                name="dentistType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {DENTIST_TYPES.map((t) => <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Building2 className="size-3 text-muted-foreground" />
                Practice Type
              </Label>
              <Controller
                control={control}
                name="practiceType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select practice" /></SelectTrigger>
                    <SelectContent>
                      {PRACTICE_TYPES.map((t) => <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Clock className="size-3 text-muted-foreground" />
              Purchase Timeline
            </Label>
            <Controller
              control={control}
              name="timeline"
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-1.5">
                  {TIMELINE_OPTIONS.map((opt) => {
                    const active = field.value === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          "flex flex-col items-center rounded-lg border px-2 py-2.5 text-center transition-colors",
                          active
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-background hover:bg-muted/50 text-foreground",
                        )}
                      >
                        <span className="text-[11px] font-medium">{opt.label}</span>
                        <span className="text-[9px] text-muted-foreground">{opt.desc}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <IndianRupee className="size-3 text-muted-foreground" />
                Budget Range
              </Label>
              <Controller
                control={control}
                name="budgetRange"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select budget" /></SelectTrigger>
                    <SelectContent>
                      {BUDGET_RANGES.map((r) => <SelectItem key={r.value} value={r.value} className="text-sm">{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Landmark className="size-3 text-muted-foreground" />
                Funding Method
              </Label>
              <Controller
                control={control}
                name="fundingMethod"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select funding" /></SelectTrigger>
                    <SelectContent>
                      {FUNDING_METHODS.map((f) => <SelectItem key={f.value} value={f.value} className="text-sm">{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Swords className="size-3 text-muted-foreground" />
                Competitor Evaluated
              </Label>
              <Controller
                control={control}
                name="competitors"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select competitor" /></SelectTrigger>
                    <SelectContent>
                      {COMPETITOR_OPTIONS.map((c) => <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <ShoppingCart className="size-3 text-muted-foreground" />
                Purchase Type
              </Label>
              <Controller
                control={control}
                name="purchaseType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {PURCHASE_TYPES.map((t) => <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Next Step Route</Label>
            <Controller
              control={control}
              name="route"
              render={({ field }) => (
                <div className={cn("grid gap-2", engagedNurture ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3")}>
                  {routeOptions.map((route) => {
                    const active = field.value === route.id
                    const Icon = route.icon
                    return (
                      <button
                        key={route.id}
                        type="button"
                        onClick={() => field.onChange(route.id)}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-lg border p-4 transition-all",
                          active ? `${route.borderColor} ${route.bgColor}` : "border-border bg-background hover:bg-muted/50",
                        )}
                      >
                        <div className={cn(
                          "flex size-10 items-center justify-center rounded-full",
                          active ? route.bgColor : "bg-muted",
                        )}>
                          <Icon className={cn("size-5", active ? route.color : "text-muted-foreground")} />
                        </div>
                        <div className="text-center">
                          <p className={cn("text-xs font-medium", active ? route.color : "text-foreground")}>
                            {route.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{route.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </div>

          <Button type="submit" className="w-full h-10" disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Processing..." : "Complete Qualification"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
