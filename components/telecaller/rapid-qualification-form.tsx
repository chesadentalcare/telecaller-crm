"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  ClipboardList, Phone, Video, MapPin, Droplets, CheckCircle2,
  User, Building2, Clock, IndianRupee,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  rapidQualificationSchema,
  rapidQualificationDefaults,
  type RapidQualificationValues,
} from "@/lib/schemas/rapid-qualification"
import { useRapidQualify, useEnterDrip } from "@/hooks/use-lead-mutations"
import { ApiError } from "@/lib/api/client"

const DENTIST_TYPES = [
  "General Dentist", "Orthodontist", "Periodontist", "Endodontist",
  "Oral Surgeon", "Pediatric Dentist", "Prosthodontist",
] as const

const PRACTICE_TYPES = [
  "Solo Practice", "Group Practice", "Hospital/Clinic Chain",
  "Dental College", "Corporate Dental", "Mobile Dental Unit",
] as const

const TIMELINE_OPTIONS = [
  { value: "immediate", label: "Immediate",  desc: "< 1 week"    },
  { value: "short",     label: "Short Term", desc: "1-4 weeks"   },
  { value: "medium",    label: "Medium Term", desc: "1-3 months"  },
  { value: "long",      label: "Long Term",  desc: "3-6 months"  },
  { value: "future",    label: "Future",     desc: "6+ months"   },
] as const

const BUDGET_RANGES = [
  "Under ₹50,000", "₹50K - ₹1L", "₹1L - ₹2.5L",
  "₹2.5L - ₹5L", "₹5L - ₹10L", "Above ₹10L",
] as const

const ROUTE_OPTIONS = [
  { id: "online-meeting",   label: "Online Meeting",   desc: "Schedule video demo",  icon: Video,  color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary" },
  { id: "physical-meeting", label: "Physical Meeting", desc: "In-person clinic demo", icon: MapPin, color: "text-success", bgColor: "bg-success/10", borderColor: "border-success" },
  { id: "drip",             label: "Add to Drip",      desc: "Nurture over time",     icon: Droplets, color: "text-chart-3", bgColor: "bg-chart-3/10", borderColor: "border-chart-3" },
] as const

interface LeadInfo {
  name: string
  phone: string
  equipment: string
}

interface RapidQualificationFormProps {
  lead?: LeadInfo
  leadId?: string | number
}

// Maps the form's frontend-friendly route ids onto the backend's enum.
const ROUTE_TO_BACKEND: Record<string, "online_meeting" | "physical_meeting" | "drip_info"> = {
  "online-meeting": "online_meeting",
  "physical-meeting": "physical_meeting",
  drip: "drip_info",
}

export function RapidQualificationForm({ lead, leadId }: RapidQualificationFormProps) {
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [lastRoute, setLastRoute] = useState<string>("")

  const { mutateAsync: rapidQualify } = useRapidQualify(leadId ?? "")
  const { mutateAsync: enterDrip } = useEnterDrip(leadId ?? "")

  const { control, handleSubmit, reset, formState } = useForm<RapidQualificationValues>({
    resolver: zodResolver(rapidQualificationSchema),
    defaultValues: rapidQualificationDefaults,
    mode: "onChange",
  })
  const { isValid, isSubmitting } = formState

  const onSubmit = async (values: RapidQualificationValues) => {
    if (!leadId) {
      toast.error("Open this form from a lead's detail view")
      return
    }
    try {
      await rapidQualify({
        ...values,
        routeSelection: ROUTE_TO_BACKEND[values.routeSelection] || values.routeSelection,
      })
      // If telecaller picked drip, also enter the drip track immediately so
      // the no-extra-clicks UX matches the SOP.
      if (values.routeSelection === "drip") {
        try {
          await enterDrip({ timelineBucket: values.timeline })
        } catch (err) {
          // Non-fatal: rapid-qualify succeeded; drip entry can be retried.
          toast.warning("Qualification saved, but drip entry failed — retry from the Drip tab")
        }
      }
      setLastRoute(values.routeSelection)
      setSubmitSuccess(true)
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
            {lastRoute === "drip"
              ? "Lead has been added to the drip queue."
              : `${lastRoute === "online-meeting" ? "Online" : "Physical"} meeting to be scheduled.`}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSubmitSuccess(false)
              reset(rapidQualificationDefaults)
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
            <CardTitle className="text-base">Rapid Qualification</CardTitle>
            <CardDescription className="text-xs">
              {lead ? `Qualifying: ${lead.name}` : "Qualify lead for next steps"}
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
                      {DENTIST_TYPES.map((t) => <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>)}
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
                      {PRACTICE_TYPES.map((t) => <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>)}
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
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
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
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select budget range" /></SelectTrigger>
                  <SelectContent>
                    {BUDGET_RANGES.map((r) => <SelectItem key={r} value={r} className="text-sm">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Next Step Route</Label>
            <Controller
              control={control}
              name="routeSelection"
              render={({ field }) => (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ROUTE_OPTIONS.map((route) => {
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
