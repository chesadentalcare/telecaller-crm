"use client"

import { useState, useMemo } from "react"
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
  Lock,
  ShieldCheck,
  ArrowRightLeft,
  Briefcase,
  Pencil,
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
import { QuotationListCard } from "./quotation-builder"
import { FollowUpListCard } from "./follow-up-list"
import { ClosureCard } from "./closure-form"
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
  CALL_OUTCOMES,
  type CallAttemptValues,
  type CallOutcome,
} from "@/lib/schemas/call-attempt"
import { callLogState, firstEditConflict } from "@/lib/call-log-state"
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
import { useLeadFullDetail, useMeetingSlaStatus, useSalesUsers } from "@/hooks/use-leads"
import {
  useLogAttempt,
  useEditAttempt,
  useFullQualify,
  useZoomMeeting,
  usePhysicalMeeting,
  useExitDrip,
  useRecoveryWhatsapp,
  useVerifyPhone,
  useUploadMeetingSummary,
  useConfirmDecisionTimeline,
  useUpdateTimeline,
  useHandBackLead,
  useHandover,
} from "@/hooks/use-lead-mutations"
import { ApiError } from "@/lib/api/client"
import { useRole } from "@/hooks/use-role"
import { useProducts } from "@/hooks/use-products"
import type { LeadDetail as ApiLeadDetail } from "@/lib/api/leads"

// Some backend errors (e.g. the SAP CheckSession 500) return a body with no
// `message` key, so ApiError.message falls back to the bare statusText
// ("Internal Server Error"). Prefer the richer `details`/`error` fields when
// present so the toast is actionable instead of generic.
function readApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const p = err.payload
    if (p && typeof p === "object") {
      const rec = p as Record<string, unknown>
      const detail = rec.message || rec.details || rec.error
      if (typeof detail === "string" && detail.trim()) return detail
    }
    if (err.message && err.message !== "Internal Server Error") return err.message
  }
  return fallback
}

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
  /** Set when this attempt was corrected after the fact (audit marker). */
  edited?: boolean
}

type LeadDetail = {
  id: string
  name: string
  phone: string
  whatsappNumber?: string  // Only set if different from `phone`
  email?: string
  city: string
  state?: string
  pincode?: string
  address?: string
  equipment: string
  products?: string[]      // product ids the lead is interested in (resolved to names via useProducts)
  category?: string
  interestLevel?: string
  purchaseType?: string
  source: string
  stage: string
  status: "new" | "contacted" | "qualified" | "meeting-scheduled" | "drip" | "dormant"
  createdAt: Date
  lastActivityAt: Date
  idleDays: number
  // Customer (Phase 4)
  customerCardCode?: string
  customerName?: string
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
  // CRM lock (SOP §4B — quote SLA breach)
  crmLocked: boolean
  crmLockedReason?: string
  // Meetings (Phase 4 — for meeting linkage)
  latestPhysicalMeetingId?: number
  // Persisted Zoom meetings (join/host link + passcode survive reloads)
  zoomMeetings: ZoomMeetingSummary[]
  // Most recent recovery WhatsApp send (so the "sent" state persists past the toast)
  recoveryWhatsappSentAt?: Date
  // Attempts
  attempts: CallAttempt[]
  // Phase 6 — lifecycle / routing (all optional so the mock literal stays valid)
  archived?: boolean
  archiveReason?: string
  whatsappOptedOut?: boolean
  requalifyPending?: boolean
  requalifyReason?: string
  requalifyAt?: string
  wrongNumberAt?: string
  callbackAt?: string
  callbackRetryCount?: number
  lastInboundAt?: string
  inbound?: InboundReply[]
  firstContact?: { touchIndex: number; callAttemptsUsed: number; status: string }
}

type InboundReply = {
  id: number
  intent: "stop" | "meeting" | "zoom" | "vague"
  body: string
  receivedAt: Date
}

type ZoomMeetingSummary = {
  id: number
  meetingAt: string
  joinUrl: string | null
  startUrl: string | null
  passcode: string | null
}

// ─── Backend → UI mapper ────────────────────────────────────────────────
// The view's LeadDetail type is the rich, UI-friendly shape. The backend
// enriches extension with SAP BP data (phone, email, city, cardName) before
// returning — so these fields are real values, not placeholders.
function mapDetail(d: ApiLeadDetail): LeadDetail {
  const ext = d.extension
  const id = String(ext.opportunity_doc_entry)
  const lastActivity =
    d.attempts[0]?.attempted_at || d.meetings[0]?.meeting_at || ext.updated_at
  const idleDays = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86_400_000)

  // Find the latest physical meeting for quotation linkage
  const latestPhysicalMeeting = d.meetings.find((m) => m.meeting_type === "physical")

  // Zoom meetings carry the persisted join/host link + passcode columns.
  // Include ALL zoom meetings (even ones without a generated link) so the rep
  // sees the booking and a clear "no link" note instead of an empty tab.
  const zoomMeetings: ZoomMeetingSummary[] = d.meetings
    .filter((m) => m.meeting_type === "zoom")
    .map((m) => ({
      id: m.id,
      meetingAt: m.meeting_at,
      joinUrl: m.zoom_join_url,
      startUrl: m.zoom_start_url,
      passcode: m.zoom_passcode,
    }))

  // Latest recovery WhatsApp send — surfaces a durable "recovery sent" marker.
  const latestRecovery = d.whatsapp
    .filter((w) => w.message_type === "recovery")
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0]

  return {
    id,
    name: ext.customer_name || `Lead #${id}`,
    phone: ext.phone || "—",
    whatsappNumber: ext.phone2 || undefined,
    email: ext.email || undefined,
    city: ext.city || "—",
    state: ext.state ?? undefined,
    pincode: ext.pincode ?? undefined,
    address: ext.address ?? undefined,
    equipment: ext.equipment_interest ?? "—",
    products: [ext.product1_id, ext.product2_id].filter((p): p is string => !!p),
    category: ext.category ?? undefined,
    interestLevel: ext.interest_level ?? undefined,
    purchaseType: ext.purchase_type ?? undefined,
    source: ext.source || "—",
    stage: ext.stage,
    status: (
      ext.stage === "physical_meeting_scheduled" || ext.stage === "zoom_meeting_done"
        ? "meeting-scheduled"
        : ext.stage === "full_qualified" || ext.stage === "rapid_qualified"
          ? "qualified"
          : ext.dormant_since
            ? "dormant"
            : ext.stage === "new"
              ? "new"
              : "contacted"
    ) as LeadDetail["status"],
    createdAt: new Date(ext.created_at),
    lastActivityAt: new Date(lastActivity),
    idleDays,
    customerCardCode: ext.customer_card_code ?? undefined,
    customerName: ext.customer_name ?? undefined,
    rapidQualified: !!(ext.dentist_type && ext.practice_type),
    phoneVerified: !!ext.phone_verified,
    dentistType: ext.dentist_type ?? undefined,
    practiceType: ext.practice_type ?? undefined,
    timelineBucket: ext.timeline ?? undefined,
    budgetRange: ext.budget_range ?? undefined,
    firstCallRoute: ext.first_call_route,
    decisionMaker: ext.decision_maker ?? undefined,
    competitors: ext.competitor_evaluated ?? undefined,
    fundingMethod: ext.funding_method ?? undefined,
    inDrip: !!(d.drip && d.drip.status === "active"),
    dripTrack: d.drip?.track,
    dripMessageIndex: d.drip?.current_message_index,
    dripTotalMessages:
      d.drip?.track === "1_month" ? 9 : d.drip?.track === "3_month" ? 19 : 13,
    dripNextMessageAt: d.drip?.next_message_at ? new Date(d.drip.next_message_at) : undefined,
    crmLocked: !!ext.crm_locked,
    crmLockedReason: ext.crm_locked_reason ?? undefined,
    latestPhysicalMeetingId: latestPhysicalMeeting?.id,
    zoomMeetings,
    recoveryWhatsappSentAt: latestRecovery ? new Date(latestRecovery.sent_at) : undefined,
    attempts: d.attempts.map((a) => ({
      id: String(a.id),
      attemptedAt: new Date(a.attempted_at),
      attemptNumber: a.attempt_number,
      outcome: a.outcome,
      notes: a.notes ?? undefined,
      attemptedBy: a.attempted_by,
      edited: !!a.edited_at,
    })),
    // Phase 6 — lifecycle / routing fields
    archived: ext.stage === "archived" || !!ext.dormant_since,
    archiveReason: ext.archive_reason ?? undefined,
    whatsappOptedOut: !!ext.whatsapp_opted_out,
    requalifyPending: !!ext.requalify_pending,
    requalifyReason: ext.requalify_reason ?? undefined,
    requalifyAt: ext.requalify_at ?? undefined,
    wrongNumberAt: ext.wrong_number_at ?? undefined,
    callbackAt: ext.callback_at ?? undefined,
    callbackRetryCount: ext.callback_retry_count ?? 0,
    lastInboundAt: ext.last_inbound_at ?? undefined,
    inbound: (d.inbound ?? []).map((m) => ({
      id: m.id, intent: m.intent, body: m.body, receivedAt: new Date(m.received_at),
    })),
    firstContact: d.firstContact
      ? { touchIndex: d.firstContact.current_touch_index, callAttemptsUsed: d.firstContact.call_attempts_used, status: d.firstContact.status }
      : undefined,
  }
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
  crmLocked: false,
  inDrip: false,
  zoomMeetings: [],
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
  const { data: detail, isLoading, error } = useLeadFullDetail(leadId)
  // Active tab is controlled so the header "Call" quick-action can switch the
  // user straight to the Calls tab (dial → log) instead of being a dead button.
  const [activeTab, setActiveTab] = useState("overview")
  // Map backend payload → rich UI shape. useMemo so child tabs see stable
  // identity and don't re-render when sibling state changes.
  const lead: LeadDetail | null = useMemo(
    () => (detail ? mapDetail(detail) : null),
    [detail],
  )

  // Recovery WhatsApp mutation lives at the top-level so the banner button
  // can fire it before any tab is mounted. id-scoped hooks need an id, so we
  // pass leadId (falls back to "" — banner only renders once lead is loaded).
  const { mutateAsync: sendRecovery } = useRecoveryWhatsapp(leadId ?? "")

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  if (error || !lead) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {error instanceof ApiError && error.status === 404
            ? "Lead not found."
            : "Could not load this lead. Try again."}
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Count failed call attempts (no_response only) — drives the recovery banner.
  const noResponseCount = lead.attempts.filter((a) => a.outcome === "no_response").length
  const lastAttemptTime = lead.attempts.length > 0
    ? lead.attempts[lead.attempts.length - 1].attemptedAt
    : new Date()

  return (
    <div className="space-y-4">
      {/* Header */}
      <LeadDetailHeader lead={lead} onBack={onBack} onCall={() => setActiveTab("calls")} />

      {/* CRM Lock banner — SOP §4B: quote SLA breach locks all actions */}
      {lead.crmLocked && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <Lock className="size-4 text-destructive" />
          <AlertTitle className="text-sm text-destructive font-semibold">CRM Actions Locked</AlertTitle>
          <AlertDescription className="text-xs text-destructive/80">
            {lead.crmLockedReason || "Quotation SLA breached — all CRM actions are disabled until the overdue quotation is submitted."}
          </AlertDescription>
        </Alert>
      )}

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
          onSendWhatsApp={async () => {
            try {
              const res = await sendRecovery({
                phone: lead.phone,
                dentistName: lead.name,
                equipmentInterest: lead.equipment,
              })
              toast.success(
                res.dryRun
                  ? "Recovery WhatsApp queued (dry-run — see backend logs)"
                  : "Recovery WhatsApp sent — 60-day dormant clock started",
              )
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : "Failed to send recovery WhatsApp")
            }
          }}
          onDismiss={() => toast.info("Recovery banner dismissed")}
        />
      )}

      {/* Tabs — horizontally scrollable on mobile so all 5 stay readable
          instead of wrapping to an uneven 3+2 grid. Snap to grid on sm+. */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto sm:grid sm:grid-cols-5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="overview"      className="shrink-0 text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="calls"         className="shrink-0 text-xs sm:text-sm">Call Log</TabsTrigger>
          <TabsTrigger value="drip"          className="shrink-0 text-xs sm:text-sm">Drip</TabsTrigger>
          <TabsTrigger value="meetings"      className="shrink-0 text-xs sm:text-sm">Meetings</TabsTrigger>
          <TabsTrigger value="quotes"        className="shrink-0 text-xs sm:text-sm">Quotes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab lead={lead} />
        </TabsContent>

        <TabsContent value="calls" className="mt-4">
          <CallsTab lead={lead} onNavigate={setActiveTab} />
        </TabsContent>

        <TabsContent value="drip" className="mt-4">
          <DripTab lead={lead} />
        </TabsContent>

        <TabsContent value="meetings" className="mt-4">
          <MeetingsTab lead={lead} />
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <QuotesTab lead={lead} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Header ────────────────────────────────────────────────────────────
function LeadDetailHeader({
  lead,
  onBack,
  onCall,
}: {
  lead: LeadDetail
  onBack: () => void
  /** Called after the dialer opens so the parent can switch to the Calls tab. */
  onCall?: () => void
}) {
  const verifyPhone = useVerifyPhone(lead.id)

  const hasPhone = lead.phone !== "—"
  const waNumber = (lead.whatsappNumber || (hasPhone ? lead.phone : "")).replace(/\D/g, "")

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
                {lead.phoneVerified && (
                  <Badge className="text-[10px] gap-1 bg-success/10 text-success border-success/30">
                    <ShieldCheck className="size-3" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
              disabled={!hasPhone}
              onClick={() => {
                // Open the device dialer, then drop the user on the Calls tab so
                // they can log the outcome after the call (dial → log).
                window.location.href = `tel:${lead.phone.replace(/\D/g, "")}`
                onCall?.()
              }}
            >
              <Phone className="size-3.5" />
              Call
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={!waNumber}
              onClick={() => {
                if (!waNumber) {
                  toast.error("No WhatsApp number on this lead")
                  return
                }
                window.open(`https://wa.me/${waNumber}`, "_blank", "noopener,noreferrer")
              }}
            >
              <MessageSquare className="size-3.5" />
              WhatsApp
            </Button>
            {!lead.phoneVerified && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                onClick={() => verifyPhone.mutate(undefined, {
                  onSuccess: () => toast.success("Phone verified"),
                  onError: () => toast.error("Verification failed"),
                })}
                disabled={verifyPhone.isPending}
              >
                <ShieldCheck className="size-3.5" />
                {verifyPhone.isPending ? "Verifying…" : "Verify Phone"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Overview Tab ──────────────────────────────────────────────────────
function OverviewTab({ lead }: { lead: LeadDetail }) {
  const { data: products } = useProducts()
  // Stored interest is the product id; resolve to the friendly name shown in the
  // intake dropdown (falls back to the raw id while products load / on a miss).
  const productName = (id: string) => products.find((p) => String(p.id) === String(id))?.pname ?? id
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">{overviewCards(lead, productName)}</div>
      <LeadActionsCard lead={lead} />
    </div>
  )
}

function overviewCards(lead: LeadDetail, productName: (id: string) => string) {
  const digits = (s?: string) => (s || "").replace(/\D/g, "")
  const phoneDigits = digits(lead.phone !== "—" ? lead.phone : "")
  const waSource = lead.whatsappNumber || (lead.phone !== "—" ? lead.phone : "")
  const waDigits = digits(waSource)
  const titleCase = (s?: string) => (s ? s.replace(/_/g, " ") : undefined)

  return (
    <>
      {/* Contact — phone/whatsapp/email are tappable so the rep can act in one tap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow icon={User} label="Name" value={lead.name} />
          <InfoRow icon={Phone} label="Mobile" value={lead.phone}
            href={phoneDigits ? `tel:${phoneDigits}` : undefined} emptyText="No phone on file" />
          <InfoRow icon={MessageSquare} label="WhatsApp" value={waSource || undefined}
            href={waDigits ? `https://wa.me/${waDigits.length === 10 ? "91" + waDigits : waDigits}` : undefined} />
          <InfoRow icon={Mail} label="Email" value={lead.email}
            href={lead.email ? `mailto:${lead.email}` : undefined} />
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow icon={MapPinned} label="Address" value={lead.address} />
          <InfoRow icon={MapPin} label="City" value={lead.city} />
          <InfoRow icon={Building2} label="State" value={lead.state} />
          <InfoRow icon={MapPin} label="Pincode" value={lead.pincode} />
        </CardContent>
      </Card>

      {/* Interested In — what the lead is planning to buy (pushed to the SAP opportunity) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Interested In</CardTitle>
          <CardDescription className="text-xs">What this lead is planning to buy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow icon={Inbox} label="Equipment" value={lead.equipment} emptyText="Not specified yet" />
          <InfoRow icon={Target} label="Category" value={lead.category} />
          {lead.products && lead.products.length > 0 && (
            <div className="flex items-start gap-2.5">
              <Inbox className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-xs text-muted-foreground w-24 shrink-0">Products</span>
              <div className="flex flex-wrap gap-1">
                {lead.products.map((p) => (
                  <Badge key={p} variant="secondary" className="text-[10px] font-normal">{productName(p)}</Badge>
                ))}
              </div>
            </div>
          )}
          <InfoRow icon={AlertTriangle} label="Interest" value={titleCase(lead.interestLevel)} />
          <InfoRow icon={Wallet} label="Budget" value={titleCase(lead.budgetRange)} />
          <InfoRow icon={Timer} label="Timeline" value={titleCase(lead.timelineBucket)} />
          <InfoRow icon={Banknote} label="Purchase" value={titleCase(lead.purchaseType)} />
          <InfoRow icon={User} label="Decision maker" value={titleCase(lead.decisionMaker)} />
          <InfoRow icon={ChevronRight} label="Source" value={lead.source} />
        </CardContent>
      </Card>

      {/* Status */}
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
    </>
  )
}

// ── Update timeline (stage urgency) + Hand-back to telecaller ──────────────
// Both are real backend endpoints (PUT /leads/:id/timeline, POST
// /leads/:id/hand-back) that previously had no UI. Hand-back is role-gated to
// sales/manager/admin via useRole().canHandBack, mirroring the backend.
function LeadActionsCard({ lead }: { lead: LeadDetail }) {
  const { canHandBack, isSalesperson } = useRole()
  const [stage, setStage] = useState(lead.timelineBucket ?? "")
  const [handBackOpen, setHandBackOpen] = useState(false)
  const [handBackReason, setHandBackReason] = useState("")

  const { mutateAsync: updateTimeline, isPending: updatingTimeline } = useUpdateTimeline(lead.id)
  const { mutateAsync: handBack, isPending: handingBack } = useHandBackLead(lead.id)

  // Sales may only escalate urgency (shorter timeline), never downgrade — same
  // rule the backend enforces. Disable the lower-urgency options for sales.
  const currentUrgency = TIMELINE_OPTIONS.find((o) => o.value === lead.timelineBucket)?.urgency ?? 0

  const handleUpdateTimeline = async () => {
    if (!stage) {
      toast.error("Select a timeline first")
      return
    }
    try {
      await updateTimeline({ stage })
      toast.success("Timeline updated")
    } catch (err) {
      toast.error(readApiError(err, "Failed to update the timeline"))
    }
  }

  const handleHandBack = async () => {
    if (!handBackReason.trim()) {
      toast.error("Enter a reason")
      return
    }
    try {
      await handBack({ reason: handBackReason })
      toast.success("Lead handed back to telecaller")
      setHandBackOpen(false)
      setHandBackReason("")
    } catch (err) {
      toast.error(readApiError(err, "Failed to hand the lead back"))
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Lead Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Update timeline / closing-date urgency */}
        <div className="space-y-1.5">
          <Label className="text-xs">Update timeline (closing-date urgency)</Label>
          <div className="flex items-center gap-2">
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Select timeline" /></SelectTrigger>
              <SelectContent>
                {TIMELINE_OPTIONS.map((opt) => {
                  const blocked = isSalesperson && opt.urgency < currentUrgency
                  return (
                    <SelectItem key={opt.value} value={opt.value} disabled={blocked}>
                      {opt.label}{blocked ? " (cannot downgrade)" : ""}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              disabled={updatingTimeline || lead.crmLocked || !stage || stage === lead.timelineBucket}
              onClick={handleUpdateTimeline}
            >
              {updatingTimeline ? "Saving…" : "Update"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {isSalesperson
              ? "Sales can only escalate timeline urgency (shorter)."
              : "Telecaller/manager can move timeline in any direction."}
          </p>
        </div>

        {/* Hand back to telecaller — role-gated (sales/manager/admin) */}
        {canHandBack && (
          <div className="pt-1 border-t">
            <Dialog open={handBackOpen} onOpenChange={setHandBackOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5 mt-3">
                  <ArrowLeft className="size-3.5" />
                  Hand back to telecaller
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Hand lead back to telecaller</DialogTitle>
                  <DialogDescription>
                    The lead moves to the Reactivation queue. Give a reason for the audit trail.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <Label className="text-xs">Reason</Label>
                  <Textarea
                    value={handBackReason}
                    onChange={(e) => setHandBackReason(e.target.value)}
                    placeholder="e.g. Customer postponed purchase by 6 months"
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setHandBackOpen(false)}>Cancel</Button>
                  <Button onClick={handleHandBack} disabled={handingBack}>
                    {handingBack ? "Handing back…" : "Confirm Hand-back"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
  emptyText = "Not captured",
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string | null
  /** When set and value is present, renders the value as a link (tel:/mailto:/wa.me). */
  href?: string
  /** Muted placeholder shown when the value is missing. */
  emptyText?: string
}) {
  const isEmpty = !value || value === "—"
  const external = href?.startsWith("http")
  return (
    <div className="flex items-center gap-2.5 text-foreground">
      <Icon className="size-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      {isEmpty ? (
        <span className="text-sm italic text-muted-foreground/60 truncate">{emptyText}</span>
      ) : href ? (
        <a
          href={href}
          className="text-sm font-medium text-primary hover:underline truncate"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {value}
        </a>
      ) : (
        <span className="text-sm font-medium truncate">{value}</span>
      )}
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

// ─── Call Log Tab — Gap #2 (Call Attempt Logger) + integrated Qualification ─
function CallsTab({
  lead,
  onNavigate,
}: {
  lead: LeadDetail
  /** Switch the parent's active tab (used by the route Next-Action CTA). */
  onNavigate?: (tab: string) => void
}) {
  const { mutateAsync: logAttempt } = useLogAttempt(lead.id)
  const [editTarget, setEditTarget] = useState<CallAttempt | null>(null)

  // Smart Call Log — derive the disposition state from the chronological call
  // history. attemptNumber >= 1 excludes system rows (whatsapp_recovery carries
  // attemptNumber 0). The state machine decides which outcomes are selectable
  // next (and whether calling is locked after a wrong number).
  const callAttempts = [...lead.attempts]
    .filter((a) => a.attemptNumber >= 1)
    .sort((a, b) => a.attemptNumber - b.attemptNumber)
  const priorOutcomes = callAttempts.map((a) => a.outcome as CallOutcome)
  const callState = callLogState(priorOutcomes)
  const firstAttempt = callAttempts[0]

  const { control, handleSubmit, reset, formState } = useForm<CallAttemptValues>({
    resolver: zodResolver(callAttemptSchema),
    // Cast: "" doesn't satisfy the enum, but RHF needs concrete defaults to
    // register the Select. zod catches the empty value on submit.
    defaultValues: { ...callAttemptDefaults, outcome: "" as CallOutcome },
    mode: "onChange",
  })
  const { errors, isSubmitting } = formState

  const onSubmit = async (values: CallAttemptValues) => {
    try {
      const res = await logAttempt({ outcome: values.outcome, notes: values.notes })
      toast.success(`Attempt #${res.attemptNumber} logged`)
      if (res.triggerRecovery) {
        toast.info("4th no-response — recovery WhatsApp ready to send", { duration: 6000 })
      }
      reset({ ...callAttemptDefaults, outcome: "" as CallOutcome })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to log attempt")
    }
  }

  return (
    <div className="space-y-4">
      {/* Integrated qualification status + Update button + route CTA */}
      <QualificationStrip lead={lead} onNavigate={onNavigate} />

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
          {/* Phone-verified prerequisite — POST /leads/:id/attempt is behind
              phoneVerifiedGate, so logging on an unverified lead 403s. Surface
              the requirement upfront instead of letting the submit fail. */}
          {!lead.phoneVerified && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5">
              <XCircle className="size-3.5 text-destructive shrink-0" />
              <span className="text-[11px] text-destructive">
                Phone must be verified (header → Verify Phone) before logging a call attempt.
              </span>
            </div>
          )}
          {/* Smart Call Log lock — once "Wrong number" is logged the number is a
              dead contact; correcting Attempt #1 (below) or fixing the phone
              re-opens calling. */}
          {callState.locked && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <Lock className="size-3.5 text-destructive shrink-0 mt-0.5" />
              <span className="text-[11px] text-destructive">{callState.lockReason}</span>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <Controller
              control={control}
              name="outcome"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">Outcome</Label>
                  <Select value={field.value || ""} onValueChange={field.onChange} disabled={callState.locked}>
                    <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                    <SelectContent>
                      {/* Only outcomes that make sense given the call history —
                          e.g. "Wrong number" disappears once the lead's been reached. */}
                      {callState.allowed.map((key) => {
                        const cfg = OUTCOME_CONFIG[key]
                        return <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      })}
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
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || lead.crmLocked || !lead.phoneVerified || callState.locked}
                className="gap-1.5"
              >
                {lead.crmLocked || !lead.phoneVerified || callState.locked ? <Lock className="size-3.5" /> : <Send className="size-3.5" />}
                {lead.crmLocked ? "CRM Locked" : !lead.phoneVerified ? "Verify Phone First" : callState.locked ? "Calling Locked" : "Log Attempt"}
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
          {lead.recoveryWhatsappSentAt && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-1.5">
              <MessageSquare className="size-3.5 text-success shrink-0" />
              <span className="text-[11px] text-success">
                Recovery WhatsApp sent on {lead.recoveryWhatsappSentAt.toLocaleString()}
              </span>
            </div>
          )}
          {lead.attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No attempts logged yet</p>
          ) : (
            <ol className="space-y-3">
              {lead.attempts.map((a) => {
                const cfg = OUTCOME_CONFIG[a.outcome as CallOutcome]
                const Icon = cfg.icon
                // Only the FIRST call attempt is correctable — a mis-logged
                // initial disposition. Later attempts stay read-only.
                const isFirstAttempt = firstAttempt && a.id === firstAttempt.id
                const canEdit = isFirstAttempt && !lead.crmLocked && lead.phoneVerified
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
                        {a.edited && (
                          <span className="text-[10px] text-muted-foreground/80 italic">· edited</span>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setEditTarget(a)}
                            className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition"
                          >
                            <Pencil className="size-3" />
                            Correct
                          </button>
                        )}
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

      {/* Correct a mis-logged FIRST attempt (chain-validated). */}
      {editTarget && firstAttempt && (
        <EditFirstAttemptDialog
          leadId={lead.id}
          attempt={editTarget}
          laterOutcomes={priorOutcomes.slice(1)}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}

// ─── Edit First Attempt — correct an initial mis-logged disposition ────────
// Only Attempt #1 is editable. The outcome choices are filtered to ones that
// keep the rest of the (immutable) chain legal, so a correction can never make
// the history self-contradictory. The backend re-checks the same rule.
function EditFirstAttemptDialog({
  leadId,
  attempt,
  laterOutcomes,
  onClose,
}: {
  leadId: string
  attempt: CallAttempt
  laterOutcomes: CallOutcome[]
  onClose: () => void
}) {
  const { mutateAsync: editAttempt, isPending } = useEditAttempt(leadId)
  const [outcome, setOutcome] = useState<CallOutcome>(attempt.outcome as CallOutcome)
  const [notes, setNotes] = useState(attempt.notes ?? "")

  // An outcome is selectable only if setting Attempt #1 to it doesn't contradict
  // any later attempt.
  const selectable = CALL_OUTCOMES.filter((o) => firstEditConflict(o, laterOutcomes) === null)

  const onSave = async () => {
    try {
      await editAttempt({ attemptId: attempt.id, outcome, notes: notes || undefined })
      toast.success("Attempt #1 corrected")
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to correct the attempt")
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct Attempt #{attempt.attemptNumber}</DialogTitle>
          <DialogDescription className="text-xs">
            Only the first attempt can be corrected — fix a mis-logged outcome. Choices that would
            clash with later attempts are hidden.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Outcome</Label>
            <Select value={outcome} onValueChange={(v) => setOutcome(v as CallOutcome)}>
              <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
              <SelectContent>
                {selectable.map((key) => (
                  <SelectItem key={key} value={key}>{OUTCOME_CONFIG[key].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button size="sm" onClick={onSave} disabled={isPending} className="gap-1.5">
            <Pencil className="size-3.5" />
            {isPending ? "Saving…" : "Save correction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Qualification Strip — integrated into the Call Log tab ────────────────
// Compact, always-visible qualification status + an "Update Qualification"
// button (opens the same FullQualificationDialog the old tab used) + the
// route Next-Action CTA (Gap #10). Replaces the standalone Qualification tab.
function QualificationStrip({
  lead,
  onNavigate,
}: {
  lead: LeadDetail
  /** Switch the parent's active tab (used by the Next Action CTA). */
  onNavigate?: (tab: string) => void
}) {
  const [editOpen, setEditOpen] = useState(false)

  // Rapid Qualification checklist items (SOP §1–2) — shown as scannable pills.
  const rapidFields: { label: string; filled: boolean; hint?: string }[] = [
    { label: "Phone Verified", filled: lead.phoneVerified, hint: "Verify the lead's phone number before logging calls." },
    { label: "Dentist Type", filled: !!lead.dentistType, hint: "Capture the dentist type during Rapid Qualification." },
    { label: "Practice Type", filled: !!lead.practiceType, hint: "Capture the practice type during Rapid Qualification." },
    { label: "Timeline", filled: !!lead.timelineBucket, hint: "Set the purchase timeline (1 / 3 / 6+ months)." },
    { label: "Budget Range", filled: !!lead.budgetRange, hint: "Record the budget band for this lead." },
    { label: "Route Decided", filled: !!lead.firstCallRoute && lead.firstCallRoute !== "pending", hint: "Set automatically when you book an Online or Physical meeting (Meetings tab) or enter Drip (Drip tab). Stays “pending” until then." },
  ]
  const rapidCompleted = rapidFields.filter((f) => f.filled).length

  // Phase 2 (Full) field completeness — SOP §2 qualification gate (all 6 required)
  const fullQualFields = [
    { key: "decisionMaker", label: "Decision Maker", value: lead.decisionMaker },
    { key: "timelineBucket", label: "Timeline (ClosingDate)", value: lead.timelineBucket },
    { key: "budgetRange", label: "Budget Range", value: lead.budgetRange },
    { key: "competitors", label: "Competitor Evaluated", value: lead.competitors },
    { key: "fundingMethod", label: "Funding Method", value: lead.fundingMethod },
    { key: "dentistType", label: "Dentist + Practice Type", value: lead.dentistType && lead.practiceType ? `${lead.dentistType} · ${lead.practiceType}` : undefined },
  ]
  const completed = fullQualFields.filter((f) => !!f.value).length
  const isFullQualified = completed === fullQualFields.length
  const progressPct = Math.round((completed / fullQualFields.length) * 100)

  return (
    <>
      <Card className="overflow-hidden">
        {/* Header — title, gate badge, Update button */}
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ShieldCheck className="size-4" />
              </div>
              <CardTitle className="text-sm">Qualification</CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  isFullQualified
                    ? "bg-success/10 text-success border-success/30"
                    : "bg-warning/10 text-warning border-warning/30",
                )}
              >
                {isFullQualified ? "Gate passed" : "Gate pending"}
              </Badge>
            </div>
            <Button
              size="sm"
              variant={isFullQualified ? "outline" : "default"}
              className="gap-1.5"
              onClick={() => setEditOpen(true)}
            >
              <CheckCircle2 className="size-3.5" />
              Update Qualification
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Phone-verified prerequisite — the qualification gate can't pass without it */}
          {!lead.phoneVerified && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5">
              <XCircle className="size-3.5 text-destructive shrink-0" />
              <span className="text-[11px] text-destructive">
                Phone must be verified (header → Verify Phone) before the qualification gate can pass.
              </span>
            </div>
          )}

          {/* Two inline meters: Rapid (segmented dots) + Full (progress bar) */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Rapid — segmented dots */}
            <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium">Rapid Qualification</span>
                <span className="text-[11px] text-muted-foreground">
                  {rapidCompleted}/{rapidFields.length}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {rapidFields.map((f) => (
                  <span
                    key={f.label}
                    title={f.label}
                    className={cn(
                      "h-2 flex-1 rounded-full transition-colors",
                      f.filled ? "bg-success" : "bg-muted-foreground/20",
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Full — progress bar */}
            <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium">Full Qualification</span>
                <span className="text-[11px] text-muted-foreground">
                  {completed}/{fullQualFields.length} · {progressPct}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted-foreground/15">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isFullQualified ? "bg-success" : "bg-primary",
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Status pills — one per checklist item, scannable at a glance */}
          <div className="flex flex-wrap gap-1.5">
            {rapidFields.map((f) => (
              <span
                key={f.label}
                title={f.hint}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium",
                  f.filled
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
                )}
              >
                {f.filled ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                {f.label}
              </span>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground">
            All 6 full-qualification fields are required before scheduling a physical meeting (qualification gate).
          </p>
        </CardContent>
      </Card>

      {/* Gap #10 — Route next action CTA (kept from the old Qualification tab) */}
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
            <Button
              size="sm"
              className="gap-1.5"
              disabled={lead.crmLocked}
              onClick={() =>
                onNavigate?.(lead.firstCallRoute === "drip_info" ? "drip" : "meetings")
              }
            >
              {lead.crmLocked
                ? (<><Lock className="size-3.5" /> CRM Locked</>)
                : (<>
                    {lead.firstCallRoute === "online_meeting" && (<><Video className="size-3.5" /> Schedule Zoom</>)}
                    {lead.firstCallRoute === "physical_meeting" && (<><MapPinned className="size-3.5" /> Schedule Physical</>)}
                    {lead.firstCallRoute === "drip_info" && (<><Timer className="size-3.5" /> Enter Drip</>)}
                  </>)
              }
            </Button>
          </CardContent>
        </Card>
      )}

      <FullQualificationDialog open={editOpen} onOpenChange={setEditOpen} lead={lead} />
    </>
  )
}

// SOP §3: 3-tier timeline options. Urgency rank is used to enforce the
// "salespeople cannot downgrade" rule on the frontend (backend enforces too).
const TIMELINE_OPTIONS = [
  { value: "1_month",       label: "1 Month",   urgency: 3 },
  { value: "3_months",      label: "3 Months",  urgency: 2 },
  { value: "6_plus_months", label: "6+ Months", urgency: 1 },
] as const

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
  const { isSalesperson } = useRole()
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

  const { mutateAsync: fullQualify } = useFullQualify(lead.id)

  const onSubmit = async (values: FullQualificationValues) => {
    try {
      await fullQualify(values)
      toast.success("Full qualification saved — physical meeting gate unlocked")
      onOpenChange(false)
      reset()
    } catch (err) {
      toast.error(readApiError(err, "Failed to save qualification"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Full Qualification (Phase 2)</DialogTitle>
          <DialogDescription>
            All 6 fields are required before scheduling a physical meeting.
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
              render={({ field }) => {
                // Salespeople can only escalate (higher urgency), never downgrade.
                const currentUrgency = TIMELINE_OPTIONS.find((o) => o.value === lead.timelineBucket)?.urgency ?? 0
                return (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Timeline / Closing Date</Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                      <SelectContent>
                        {TIMELINE_OPTIONS.map((opt) => {
                          const blocked = isSalesperson && opt.urgency < currentUrgency
                          return (
                            <SelectItem key={opt.value} value={opt.value} disabled={blocked}>
                              {opt.label}{blocked ? " (cannot downgrade)" : ""}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      {isSalesperson
                        ? "Sales can only escalate timeline urgency (shorter)."
                        : "Telecaller/manager can move timeline in any direction."}
                    </p>
                    {errors.timelineBucket && <p className="text-[11px] text-destructive">{errors.timelineBucket.message}</p>}
                  </div>
                )
              }}
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

// ─── Drip Tab — Gap #6: DripStateBadge + Gap #7: Manual Exit ───────────
function DripTab({ lead }: { lead: LeadDetail }) {
  const [exitOpen, setExitOpen] = useState(false)
  const [exitReason, setExitReason] = useState("")
  const { mutateAsync: exitDrip, isPending: exiting } = useExitDrip(lead.id)

  const handleExit = async () => {
    if (!exitReason) {
      toast.error("Please select a reason")
      return
    }
    try {
      await exitDrip({ reason: exitReason })
      toast.success("Lead exited from drip")
      setExitOpen(false)
      setExitReason("")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to exit drip")
    }
  }

  if (!lead.inDrip) {
    return (
      <Card>
        <CardContent className="text-center py-12 space-y-3">
          <Timer className="size-10 text-muted-foreground/40 mx-auto" />
          <div>
            <p className="text-sm font-medium">Not in a drip sequence</p>
            <p className="text-xs text-muted-foreground mt-1">
              Enter this lead into a drip track from the Call Log tab or Rapid Qualification flow.
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
                  <Button onClick={handleExit} disabled={exiting}>
                    {exiting ? "Exiting…" : "Confirm Exit"}
                  </Button>
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

// ── Quotes Tab (Phase 4 + 5 + 6) ────────────────────────────────────
function QuotesTab({ lead }: { lead: LeadDetail }) {
  return (
    <div className="space-y-4">
      <HandToSalesCard lead={lead} />
      <QuotationListCard
        opportunityDocEntry={Number(lead.id)}
        customerCardCode={lead.customerCardCode || ""}
        customerName={lead.customerName || lead.name}
        customerPhone={lead.phone !== "—" ? lead.phone : undefined}
        meetingId={lead.latestPhysicalMeetingId}
      />
      <FollowUpListCard opportunityDocEntry={Number(lead.id)} />
      <ClosureCard opportunityDocEntry={Number(lead.id)} />
    </div>
  )
}

// ── Hand a qualified lead to a named salesperson ───────────────────────
// Telecaller / manager / admin only. The backend gates on phone-verified +
// full qualification, so the action may 422 if the lead isn't fully qualified —
// the mutation surfaces that message via toast.
function HandToSalesCard({ lead }: { lead: LeadDetail }) {
  const { isTelecaller, isManagerOrAbove } = useRole()
  const canHandover = isTelecaller || isManagerOrAbove
  const handed = lead.stage === "sales_handover"
  const closed = lead.stage === "closed_won" || lead.stage === "closed_lost"
  const [target, setTarget] = useState("")

  const { data: salesUsers = [], isLoading } = useSalesUsers(canHandover && !handed && !closed)
  const { mutateAsync, isPending } = useHandover(lead.id)

  // Salespeople and post-handover/closed leads don't see this card.
  if (!canHandover || closed) return null

  if (handed) {
    return (
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="size-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Handed over to sales</p>
            <p className="text-xs text-muted-foreground">
              The salesperson now owns this lead for quotation &amp; closure.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const submit = async () => {
    if (!target) {
      toast.error("Pick a salesperson to hand this lead to")
      return
    }
    try {
      const res = await mutateAsync({ salesUsername: target })
      toast.success(
        res.sapSynced
          ? "Lead handed over to sales"
          : "Handed over — SAP assignment will retry",
      )
      setTarget("")
    } catch {
      // useHandover already toasts the server message (e.g. "not fully qualified")
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Briefcase className="size-4 text-primary" />Hand to Sales
        </CardTitle>
        <CardDescription>
          Route this qualified lead to a salesperson. Requires phone verified + full qualification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="h-9 flex-1" disabled={isLoading}>
              <SelectValue placeholder={isLoading ? "Loading salespeople…" : "Select a salesperson"} />
            </SelectTrigger>
            <SelectContent>
              {salesUsers.map((u) => (
                <SelectItem key={u.username} value={u.username}>
                  {u.full_name || u.username}
                  <span className="text-muted-foreground"> · {u.role.replace("_", " ")}</span>
                  {!u.sales_person_code ? " · ⚠ no SAP code" : ""}
                </SelectItem>
              ))}
              {!isLoading && salesUsers.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No active salespeople found</div>
              )}
            </SelectContent>
          </Select>
          <Button onClick={submit} disabled={isPending || !target} className="gap-1.5">
            <ArrowRightLeft className="size-4" />
            {isPending ? "Handing over…" : "Hand Over"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Gap #4: Zoom Meeting Form ──────────────────────────────────────────
// `open` is UI state (dialog open/closed), not form state — kept as useState.
// Everything that is form state goes through useForm + zod.
type ZoomResult = {
  zoomCreated: boolean
  zoomJoinUrl: string | null
  zoomStartUrl: string | null
  zoomPasscode: string | null
}

function ZoomMeetingCard({ lead }: { lead: LeadDetail }) {
  const [open, setOpen] = useState(false)
  // Hold the join link/passcode returned by the schedule mutation so the rep
  // can copy/send it after the dialog closes (the dialog only collects input).
  const [zoomResult, setZoomResult] = useState<ZoomResult | null>(null)
  const { mutateAsync: saveZoom } = useZoomMeeting(lead.id)
  const { isTelecaller } = useRole()

  const { control, handleSubmit, reset, watch, formState } = useForm<ZoomMeetingValues>({
    resolver: zodResolver(zoomMeetingSchema),
    defaultValues: zoomMeetingDefaults,
    mode: "onChange",
  })
  const { errors, isSubmitting } = formState
  const designFeeStatus = watch("designFeeStatus")

  const onSubmit = async (values: ZoomMeetingValues) => {
    try {
      const res = await saveZoom(values)
      setOpen(false)
      reset(zoomMeetingDefaults)
      if (res.zoomCreated) {
        setZoomResult(res)
        toast.success("Zoom meeting created — join link ready below")
      } else {
        setZoomResult(null)
        toast.success("Zoom meeting logged (no Zoom link generated — Zoom not configured)")
      }
    } catch (err) {
      toast.error(readApiError(err, "Failed to save Zoom meeting"))
    }
  }

  // Persisted zoom rows from the lead detail — so the link survives reloads /
  // closing the dialog (the just-scheduled link is shown via zoomResult above).
  const persistedZoomMeetings = lead.zoomMeetings

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
            <Button size="sm" className="w-full gap-1.5" disabled={lead.crmLocked}>
              {lead.crmLocked ? <Lock className="size-3.5" /> : <Video className="size-3.5" />}
              {lead.crmLocked ? "CRM Locked" : "Schedule Zoom Meeting"}
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
                  name="durationMinutes"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Meeting length</Label>
                      <Select
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="40">40 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.durationMinutes && <p className="text-[11px] text-destructive">{errors.durationMinutes.message}</p>}
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
                          <SelectItem value="declined" disabled={!isTelecaller}>
                            Declined{!isTelecaller ? " (telecaller only)" : ""}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.designFeeStatus && <p className="text-[11px] text-destructive">{errors.designFeeStatus.message}</p>}
                      {designFeeStatus === "declined" && !isTelecaller && (
                        <p className="text-[11px] text-destructive">Only telecallers can move declined leads to the timeline funnel</p>
                      )}
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

                <Controller
                  control={control}
                  name="extraEmails"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Additional email recipients (optional)</Label>
                      <Input
                        {...field}
                        placeholder="e.g. manager@clinic.com, partner@clinic.com"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Comma-separated. Customer &amp; telecaller are included automatically.
                      </p>
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

        {/* Just-scheduled join link/passcode — kept visible after the dialog
            closes so the rep can copy it to send to the customer. */}
        {zoomResult?.zoomCreated && (
          <div className="mt-3">
            <ZoomLinkPanel
              title="Zoom meeting created"
              joinUrl={zoomResult.zoomJoinUrl}
              startUrl={zoomResult.zoomStartUrl}
              passcode={zoomResult.zoomPasscode}
            />
          </div>
        )}

        {/* Persisted zoom meetings — durable list so the link survives reloads. */}
        {persistedZoomMeetings.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Scheduled Zoom meetings</p>
            {persistedZoomMeetings.map((m) => (
              <ZoomLinkPanel
                key={m.id}
                title={new Date(m.meetingAt).toLocaleString()}
                joinUrl={m.joinUrl}
                startUrl={m.startUrl}
                passcode={m.passcode}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Copyable Zoom join/host link + passcode panel. Renders nothing actionable if
// no joinUrl is present (e.g. Zoom not configured at schedule time).
function ZoomLinkPanel({
  title,
  joinUrl,
  startUrl,
  passcode,
}: {
  title: string
  joinUrl: string | null
  startUrl: string | null
  passcode: string | null
}) {
  const copy = (label: string, value: string | null) => {
    if (!value) return
    navigator.clipboard
      ?.writeText(value)
      .then(() => toast.success(`${label} copied`))
      .catch(() => toast.error(`Could not copy ${label.toLowerCase()}`))
  }

  return (
    <div className="rounded-md border bg-violet-500/5 border-violet-500/30 p-3 space-y-2 text-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-violet-700">
        <Video className="size-3.5" />
        {title}
      </div>
      {joinUrl ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input readOnly value={joinUrl} className="text-xs h-8" />
            <Button size="sm" variant="outline" className="shrink-0 h-8" onClick={() => copy("Join link", joinUrl)}>
              Copy
            </Button>
          </div>
          {passcode && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Passcode:</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{passcode}</code>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => copy("Passcode", passcode)}>
                Copy
              </Button>
            </div>
          )}
          {startUrl && (
            <div className="flex items-center gap-2">
              <Input readOnly value={startUrl} className="text-xs h-8" />
              <Button size="sm" variant="ghost" className="shrink-0 h-8 text-[11px]" onClick={() => copy("Host link", startUrl)}>
                Copy
              </Button>
            </div>
          )}
          {startUrl && (
            <p className="text-[10px] text-destructive/80">
              Host start link — do not share with the customer.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No Zoom join link was generated for this meeting.</p>
      )}
    </div>
  )
}

// ── Gap #5: Schedule Physical Meeting + Handoff Confirmation ───────────
// `scheduleOpen`/`handoffOpen` are dialog UI state. `assignedSalesperson` is
// post-submit result state. None of those are form state — only meetingAt and
// location go through RHF. The salesperson is chosen server-side (round-robin)
// and read back from the response, so there is no client-side roster.

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

  const { mutateAsync: schedulePhysical } = usePhysicalMeeting(lead.id)

  const onSubmit = async (values: PhysicalMeetingValues) => {
    try {
      const res = await schedulePhysical(values)
      // Backend's round-robin / territory picker decides the salesperson and
      // fires the lead.handoff_to_sales event — we just show what it picked.
      setAssignedSalesperson(res.assignedSalesperson)
      setScheduleOpen(false)
      setHandoffOpen(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        toast.error(err.message || "Full qualification incomplete — finish it first")
      } else {
        toast.error(err instanceof ApiError ? err.message : "Failed to schedule physical meeting")
      }
    }
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
              Full Qualification (6 fields) must be complete before scheduling. Use “Update Qualification” on the Call Log tab.
            </AlertDescription>
          </Alert>
        )}
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="w-full gap-1.5"
              variant="outline"
              disabled={!isFullyQualified || lead.crmLocked}
            >
              {lead.crmLocked ? <Lock className="size-3.5" /> : <MapPinned className="size-3.5" />}
              {lead.crmLocked ? "CRM Locked" : "Schedule Physical Meeting"}
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
                <Controller
                  control={control}
                  name="extraEmails"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Additional email recipients (optional)</Label>
                      <Input
                        {...field}
                        placeholder="e.g. manager@clinic.com, partner@clinic.com"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Comma-separated. Customer &amp; telecaller are included automatically.
                      </p>
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

        {/* Post-meeting workflow: summary upload (6h SLA), SLA countdowns, and
            decision-timeline confirmation — only once a physical meeting exists. */}
        {lead.latestPhysicalMeetingId != null && (
          <MeetingSlaPanel meetingId={lead.latestPhysicalMeetingId} />
        )}
      </CardContent>
    </Card>
  )
}

// ── Phase 3 SLA: summary upload + countdowns + confirm decision timeline ──
function MeetingSlaPanel({ meetingId }: { meetingId: number }) {
  const { data: sla, isLoading } = useMeetingSlaStatus(meetingId)
  const { mutateAsync: uploadSummary, isPending: uploading } = useUploadMeetingSummary(meetingId)
  const { mutateAsync: confirmTimeline, isPending: confirming } = useConfirmDecisionTimeline(meetingId)
  const [summaryFile, setSummaryFile] = useState<File | null>(null)

  const handleUpload = async () => {
    if (!summaryFile) {
      toast.error("Choose a summary file first")
      return
    }
    try {
      const res = await uploadSummary(summaryFile)
      toast.success(
        res.withinSla
          ? `Summary uploaded within SLA (${res.hoursElapsed}h elapsed)`
          : `Summary uploaded — SLA breached (${res.hoursElapsed}h elapsed)`,
      )
      setSummaryFile(null)
    } catch (err) {
      toast.error(readApiError(err, "Failed to upload meeting summary"))
    }
  }

  const handleConfirmTimeline = async () => {
    try {
      await confirmTimeline()
      toast.success("Decision timeline confirmed")
    } catch (err) {
      toast.error(readApiError(err, "Failed to confirm decision timeline"))
    }
  }

  const fmtRemaining = (ms: number) => {
    if (ms <= 0) return "overdue"
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`
  }

  return (
    <div className="rounded-md border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium">
        <Timer className="size-3.5 text-blue-500" />
        Post-Meeting SLA
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading SLA status…</p>
      ) : !sla ? (
        <p className="text-xs text-muted-foreground">SLA status unavailable.</p>
      ) : (
        <div className="space-y-2 text-xs">
          {/* Summary 6h SLA */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Summary (6h)</span>
            {sla.summary.uploaded ? (
              <Badge className="text-[10px] bg-success/10 text-success border-success/30">Uploaded</Badge>
            ) : sla.summary.breached ? (
              <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">Breached</Badge>
            ) : (
              <span className="text-muted-foreground">{fmtRemaining(sla.summary.remainingMs)}</span>
            )}
          </div>

          {/* Quote 12h SLA */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Quotation (12h)</span>
            {sla.quotation.created ? (
              <Badge className="text-[10px] bg-success/10 text-success border-success/30">Created</Badge>
            ) : sla.quotation.breached ? (
              <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">Breached</Badge>
            ) : (
              <span className="text-muted-foreground">{fmtRemaining(sla.quotation.remainingMs)}</span>
            )}
          </div>

          {/* Decision timeline */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Decision timeline</span>
            {sla.decisionTimelineConfirmed ? (
              <Badge className="text-[10px] bg-success/10 text-success border-success/30">Confirmed</Badge>
            ) : (
              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" disabled={confirming} onClick={handleConfirmTimeline}>
                <CheckCircle2 className="size-3" />
                {confirming ? "Confirming…" : "Confirm"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Summary upload — shown until a summary exists */}
      {!sla?.summary.uploaded && (
        <div className="space-y-1.5 pt-1 border-t">
          <Label className="text-xs">Upload meeting summary</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*,application/pdf,.doc,.docx"
              onChange={(e) => setSummaryFile(e.target.files?.[0] ?? null)}
              className="text-xs"
            />
            <Button size="sm" className="shrink-0 gap-1.5" disabled={uploading || !summaryFile} onClick={handleUpload}>
              <Upload className="size-3.5" />
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
