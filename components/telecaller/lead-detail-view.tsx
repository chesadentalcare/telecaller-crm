"use client"

import { useState } from "react"
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PhoneCall,
  PhoneOff,
  MessageSquare,
  Video,
  MapPinned,
  Timer,
  User,
  Building2,
  Wallet,
  Banknote,
  Target,
  Stethoscope,
  Upload,
  Send,
  ChevronRight,
  Inbox,
  History,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { NoResponseBanner } from "./no-response-banner"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  fullQualificationSchema,
  fullQualificationDefaults,
  type FullQualificationValues,
} from "@/lib/schemas/full-qualification"
import {
  callAttemptSchema,
  callAttemptDefaults,
  type CallAttemptValues,
  type CallOutcome,
} from "@/lib/schemas/call-attempt"
import {
  zoomMeetingSchema,
  zoomMeetingDefaults,
  type ZoomMeetingValues,
} from "@/lib/schemas/zoom-meeting"
import {
  physicalMeetingSchema,
  physicalMeetingDefaults,
  type PhysicalMeetingValues,
} from "@/lib/schemas/physical-meeting"

// ─── Mock data — replace with real fetch when backend lands ─────────────
type CallAttempt = {
  id: string
  attemptedAt: Date
  attemptNumber: number
  outcome:
    | "no_response"
    | "wrong_number"
    | "not_interested"
    | "call_back_requested"
    | "engaged"
    | "replied"
  notes?: string
  attemptedBy: string
}

type LeadDetail = {
  id: string
  name: string
  phone: string
  whatsappNumber?: string  // Only set if different from `phone`
  email?: string
  city: string
  equipment: string
  source: string
  stage: string
  status: "new" | "contacted" | "qualified" | "meeting-scheduled" | "drip" | "dormant"
  createdAt: Date
  lastActivityAt: Date
  idleDays: number
  // Rapid qual
  rapidQualified: boolean
  phoneVerified: boolean
  dentistType?: string
  practiceType?: string
  timelineBucket?: string
  budgetRange?: string
  firstCallRoute?: "online_meeting" | "physical_meeting" | "drip_info" | "pending"
  // Full qual
  decisionMaker?: string
  competitors?: string
  fundingMethod?: string
  // Drip
  inDrip: boolean
  dripTrack?: "1_month" | "3_month" | "6_plus_month"
  dripMessageIndex?: number
  dripTotalMessages?: number
  dripNextMessageAt?: Date
  // Attempts
  attempts: CallAttempt[]
}

const mockLead: LeadDetail = {
  id: "L-2026-0142",
  name: "Dr. Suresh Verma",
  phone: "9876543210",
  whatsappNumber: "9123456780",   // Different WhatsApp number example
  email: "dr.suresh@example.com",
  city: "Mumbai",
  equipment: "X-Ray Imaging Unit",
  source: "IndiaMART",
  stage: "Qualification",
  status: "contacted",
  createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  lastActivityAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
  idleDays: 16,
  rapidQualified: true,
  phoneVerified: true,
  dentistType: "general_practitioner",
  practiceType: "solo_practice",
  timelineBucket: "1-3 months",
  budgetRange: "10-25L",
  firstCallRoute: "physical_meeting",
  decisionMaker: "Self",
  competitors: "Carestream, Vatech",
  fundingMethod: "loan",
  inDrip: false,
  attempts: [
    {
      id: "a1",
      attemptedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      attemptNumber: 1,
      outcome: "engaged",
      notes: "Discussed equipment specs, wants demo",
      attemptedBy: "Pappu Yadav",
    },
    {
      id: "a2",
      attemptedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      attemptNumber: 2,
      outcome: "call_back_requested",
      notes: "Asked to call back next week",
      attemptedBy: "Pappu Yadav",
    },
  ],
}

interface LeadDetailViewProps {
  leadId?: string
  onBack: () => void
}

export function LeadDetailView({ leadId, onBack }: LeadDetailViewProps) {
  // In a real app, fetch lead by leadId. For now, always show the mock.
  const lead = mockLead

  // Count failed call attempts (no_response only) — drives the recovery banner.
  const noResponseCount = lead.attempts.filter((a) => a.outcome === "no_response").length
  const lastAttemptTime = lead.attempts.length > 0
    ? lead.attempts[lead.attempts.length - 1].attemptedAt
    : new Date()

  return (
    <div className="space-y-4">
      {/* Header */}
      <LeadDetailHeader lead={lead} onBack={onBack} />

      {/* Idle warning — Gap #9 */}
      {lead.idleDays >= 14 && (
        <Alert className="border-warning/30 bg-warning/5">
          <AlertTriangle className="size-4 text-warning" />
          <AlertTitle className="text-sm">Idle lead — {lead.idleDays} days without activity</AlertTitle>
          <AlertDescription className="text-xs">
            This lead has had no recorded interaction for over 14 days. Consider logging a
            new call attempt or sending a WhatsApp follow-up.
          </AlertDescription>
        </Alert>
      )}

      {/* NoResponseRecoveryBanner — appears at attempt 4 per spec §8 Day 3 */}
      {noResponseCount >= 4 && (
        <NoResponseBanner
          leadName={lead.name}
          leadPhone={lead.phone}
          failedAttempts={noResponseCount}
          lastAttemptTime={lastAttemptTime}
          onSendWhatsApp={() => toast.success("Recovery WhatsApp sent — 60-day dormant clock started")}
          onDismiss={() => toast.info("Recovery banner dismissed")}
        />
      )}

      {/* Tabs — horizontally scrollable on mobile so all 5 stay readable
          instead of wrapping to an uneven 3+2 grid. Snap to grid on sm+. */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex w-full overflow-x-auto sm:grid sm:grid-cols-5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="overview"      className="shrink-0 text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="calls"         className="shrink-0 text-xs sm:text-sm">Calls</TabsTrigger>
          <TabsTrigger value="qualification" className="shrink-0 text-xs sm:text-sm">Qualification</TabsTrigger>
          <TabsTrigger value="drip"          className="shrink-0 text-xs sm:text-sm">Drip</TabsTrigger>
          <TabsTrigger value="meetings"      className="shrink-0 text-xs sm:text-sm">Meetings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab lead={lead} />
        </TabsContent>

        <TabsContent value="calls" className="mt-4">
          <CallsTab lead={lead} />
        </TabsContent>

        <TabsContent value="qualification" className="mt-4">
          <QualificationTab lead={lead} />
        </TabsContent>

        <TabsContent value="drip" className="mt-4">
          <DripTab lead={lead} />
        </TabsContent>

        <TabsContent value="meetings" className="mt-4">
          <MeetingsTab lead={lead} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Header ────────────────────────────────────────────────────────────
function LeadDetailHeader({ lead, onBack }: { lead: LeadDetail; onBack: () => void }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0" aria-label="Back">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center justify-center size-12 rounded-full bg-primary/10 text-primary font-semibold text-base shrink-0">
              {lead.name.split(" ").slice(-2).map((n) => n[0]).join("")}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate">{lead.name}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Phone className="size-3" />
                  {lead.phone}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {lead.city}
                </span>
                <span className="flex items-center gap-1">
                  <Inbox className="size-3" />
                  {lead.equipment}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[10px]">{lead.stage}</Badge>
                <Badge variant="outline" className="text-[10px] bg-primary/5">Source: {lead.source}</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground">
              <Phone className="size-3.5" />
              Call
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5">
              <MessageSquare className="size-3.5" />
              WhatsApp
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Overview Tab ──────────────────────────────────────────────────────
function OverviewTab({ lead }: { lead: LeadDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Lead Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow icon={User} label="Name" value={lead.name} />
          <InfoRow icon={Phone} label="Mobile" value={lead.phone} />
          {lead.whatsappNumber && lead.whatsappNumber !== lead.phone && (
            <InfoRow icon={MessageSquare} label="WhatsApp" value={lead.whatsappNumber} />
          )}
          {lead.email && <InfoRow icon={Mail} label="Email" value={lead.email} />}
          <InfoRow icon={MapPin} label="City" value={lead.city} />
          <InfoRow icon={Inbox} label="Equipment" value={lead.equipment} />
          <InfoRow icon={Target} label="Source" value={lead.source} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow icon={ChevronRight} label="Stage" value={lead.stage} />
          <InfoRow icon={Calendar} label="Created" value={lead.createdAt.toLocaleDateString()} />
          <InfoRow icon={Clock} label="Last activity" value={`${lead.idleDays} days ago`} />
          {lead.firstCallRoute && (
            <InfoRow
              icon={ChevronRight}
              label="Next route"
              value={lead.firstCallRoute.replace("_", " ")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2.5 text-foreground">
      <Icon className="size-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-sm font-medium truncate">{value}</span>
    </div>
  )
}

// Outcome metadata. Lives at module scope so the History list (rendered from
// `lead.attempts`) can look up labels/icons by enum key without going through
// the form's state.
const OUTCOME_CONFIG: Record<CallOutcome, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  no_response:         { label: "No response",         color: "text-muted-foreground", icon: PhoneOff },
  wrong_number:        { label: "Wrong number",        color: "text-destructive",      icon: XCircle },
  not_interested:      { label: "Not interested",      color: "text-destructive",      icon: XCircle },
  call_back_requested: { label: "Call back requested", color: "text-warning",          icon: Clock },
  engaged:             { label: "Engaged",             color: "text-success",          icon: CheckCircle2 },
  replied:             { label: "Replied (WhatsApp)",  color: "text-success",          icon: MessageSquare },
}

// ─── Calls Tab — Gap #2: Call Attempt Logger ───────────────────────────
function CallsTab({ lead }: { lead: LeadDetail }) {
  const { control, handleSubmit, reset, formState } = useForm<CallAttemptValues>({
    resolver: zodResolver(callAttemptSchema),
    // Cast: "" doesn't satisfy the enum, but RHF needs concrete defaults to
    // register the Select. zod catches the empty value on submit.
    defaultValues: { ...callAttemptDefaults, outcome: "" as CallOutcome },
    mode: "onChange",
  })
  const { errors, isSubmitting } = formState

  const onSubmit = async (_values: CallAttemptValues) => {
    // Real impl: POST to /api/telecaller/leads/:id/attempt via a mutation.
    toast.success("Call attempt logged")
    reset({ ...callAttemptDefaults, outcome: "" as CallOutcome })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <PhoneCall className="size-4 text-primary" />
            Log Call Attempt
          </CardTitle>
          <CardDescription className="text-xs">
            Attempt #{lead.attempts.length + 1} for this lead
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <Controller
              control={control}
              name="outcome"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">Outcome</Label>
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(OUTCOME_CONFIG) as [CallOutcome, typeof OUTCOME_CONFIG[CallOutcome]][]).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.outcome && <p className="text-[11px] text-destructive">{errors.outcome.message}</p>}
                </div>
              )}
            />
            <Controller
              control={control}
              name="notes"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    {...field}
                    placeholder="Discussion notes, follow-up time, key points..."
                    rows={3}
                  />
                </div>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5">
                <Send className="size-3.5" />
                Log Attempt
              </Button>
            </div>
          </form>

          {lead.attempts.length + 1 >= 4 && (
            <Alert className="border-warning/30 bg-warning/5">
              <AlertTriangle className="size-4 text-warning" />
              <AlertDescription className="text-xs">
                This is attempt #{lead.attempts.length + 1}. If unsuccessful, the lead enters WhatsApp recovery and starts the 60-day dormant clock.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            Call History
            <Badge variant="outline" className="ml-auto text-[10px]">
              {lead.attempts.length} attempts
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lead.attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No attempts logged yet</p>
          ) : (
            <ol className="space-y-3">
              {lead.attempts.map((a) => {
                const cfg = OUTCOME_CONFIG[a.outcome as CallOutcome]
                const Icon = cfg.icon
                return (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={cn("flex size-7 items-center justify-center rounded-full bg-muted", cfg.color)}>
                        <Icon className="size-3.5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-medium">Attempt #{a.attemptNumber}</span>
                        <span className={cn("text-xs", cfg.color)}>· {cfg.label}</span>
                        <span className="text-xs text-muted-foreground">
                          · {a.attemptedAt.toLocaleDateString()} by {a.attemptedBy}
                        </span>
                      </div>
                      {a.notes && <p className="text-xs text-muted-foreground mt-1">{a.notes}</p>}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Qualification Tab — Gap #3: Full Qualification + Gap #10 Route Action ─
function QualificationTab({ lead }: { lead: LeadDetail }) {
  const [editOpen, setEditOpen] = useState(false)

  // Phase 2 (Full) field completeness
  const fullQualFields = [
    { key: "decisionMaker", label: "Decision Maker", value: lead.decisionMaker },
    { key: "timelineBucket", label: "Timeline (ClosingDate)", value: lead.timelineBucket },
    { key: "budgetRange", label: "Budget Range", value: lead.budgetRange },
    { key: "competitors", label: "Competitors Considering", value: lead.competitors },
    { key: "fundingMethod", label: "Funding Method", value: lead.fundingMethod },
    { key: "dentistType", label: "Dentist + Practice Type", value: lead.dentistType && lead.practiceType ? `${lead.dentistType} · ${lead.practiceType}` : undefined },
  ]
  const completed = fullQualFields.filter((f) => !!f.value).length
  const isFullQualified = completed === fullQualFields.length

  return (
    <div className="space-y-4">
      {/* Rapid Qualification summary (Phase 1) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">Rapid Qualification (Phase 1)</CardTitle>
            <Badge variant="outline" className={cn("text-[10px]", lead.rapidQualified ? "bg-success/10 text-success border-success/30" : "")}>
              {lead.rapidQualified ? "Completed" : "Pending"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <RapidField label="Phone verified" value={lead.phoneVerified ? "Yes" : "No"} />
          <RapidField label="Dentist type" value={lead.dentistType ?? "—"} />
          <RapidField label="Practice type" value={lead.practiceType ?? "—"} />
          <RapidField label="Timeline" value={lead.timelineBucket ?? "—"} />
          <RapidField label="Budget" value={lead.budgetRange ?? "—"} />
          <RapidField label="Route" value={lead.firstCallRoute?.replace("_", " ") ?? "—"} />
        </CardContent>
      </Card>

      {/* Gap #10 — Route next action */}
      {lead.firstCallRoute && lead.firstCallRoute !== "pending" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ChevronRight className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Next Action</p>
                <p className="text-xs text-muted-foreground">
                  {lead.firstCallRoute === "online_meeting" && "Schedule a Zoom meeting with the designer"}
                  {lead.firstCallRoute === "physical_meeting" && "Schedule a physical meeting (will hand off to sales)"}
                  {lead.firstCallRoute === "drip_info" && "Enter this lead into the nurture drip sequence"}
                </p>
              </div>
            </div>
            <Button size="sm" className="gap-1.5">
              {lead.firstCallRoute === "online_meeting" && (<><Video className="size-3.5" /> Schedule Zoom</>)}
              {lead.firstCallRoute === "physical_meeting" && (<><MapPinned className="size-3.5" /> Schedule Physical</>)}
              {lead.firstCallRoute === "drip_info" && (<><Timer className="size-3.5" /> Enter Drip</>)}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Full Qualification (Phase 2) — Gap #3 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">Full Qualification (Phase 2)</CardTitle>
            <Badge variant="outline" className={cn("text-[10px]", isFullQualified ? "bg-success/10 text-success border-success/30" : "")}>
              {completed} / {fullQualFields.length} fields
            </Badge>
          </div>
          <CardDescription className="text-xs">
            All 6 fields required before scheduling a physical meeting (qualification gate).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {fullQualFields.map((f) => (
            <FullQualRow key={f.key} label={f.label} value={f.value} />
          ))}
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
              <CheckCircle2 className="size-3.5" />
              {isFullQualified ? "Edit Fields" : "Complete Missing Fields"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <FullQualificationDialog open={editOpen} onOpenChange={setEditOpen} lead={lead} />
    </div>
  )
}

// Full Qualification edit dialog — Gap B + Timeline editing (Gap C)
function FullQualificationDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  lead: LeadDetail
}) {
  const { control, handleSubmit, reset, formState } = useForm<FullQualificationValues>({
    resolver: zodResolver(fullQualificationSchema),
    defaultValues: {
      ...fullQualificationDefaults,
      decisionMaker: lead.decisionMaker ?? "",
      timelineBucket: lead.timelineBucket ?? "",
      budgetRange: lead.budgetRange ?? "",
      competitors: lead.competitors ?? "",
      fundingMethod: lead.fundingMethod ?? "",
      dentistType: lead.dentistType ?? "",
      practiceType: lead.practiceType ?? "",
    },
    mode: "onChange",
  })
  const { errors, isSubmitting } = formState

  const onSubmit = async (_values: FullQualificationValues) => {
    // Real save will mutate via TanStack Query — for now just acknowledge.
    toast.success("Full qualification saved — physical meeting gate unlocked")
    onOpenChange(false)
    // Reset back to fresh defaults so reopening the dialog doesn't show
    // stale values after a server round-trip.
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Full Qualification (Phase 2)</DialogTitle>
          <DialogDescription>
            All 6 fields are required before scheduling a physical meeting. Telecaller can move the timeline in any direction.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-3 py-2">
            <Controller
              control={control}
              name="decisionMaker"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">Decision Maker</Label>
                  <Input {...field} placeholder="Self / Partner / Spouse / Practice Manager" />
                  {errors.decisionMaker && <p className="text-[11px] text-destructive">{errors.decisionMaker.message}</p>}
                </div>
              )}
            />

            <Controller
              control={control}
              name="timelineBucket"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">Timeline / Closing Date</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate (this month)</SelectItem>
                      <SelectItem value="1-3 months">1-3 months</SelectItem>
                      <SelectItem value="3-6 months">3-6 months</SelectItem>
                      <SelectItem value="6_plus_month">6+ months</SelectItem>
                      <SelectItem value="just_exploring">Just exploring</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Writes to SAP <code>OOPR.ClosingDate</code>. Telecaller can move any direction.
                  </p>
                  {errors.timelineBucket && <p className="text-[11px] text-destructive">{errors.timelineBucket.message}</p>}
                </div>
              )}
            />

            <Controller
              control={control}
              name="budgetRange"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">Budget Range</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select budget" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<5L">Under ₹5L</SelectItem>
                      <SelectItem value="5-10L">₹5L - ₹10L</SelectItem>
                      <SelectItem value="10-25L">₹10L - ₹25L</SelectItem>
                      <SelectItem value="25L+">₹25L+</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.budgetRange && <p className="text-[11px] text-destructive">{errors.budgetRange.message}</p>}
                </div>
              )}
            />

            <Controller
              control={control}
              name="competitors"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">Competitors being considered</Label>
                  <Input {...field} placeholder="e.g., Carestream, Vatech, Planmeca" />
                  <p className="text-[10px] text-muted-foreground">
                    Writes to SAP <code>OPR3 Competitors</code>.
                  </p>
                  {errors.competitors && <p className="text-[11px] text-destructive">{errors.competitors.message}</p>}
                </div>
              )}
            />

            <Controller
              control={control}
              name="fundingMethod"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">Funding Method</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select funding" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="loan">Loan</SelectItem>
                      <SelectItem value="not_sure">Not sure yet</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.fundingMethod && <p className="text-[11px] text-destructive">{errors.fundingMethod.message}</p>}
                </div>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Controller
                control={control}
                name="dentistType"
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dentist Type</Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general_practitioner">General Practitioner</SelectItem>
                        <SelectItem value="orthodontist">Orthodontist</SelectItem>
                        <SelectItem value="endodontist">Endodontist</SelectItem>
                        <SelectItem value="prosthodontist_implantologist">Prosthodontist / Implantologist</SelectItem>
                        <SelectItem value="oral_maxillofacial_surgeon">Oral/Maxillofacial Surgeon</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.dentistType && <p className="text-[11px] text-destructive">{errors.dentistType.message}</p>}
                  </div>
                )}
              />

              <Controller
                control={control}
                name="practiceType"
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Practice Type</Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solo_practice">Solo Practice</SelectItem>
                        <SelectItem value="group_clinic">Group Clinic</SelectItem>
                        <SelectItem value="multi_specialty_clinic">Multi-Specialty Clinic</SelectItem>
                        <SelectItem value="chain_corporate">Chain / Corporate</SelectItem>
                        <SelectItem value="hospital_or_academic">Hospital / Academic</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.practiceType && <p className="text-[11px] text-destructive">{errors.practiceType.message}</p>}
                  </div>
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>Save Qualification</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RapidField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2">
      <span className="text-xs text-muted-foreground truncate">{label}</span>
      <span className="text-xs font-medium truncate">{value}</span>
    </div>
  )
}

function FullQualRow({ label, value }: { label: string; value?: string }) {
  const isFilled = !!value
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5">
      {isFilled ? (
        <CheckCircle2 className="size-4 text-success shrink-0" />
      ) : (
        <div className="size-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{value ?? "Not captured yet"}</p>
      </div>
    </div>
  )
}

// ─── Drip Tab — Gap #6: DripStateBadge + Gap #7: Manual Exit ───────────
function DripTab({ lead }: { lead: LeadDetail }) {
  const [exitOpen, setExitOpen] = useState(false)
  const [exitReason, setExitReason] = useState("")

  const handleExit = () => {
    if (!exitReason) {
      toast.error("Please select a reason")
      return
    }
    toast.success("Lead exited from drip")
    setExitOpen(false)
    setExitReason("")
  }

  if (!lead.inDrip) {
    return (
      <Card>
        <CardContent className="text-center py-12 space-y-3">
          <Timer className="size-10 text-muted-foreground/40 mx-auto" />
          <div>
            <p className="text-sm font-medium">Not in a drip sequence</p>
            <p className="text-xs text-muted-foreground mt-1">
              Enter this lead into a drip track from the Qualification tab or Rapid Qualification flow.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const trackLabels: Record<string, string> = {
    "1_month": "1-Month Track",
    "3_month": "3-Month Track",
    "6_plus_month": "6+ Month Track",
  }

  const progress = lead.dripMessageIndex && lead.dripTotalMessages
    ? Math.round((lead.dripMessageIndex / lead.dripTotalMessages) * 100)
    : 0

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Timer className="size-4 text-amber-500" />
              {trackLabels[lead.dripTrack!]}
            </CardTitle>
            <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[10px]">
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">Message {lead.dripMessageIndex} of {lead.dripTotalMessages}</span>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {lead.dripNextMessageAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              Next message: {lead.dripNextMessageAt.toLocaleString()}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Dialog open={exitOpen} onOpenChange={setExitOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <XCircle className="size-3.5" />
                  Manual Exit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Exit lead from drip</DialogTitle>
                  <DialogDescription>
                    Select a reason. The lead will be removed from the sequence and a record kept for audit.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <Label className="text-xs">Reason</Label>
                  <Select value={exitReason} onValueChange={setExitReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="replied">Replied — re-enter qualification</SelectItem>
                      <SelectItem value="meeting_booked">Meeting booked via CTA</SelectItem>
                      <SelectItem value="opted_out">Opted out</SelectItem>
                      <SelectItem value="purchased_elsewhere">Purchased elsewhere</SelectItem>
                      <SelectItem value="wrong_lead">Wrong lead / spam</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setExitOpen(false)}>Cancel</Button>
                  <Button onClick={handleExit}>Confirm Exit</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Meetings Tab — Gap #4 Zoom Form + Gap #5 Physical Meeting + Handoff ──
function MeetingsTab({ lead }: { lead: LeadDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ZoomMeetingCard lead={lead} />
      <PhysicalMeetingCard lead={lead} />
    </div>
  )
}

// ── Gap #4: Zoom Meeting Form ──────────────────────────────────────────
// `open` is UI state (dialog open/closed), not form state — kept as useState.
// Everything that is form state goes through useForm + zod.
function ZoomMeetingCard({ lead: _lead }: { lead: LeadDetail }) {
  const [open, setOpen] = useState(false)

  const { control, handleSubmit, reset, watch, formState } = useForm<ZoomMeetingValues>({
    resolver: zodResolver(zoomMeetingSchema),
    defaultValues: zoomMeetingDefaults,
    mode: "onChange",
  })
  const { errors, isSubmitting } = formState
  const designFeeStatus = watch("designFeeStatus")

  const onSubmit = async (_values: ZoomMeetingValues) => {
    toast.success("Zoom meeting saved")
    setOpen(false)
    reset(zoomMeetingDefaults)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Video className="size-4 text-violet-500" />
          Zoom Meeting (with designer)
        </CardTitle>
        <CardDescription className="text-xs">
          Online layout review + design fee discussion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full gap-1.5">
              <Video className="size-3.5" />
              Schedule Zoom Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Zoom Meeting</DialogTitle>
              <DialogDescription>
                Capture meeting details and design fee outcome with the designer.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-3 py-2">
                <Controller
                  control={control}
                  name="meetingAt"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Meeting date &amp; time</Label>
                      <Input type="datetime-local" {...field} />
                      {errors.meetingAt && <p className="text-[11px] text-destructive">{errors.meetingAt.message}</p>}
                    </div>
                  )}
                />

                <Controller
                  control={control}
                  name="layoutShared"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Layout shared with designer?</Label>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes — clinic floor plan shared</SelectItem>
                          <SelectItem value="no">No — to share later</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.layoutShared && <p className="text-[11px] text-destructive">{errors.layoutShared.message}</p>}
                    </div>
                  )}
                />

                <Controller
                  control={control}
                  name="designFeeStatus"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Design fee outcome</Label>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="discussed">Discussed — pending decision</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="declined">Declined</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.designFeeStatus && <p className="text-[11px] text-destructive">{errors.designFeeStatus.message}</p>}
                    </div>
                  )}
                />

                {designFeeStatus === "paid" && (
                  <Controller
                    control={control}
                    name="paymentProof"
                    render={({ field: { onChange, value } }) => (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Payment proof</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                            className="text-xs"
                          />
                          {value && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              <Upload className="size-3 mr-1" />
                              {value.name}
                            </Badge>
                          )}
                        </div>
                        {errors.paymentProof && <p className="text-[11px] text-destructive">{errors.paymentProof.message}</p>}
                      </div>
                    )}
                  />
                )}

                <Controller
                  control={control}
                  name="notes"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Notes (optional)</Label>
                      <Textarea
                        {...field}
                        placeholder="Designer remarks, customer concerns, next steps..."
                        rows={2}
                      />
                    </div>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>Save Meeting</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// ── Gap #5: Schedule Physical Meeting + Handoff Confirmation ───────────
// `scheduleOpen`/`handoffOpen` are dialog UI state. `assignedSalesperson` is
// post-submit result state. None of those are form state — only meetingAt and
// location go through RHF.
const MOCK_SALESPEOPLE = ["Ravi Kumar", "Anita Verma", "Jagjit Singh"] as const

function PhysicalMeetingCard({ lead }: { lead: LeadDetail }) {
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [assignedSalesperson, setAssignedSalesperson] = useState<string | null>(null)

  const { control, handleSubmit, reset, getValues, formState } = useForm<PhysicalMeetingValues>({
    resolver: zodResolver(physicalMeetingSchema),
    defaultValues: physicalMeetingDefaults,
    mode: "onChange",
  })
  const { errors, isSubmitting } = formState

  // Full-qual gate (per §8 Day 5 — qualificationGate middleware)
  const fullQualFields = [lead.decisionMaker, lead.timelineBucket, lead.budgetRange, lead.competitors, lead.fundingMethod, lead.dentistType && lead.practiceType]
  const isFullyQualified = fullQualFields.every((v) => !!v)

  const onSubmit = async (_values: PhysicalMeetingValues) => {
    // Mock round-robin assignment — real impl is round-robin/territory.
    // Backend will fire lead.handoff_to_sales event here.
    const picked = MOCK_SALESPEOPLE[Math.floor(Math.random() * MOCK_SALESPEOPLE.length)]
    setAssignedSalesperson(picked)
    setScheduleOpen(false)
    setHandoffOpen(true)
  }

  // Read meetingAt/location for the handoff confirmation card after submit.
  // getValues() reads the latest submitted values without forcing a watch.
  const submittedMeetingAt = getValues("meetingAt")
  const submittedLocation = getValues("location")

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPinned className="size-4 text-blue-500" />
          Physical Meeting (handoff)
        </CardTitle>
        <CardDescription className="text-xs">
          Scheduling a physical meeting hands the lead off to a salesperson.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {!isFullyQualified && (
          <Alert className="border-warning/30 bg-warning/5">
            <AlertTriangle className="size-4 text-warning" />
            <AlertDescription className="text-xs">
              Full Qualification (6 fields) must be complete before scheduling. Visit the Qualification tab.
            </AlertDescription>
          </Alert>
        )}
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="w-full gap-1.5"
              variant="outline"
              disabled={!isFullyQualified}
            >
              <MapPinned className="size-3.5" />
              Schedule Physical Meeting
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Physical Meeting</DialogTitle>
              <DialogDescription>
                Submitting this transfers lead ownership to the assigned salesperson.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-3 py-2">
                <Controller
                  control={control}
                  name="meetingAt"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Date &amp; time</Label>
                      <Input type="datetime-local" {...field} />
                      {errors.meetingAt && <p className="text-[11px] text-destructive">{errors.meetingAt.message}</p>}
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="location"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Location</Label>
                      <Input {...field} placeholder="Clinic address or city" />
                      {errors.location && <p className="text-[11px] text-destructive">{errors.location.message}</p>}
                    </div>
                  )}
                />
                <Alert className="bg-primary/5 border-primary/30">
                  <AlertTriangle className="size-4 text-primary" />
                  <AlertDescription className="text-xs">
                    Confirming will fire <code className="text-[10px]">lead.handoff_to_sales</code> and
                    reassign this lead to a salesperson via round-robin.
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>Confirm &amp; Hand Off</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Handoff confirmation modal */}
        <Dialog open={handoffOpen} onOpenChange={setHandoffOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-success" />
                Handoff Confirmed
              </DialogTitle>
              <DialogDescription>
                Lead transferred to sales. They'll take it from the physical meeting onward.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-sm">
              <div className="rounded-md border bg-card p-3 space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Lead</span><span className="font-medium">{lead.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Meeting at</span><span className="font-medium">{submittedMeetingAt ? new Date(submittedMeetingAt).toLocaleString() : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium truncate ml-2">{submittedLocation}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Assigned to</span><Badge className="text-[10px]">{assignedSalesperson}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Stage</span><Badge variant="outline" className="text-[10px]">Physical Meeting Scheduled</Badge></div>
              </div>
              <p className="text-xs text-muted-foreground">
                Event <code className="text-[10px]">lead.handoff_to_sales</code> dispatched. The salesperson has been notified.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => { setHandoffOpen(false); reset(physicalMeetingDefaults) }}>Got it</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
