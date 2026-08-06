"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Phone, User, Mail, MapPin, MessageSquare } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSapStates } from "@/hooks/use-sap-states"
import { useQuickCreateLead } from "@/hooks/use-lead-mutations"
import { ApiError } from "@/lib/api/client"
import type { QuickLeadInput, QuickFirstResponse } from "@/lib/api/leads"
import { cn } from "@/lib/utils"
import {
  DENTIST_TYPES, PRACTICE_TYPES, FUNDING_METHODS, COMPETITOR_OPTIONS, PURCHASE_TYPES,
} from "@/lib/schemas/qualification"

const INTEREST_LEVELS = [
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
  { value: "just_exploring", label: "Just looking" },
] as const

const BUDGETS = [
  { value: "<5L", label: "Under ₹5L" },
  { value: "5-10L", label: "₹5–10L" },
  { value: "10-25L", label: "₹10–25L" },
  { value: "25L+", label: "₹25L+" },
] as const

const TIMELINES = [
  { value: "1_month", label: "Within a month" },
  { value: "3_months", label: "1–3 months" },
  { value: "6_plus_months", label: "6+ months" },
] as const

const EQUIPMENT_OPTIONS = [
  "Dental Chair", "Full Chair Setup", "X-Ray Unit", "Autoclave", "Compressor", "Handpiece",
  "Scaler", "Light Cure", "Imaging System", "Other",
] as const

const OUTCOMES = [
  { value: "engaged", label: "Interested", hint: "Wants to buy / know more" },
  { value: "call_back_requested", label: "Call back later", hint: "Asked to call again" },
  { value: "not_interested", label: "Not interested", hint: "" },
  { value: "no_response", label: "No response", hint: "Didn't pick up" },
  { value: "wrong_number", label: "Wrong number", hint: "" },
] as const

const NI_REASONS = [
  { value: "timing_budget", label: "Interested later", hint: "Timing / budget" },
  { value: "already_purchased", label: "Already purchased", hint: "Already has a chair" },
  { value: "genuine_no", label: "Not interested at all", hint: "" },
] as const

const BUYER_SOURCE = [
  { value: "us", label: "From us", hint: "Existing customer" },
  { value: "other", label: "Another brand", hint: "Lost" },
] as const

// Plain-English version of where the lead went (no "drip" / "nurture" jargon).
const ROUTE_LABEL: Record<string, string> = {
  drip: "we'll follow up automatically",
  six_month_funnel: "we'll follow up over the next few months",
  meeting_pending: "ready for a meeting",
  meeting: "ready for a meeting",
  callback_scheduled: "callback scheduled",
  first_contact_retry: "we'll try again",
  retry: "we'll try again",
  archived: "saved and closed",
}

const onlyDigits = (s: string, max: number) => s.replace(/\D/g, "").slice(0, max)

// Defined at module scope (NOT inside the component) so they keep a stable
// identity across renders — otherwise every keystroke remounts the inputs and
// the field loses focus after one character.
function Req() {
  return <span className="text-destructive"> *</span>
}

function Optional() {
  return <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
}

function Pills({ options, value, onChange, cols = 3 }: {
  options: readonly { value: string; label: string; hint?: string }[]
  value: string
  onChange: (v: string) => void
  cols?: 2 | 3
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", cols === 3 && "sm:grid-cols-3")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg border px-3 py-2.5 text-left text-sm transition",
            value === o.value ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border bg-card hover:bg-muted/40",
          )}
        >
          <div className="font-medium">{o.label}</div>
          {o.hint ? <div className="text-[11px] text-muted-foreground">{o.hint}</div> : null}
        </button>
      ))}
    </div>
  )
}

export function QuickLeadEntry({ onOpenLead }: { onOpenLead?: (leadId: string, action?: string) => void }) {
  const { data: states, isLoading: statesLoading } = useSapStates()
  const { mutateAsync: quickCreate, isPending } = useQuickCreateLead()

  const [leadName, setLeadName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [waSame, setWaSame] = useState(true)
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [email, setEmail] = useState("")
  const [state, setState] = useState("")
  const [city, setCity] = useState("")
  const [equipmentInterest, setEquipmentInterest] = useState("")
  const [interestLevel, setInterestLevel] = useState("")
  const [budget, setBudget] = useState("")
  const [timeline, setTimeline] = useState("")
  const [outcome, setOutcome] = useState("")
  const [readyNow, setReadyNow] = useState(false)
  // When "Not yet — follow up" is chosen: Zoom consult (a virtual meeting) vs Add to Drip.
  const [nurtureRoute, setNurtureRoute] = useState<"zoom" | "drip">("drip")
  const [niReason, setNiReason] = useState("")
  const [boughtFrom, setBoughtFrom] = useState("")
  const [callbackAt, setCallbackAt] = useState("")
  const [predictedClosingDate, setPredictedClosingDate] = useState("")
  const [notes, setNotes] = useState("")

  const [decisionMaker, setDecisionMaker] = useState("")
  const [dentistType, setDentistType] = useState("")
  const [practiceType, setPracticeType] = useState("")
  const [fundingMethod, setFundingMethod] = useState("")
  const [competitors, setCompetitors] = useState("")
  const [purchaseType, setPurchaseType] = useState("")

  const [done, setDone] = useState<{ name: string; route: string | null; leadId: number; meetingType?: "physical" | "zoom" | null } | null>(null)

  const isEngaged = outcome === "engaged"
  const timelineNeeded = isEngaged

  // Predicted closing date — parity with the Call Log tab. Pre-filled from the buy
  // timeline (engaged) or a neutral +6mo default so it's never blank, then pushed to
  // SAP + saved on lead_extensions on create (replacing the old "tomorrow" placeholder).
  const autoClose = (() => {
    const m = isEngaged ? (timeline === "1_month" ? 1 : timeline === "3_months" ? 3 : 6) : 6
    const d = new Date(); d.setMonth(d.getMonth() + m)
    return d.toISOString().slice(0, 10)
  })()
  const effectiveClose = predictedClosingDate || autoClose
  // Shown for every reached/attempted outcome except a hard "not interested"
  // (genuine_no / already_purchased) — matching the Call Log tab exactly.
  const showClose = !!outcome && (outcome !== "not_interested" || niReason === "timing_budget")

  // Changing the outcome clears the fields that no longer apply, so nothing
  // stale is carried into the save and the form stays uncluttered.
  const clearQualification = () => {
    setDecisionMaker(""); setDentistType(""); setPracticeType(""); setFundingMethod(""); setCompetitors(""); setPurchaseType("")
  }

  const changeOutcome = (v: string) => {
    setOutcome(v)
    // Reset the close date so the per-outcome default re-applies.
    setPredictedClosingDate("")
    setNurtureRoute("drip")
    if (v !== "engaged") { setReadyNow(false); setInterestLevel(""); setBudget(""); setTimeline(""); setEquipmentInterest(""); clearQualification() }
    if (v !== "not_interested") { setNiReason(""); setBoughtFrom("") }
    if (v !== "call_back_requested") setCallbackAt("")
  }

  const reset = () => {
    setLeadName(""); setPhoneNumber(""); setWaSame(true); setWhatsappNumber(""); setEmail("")
    setState(""); setCity(""); setEquipmentInterest(""); setInterestLevel(""); setBudget(""); setTimeline("")
    setOutcome(""); setReadyNow(false); setNurtureRoute("drip"); setNiReason(""); setCallbackAt(""); setPredictedClosingDate(""); setNotes(""); clearQualification()
  }

  const validate = (): string | null => {
    if (leadName.trim().length < 2) return "Enter the lead's name"
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) return "Enter a valid 10-digit mobile number"
    if (!waSame && !/^[6-9]\d{9}$/.test(whatsappNumber)) return "Enter a valid WhatsApp number"
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "That email doesn't look right"
    if (!state) return "Pick a state"
    if (!city.trim()) return "Enter a city"
    if (!outcome) return "Pick what happened on the call"
    // Interest / budget / buy-timing only matter when she actually spoke to the
    // doctor. A no-response / wrong-number lead saves with just the basics.
    if (isEngaged && !interestLevel) return "How interested are they?"
    if (isEngaged && !budget) return "Pick their budget"
    if (timelineNeeded && !timeline) return "When do they plan to buy?"
    if (isEngaged && !decisionMaker.trim()) return "Who's the decision maker?"
    if (isEngaged && !dentistType) return "Pick the dentist type"
    if (isEngaged && !practiceType) return "Pick the practice type"
    if (isEngaged && !fundingMethod) return "Pick the funding method"
    if (isEngaged && !competitors) return "Pick the competitor (or 'None')"
    if (isEngaged && !purchaseType) return "Pick the purchase type"
    if (outcome === "not_interested" && !niReason) return "Why aren't they interested?"
    if (outcome === "not_interested" && niReason === "already_purchased" && !boughtFrom) return "Where did they buy — from us or another brand?"
    if (outcome === "call_back_requested" && !callbackAt) return "When should we call back?"
    return null
  }

  const qualificationPayload = () => ({
    purchaseType,
    decisionMaker: decisionMaker.trim(),
    dentistType,
    practiceType,
    fundingMethod,
    competitors,
  })

  const errorText = (e: unknown) =>
    e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Couldn't add the lead — please try again"

  const submit = async () => {
    const err = validate()
    if (err) { toast.error(err); return }

    // Engaged meeting choice → physical (ready) / zoom (nurture consult) / drip (nurture).
    // Physical + Zoom are meetings → route to meeting_pending (readyNow); drip nurtures.
    const engagedMeeting: "physical" | "zoom" | null = !isEngaged
      ? null
      : readyNow ? "physical"
      : nurtureRoute === "zoom" ? "zoom"
      : null
    const wantsMeeting = engagedMeeting === "physical" || engagedMeeting === "zoom"

    const firstResponse: QuickFirstResponse = { outcome: outcome as QuickFirstResponse["outcome"] }
    if (isEngaged) firstResponse.readyNow = wantsMeeting
    if (outcome === "not_interested") firstResponse.notInterestedReason = niReason as QuickFirstResponse["notInterestedReason"]
    if (outcome === "not_interested" && niReason === "already_purchased" && boughtFrom) firstResponse.boughtFromUs = boughtFrom === "us"
    if (outcome === "call_back_requested") firstResponse.callbackAt = callbackAt
    if (showClose && effectiveClose) {
      firstResponse.predictedClosingDate = effectiveClose
      firstResponse.predictedCloseSource = predictedClosingDate && predictedClosingDate !== autoClose ? "manual" : "auto_track"
    }
    if (notes.trim()) firstResponse.notes = notes.trim()

    const payload: QuickLeadInput = {
      leadName: leadName.trim(),
      phoneNumber,
      whatsappNumber: waSame ? phoneNumber : whatsappNumber,
      email: email.trim() || undefined,
      state,
      city: city.trim(),
      interestLevel: isEngaged && interestLevel ? interestLevel : "just_exploring",
      budget: isEngaged && budget ? budget : "<5L",
      source: "Facebook",
      equipmentInterest: isEngaged ? (equipmentInterest || undefined) : undefined,
      timeline: timelineNeeded && timeline ? (timeline as QuickLeadInput["timeline"]) : undefined,
      ...(isEngaged ? { ...qualificationPayload(), qualifyRoute: engagedMeeting === "physical" ? "physical_meeting" : engagedMeeting === "zoom" ? "online_meeting" : "drip_info" } : {}),
      firstResponse,
    }

    try {
      const res = await quickCreate(payload)
      const created = { name: leadName.trim(), route: res.route ?? null, leadId: res.opportunityDocEntry, meetingType: engagedMeeting }
      setDone(created)
      toast.success("Lead added" + (res.route ? ` — ${ROUTE_LABEL[res.route] ?? res.route}` : ""))
      // Engaged + ready routes to a meeting — hold the success card up with a
      // "book the meeting" CTA instead of auto-resetting for the next lead.
      if (created.route !== "meeting_pending") {
        setTimeout(() => { reset(); setDone(null) }, 2600)
      }
    } catch (e) {
      toast.error(errorText(e))
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-success/10 mb-5">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <h3 className="text-xl font-semibold">Lead added ✓</h3>
          <p className="text-sm text-muted-foreground mt-1.5">
            {done.name} is saved
            {done.route ? <> — <span className="font-medium text-foreground">{ROUTE_LABEL[done.route] ?? done.route}</span>.</> : "."}
          </p>
          {done.route === "meeting_pending" ? (
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button size="lg" className="gap-2" onClick={() => onOpenLead?.(String(done.leadId), done.meetingType === "zoom" ? "book-zoom" : "book-physical")}>
                {done.meetingType === "zoom" ? "📹 Book the Zoom consult now →" : "📅 Book the meeting now →"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { reset(); setDone(null) }}>
                Add another lead
              </Button>
              <p className="text-[11px] text-muted-foreground mt-1">Not now? It’ll show as “Meeting pending” in your list.</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-3">Ready for the next lead…</p>
          )}
        </CardContent>
      </Card>
    )
  }

  const iconCls = "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"

  return (
    <Card className="p-0">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Add a new lead</h2>
          <p className="text-sm text-muted-foreground">Fill the details, then log what happened on your call. We'll take care of the follow-up.</p>
        </div>

        {/* ── Step 1: who is the lead ─────────────────────────────── */}
        <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
          <div className="text-sm font-semibold">1. Lead details</div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full name<Req /></Label>
              <div className="relative">
                <User className={iconCls} />
                <Input className="pl-10" placeholder="Dr. Ramesh Sharma" value={leadName} onChange={(e) => setLeadName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mobile number<Req /></Label>
              <div className="relative">
                <Phone className={iconCls} />
                <Input className="pl-10" inputMode="numeric" placeholder="10-digit number" value={phoneNumber} onChange={(e) => setPhoneNumber(onlyDigits(e.target.value, 10))} />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox checked={waSame} onCheckedChange={(c) => setWaSame(c === true)} />
            <span className="text-sm">WhatsApp is the same as the mobile number</span>
          </label>
          {!waSame && (
            <div className="space-y-1.5">
              <Label>WhatsApp number<Req /></Label>
              <div className="relative">
                <MessageSquare className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#25D366]" />
                <Input className="pl-10" inputMode="numeric" placeholder="10-digit number" value={whatsappNumber} onChange={(e) => setWhatsappNumber(onlyDigits(e.target.value, 10))} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>State<Req /></Label>
              <Select value={state} onValueChange={setState} disabled={statesLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={statesLoading ? "Loading…" : "Select state"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {(states ?? []).map((s) => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>City<Req /></Label>
              <div className="relative">
                <MapPin className={iconCls} />
                <Input className="pl-10" placeholder="Mumbai" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Email<Optional /></Label>
            <div className="relative">
              <Mail className={iconCls} />
              <Input className="pl-10" type="email" placeholder="dr.name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Step 2: what happened on the call ───────────────────── */}
        <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
          <div>
            <div className="text-sm font-semibold">2. What happened on the call?<Req /></div>
            <div className="text-xs text-muted-foreground">Pick one — we'll only ask for what that needs.</div>
          </div>
          <Pills options={OUTCOMES} value={outcome} onChange={changeOutcome} />

          {/* Interested → capture the details that drive the follow-up */}
          {isEngaged && (
            <div className="space-y-4 rounded-lg border bg-card p-3.5">
              <div className="space-y-1.5">
                <Label>Do they want to buy now?<Req /></Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReadyNow(true)}
                    className={cn("rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                      readyNow ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border bg-card hover:bg-muted/40")}
                  >
                    Yes — set up a meeting
                  </button>
                  <button
                    type="button"
                    onClick={() => setReadyNow(false)}
                    className={cn("rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                      !readyNow ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border bg-card hover:bg-muted/40")}
                  >
                    Not yet — follow up
                  </button>
                </div>
              </div>

              {!readyNow && (
                <div className="space-y-1.5">
                  <Label>How do you want to follow up?<Req /></Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNurtureRoute("zoom")}
                      className={cn("rounded-lg border px-3 py-2.5 text-left text-sm transition",
                        nurtureRoute === "zoom" ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border bg-card hover:bg-muted/40")}
                    >
                      <div className="font-medium">Zoom consult</div>
                      <div className="text-[11px] text-muted-foreground">Online demo with the designer</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNurtureRoute("drip")}
                      className={cn("rounded-lg border px-3 py-2.5 text-left text-sm transition",
                        nurtureRoute === "drip" ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border bg-card hover:bg-muted/40")}
                    >
                      <div className="font-medium">Add to Drip</div>
                      <div className="text-[11px] text-muted-foreground">Nurture over time</div>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Product they want<Optional /></Label>
                <Select value={equipmentInterest} onValueChange={setEquipmentInterest}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Which product?" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>How interested are they?<Req /></Label>
                  <Pills options={INTEREST_LEVELS} value={interestLevel} onChange={setInterestLevel} cols={2} />
                </div>
                <div className="space-y-1.5">
                  <Label>Budget<Req /></Label>
                  <Pills options={BUDGETS} value={budget} onChange={setBudget} cols={2} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>When do they plan to buy?<Req /></Label>
                <Pills options={TIMELINES} value={timeline} onChange={setTimeline} />
                <p className="text-[11px] text-muted-foreground">
                  {readyNow ? "Their expected purchase timeline." : "This sets how often we follow up."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Decision maker<Req /></Label>
                <Input placeholder="Name / role of who decides" value={decisionMaker} onChange={(e) => setDecisionMaker(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Dentist type<Req /></Label>
                  <Select value={dentistType} onValueChange={setDentistType}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {DENTIST_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Practice type<Req /></Label>
                  <Select value={practiceType} onValueChange={setPracticeType}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select practice" /></SelectTrigger>
                    <SelectContent>
                      {PRACTICE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Funding method<Req /></Label>
                  <Select value={fundingMethod} onValueChange={setFundingMethod}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select funding" /></SelectTrigger>
                    <SelectContent>
                      {FUNDING_METHODS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Purchase type<Req /></Label>
                  <Select value={purchaseType} onValueChange={setPurchaseType}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {PURCHASE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Competitor evaluated<Req /></Label>
                <Select value={competitors} onValueChange={setCompetitors}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select competitor" /></SelectTrigger>
                  <SelectContent>
                    {COMPETITOR_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

            </div>
          )}

          {/* Not interested → why */}
          {outcome === "not_interested" && (
            <div className="space-y-1.5 rounded-lg border bg-card p-3.5">
              <Label>Why aren't they interested?<Req /></Label>
              <Pills options={NI_REASONS} value={niReason} onChange={(v) => { setNiReason(v); setBoughtFrom("") }} />
              {niReason === "already_purchased" && (
                <div className="space-y-1.5 pt-1.5">
                  <Label>Where did they buy?<Req /></Label>
                  <Pills options={BUYER_SOURCE} value={boughtFrom} onChange={setBoughtFrom} />
                </div>
              )}
            </div>
          )}

          {/* Call back → when */}
          {outcome === "call_back_requested" && (
            <div className="space-y-1.5 rounded-lg border bg-card p-3.5">
              <Label>When should we call back?<Req /></Label>
              <Input type="datetime-local" value={callbackAt} onChange={(e) => setCallbackAt(e.target.value)} />
            </div>
          )}

          {/* No response / wrong number → we still capture a predicted close below */}
          {(outcome === "no_response" || outcome === "wrong_number") && (
            <p className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
              We'll save the lead{outcome === "no_response" ? " and try again later" : ""}.
            </p>
          )}

          {/* Predicted closing date — parity with the Call Log tab. Auto-filled, pushed
              to SAP + saved on the lead so the pipeline forecast isn't left at a placeholder. */}
          {showClose && (
            <div className="space-y-1.5 rounded-lg border bg-card p-3.5">
              <Label>
                Predicted closing date
                {outcome === "not_interested" ? <Optional /> : <Req />}
              </Label>
              <Input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={effectiveClose}
                onChange={(e) => setPredictedClosingDate(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Auto-set from the buy timeline — adjust only if the customer confirmed a different date. Synced to SAP.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes<Optional /></Label>
            <Textarea rows={2} placeholder="Anything worth remembering from the call" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <Button type="button" onClick={submit} disabled={isPending} size="lg" className="w-full gap-2">
          {isPending ? <><Loader2 className="size-4 animate-spin" />Adding…</> : <><CheckCircle2 className="size-4" />Add lead</>}
        </Button>
      </CardContent>
    </Card>
  )
}
