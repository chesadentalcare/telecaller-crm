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

const INTEREST_LEVELS = [
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
  { value: "just_exploring", label: "Exploring" },
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
  "Dental Chair", "X-Ray Unit", "Autoclave", "Compressor", "Handpiece",
  "Scaler", "Light Cure", "Imaging System", "Other",
] as const

const OUTCOMES = [
  { value: "engaged", label: "Interested", hint: "Wants a chair" },
  { value: "call_back_requested", label: "Call back later", hint: "Asked to call again" },
  { value: "not_interested", label: "Not interested", hint: "" },
  { value: "no_response", label: "No response", hint: "Didn't pick up" },
  { value: "wrong_number", label: "Wrong number", hint: "" },
] as const

const NI_REASONS = [
  { value: "timing_budget", label: "Timing / budget — nurture" },
  { value: "already_purchased", label: "Bought elsewhere" },
  { value: "genuine_no", label: "Not a fit / genuine no" },
] as const

const ROUTE_LABEL: Record<string, string> = {
  drip: "entered the nurture drip",
  six_month_funnel: "entered the 6-month nurture drip",
  meeting_pending: "ready for a meeting",
  callback_scheduled: "callback scheduled",
  first_contact_retry: "queued for a retry",
  retry: "queued for a retry",
  archived: "archived",
  meeting: "ready for a meeting",
}

const onlyDigits = (s: string, max: number) => s.replace(/\D/g, "").slice(0, max)

// Defined at module scope (NOT inside the component) so they keep a stable
// identity across renders — otherwise every keystroke remounts the inputs and
// the field loses focus after one character.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <div className="text-sm font-semibold">{title}</div>
      {children}
    </div>
  )
}

function Pills({ options, value, onChange }: {
  options: readonly { value: string; label: string; hint?: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg border px-3 py-2 text-left text-sm transition",
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

export function QuickLeadEntry() {
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
  const [niReason, setNiReason] = useState("")
  const [callbackAt, setCallbackAt] = useState("")
  const [notes, setNotes] = useState("")

  const [done, setDone] = useState<{ name: string; route: string | null } | null>(null)

  const reset = () => {
    setLeadName(""); setPhoneNumber(""); setWaSame(true); setWhatsappNumber(""); setEmail("")
    setState(""); setCity(""); setEquipmentInterest(""); setInterestLevel(""); setBudget(""); setTimeline("")
    setOutcome(""); setReadyNow(false); setNiReason(""); setCallbackAt(""); setNotes("")
  }

  // Planned purchase is what drives the drip — required for an interested lead
  // that isn't buying right now.
  const timelineNeeded = outcome === "engaged" && !readyNow

  const validate = (): string | null => {
    if (leadName.trim().length < 2) return "Enter the lead's name"
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) return "Enter a valid 10-digit mobile"
    if (!waSame && !/^[6-9]\d{9}$/.test(whatsappNumber)) return "Enter a valid WhatsApp number"
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email"
    if (!state) return "Pick a state"
    if (!city.trim()) return "Enter a city"
    if (!outcome) return "Pick what happened on the call"
    // Interest / budget / product are call-derived — only expected when Neha
    // actually spoke to the doctor. For a no-response, wrong-number, etc. she can
    // still enter the lead with just the basics.
    if (outcome === "engaged" && !interestLevel) return "Pick an interest level"
    if (outcome === "engaged" && !budget) return "Pick a budget"
    if (timelineNeeded && !timeline) return "Pick when they plan to buy"
    if (outcome === "not_interested" && !niReason) return "Pick a not-interested reason"
    if (outcome === "call_back_requested" && !callbackAt) return "Pick a callback date & time"
    return null
  }

  const submit = async () => {
    const err = validate()
    if (err) { toast.error(err); return }

    const firstResponse: QuickFirstResponse = { outcome: outcome as QuickFirstResponse["outcome"] }
    if (outcome === "engaged") firstResponse.readyNow = readyNow
    if (outcome === "not_interested") firstResponse.notInterestedReason = niReason as QuickFirstResponse["notInterestedReason"]
    if (outcome === "call_back_requested") firstResponse.callbackAt = callbackAt
    if (notes.trim()) firstResponse.notes = notes.trim()

    const payload: QuickLeadInput = {
      leadName: leadName.trim(),
      phoneNumber,
      whatsappNumber: waSame ? phoneNumber : whatsappNumber,
      email: email.trim() || undefined,
      state,
      city: city.trim(),
      // Interest / budget are optional in the form (unknown for a no-response),
      // but the backend requires them — fall back to safe neutral defaults.
      interestLevel: interestLevel || "just_exploring",
      budget: budget || "<5L",
      source: "Facebook",
      equipmentInterest: equipmentInterest || undefined,
      timeline: timeline ? (timeline as QuickLeadInput["timeline"]) : undefined,
      firstResponse,
    }

    try {
      const res = await quickCreate(payload)
      setDone({ name: leadName.trim(), route: res.route ?? null })
      toast.success("Lead added" + (res.route ? ` — ${ROUTE_LABEL[res.route] ?? res.route}` : ""))
      setTimeout(() => { reset(); setDone(null) }, 2600)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Failed to add lead")
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-success/10 mb-5">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <h3 className="text-xl font-semibold">Lead added</h3>
          <p className="text-sm text-muted-foreground mt-1.5">
            {done.name} is in the pipeline
            {done.route ? <> — <span className="font-medium text-foreground">{ROUTE_LABEL[done.route] ?? done.route}</span>.</> : "."}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="p-0">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">Add lead from call</h2>
          <p className="text-xs text-muted-foreground">Enter the Meta lead and what happened on your call — it routes automatically.</p>
        </div>

        <Section title="Lead">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-10" placeholder="Dr. Ramesh Sharma" value={leadName} onChange={(e) => setLeadName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-10" inputMode="numeric" placeholder="9876543210" value={phoneNumber} onChange={(e) => setPhoneNumber(onlyDigits(e.target.value, 10))} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Checkbox id="wa" checked={waSame} onCheckedChange={(c) => setWaSame(c === true)} />
            <Label htmlFor="wa" className="cursor-pointer text-sm font-normal">WhatsApp is same as mobile</Label>
          </div>
          {!waSame && (
            <div className="space-y-1.5">
              <Label>WhatsApp number</Label>
              <div className="relative">
                <MessageSquare className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#25D366]" />
                <Input className="pl-10" inputMode="numeric" placeholder="9876543210" value={whatsappNumber} onChange={(e) => setWhatsappNumber(onlyDigits(e.target.value, 10))} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Email <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-10" type="email" placeholder="dr.name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>State</Label>
                <Select value={state} onValueChange={setState} disabled={statesLoading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={statesLoading ? "Loading…" : "State"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {(states ?? []).map((s) => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-10" placeholder="Mumbai" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Interest & budget">
          <div className="space-y-1.5">
            <Label>Product they want <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Select value={equipmentInterest} onValueChange={setEquipmentInterest}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Which product are they interested in?" />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Interest level {outcome === "engaged" ? <span className="text-destructive">*</span> : <span className="text-xs text-muted-foreground">(optional)</span>}</Label>
            <Pills options={INTEREST_LEVELS} value={interestLevel} onChange={setInterestLevel} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Budget {outcome === "engaged" ? <span className="text-destructive">*</span> : <span className="text-xs text-muted-foreground">(optional)</span>}</Label>
              <Pills options={BUDGETS} value={budget} onChange={setBudget} />
            </div>
            <div className="space-y-1.5">
              <Label>
                When they plan to buy {timelineNeeded ? <span className="text-destructive">*</span> : <span className="text-xs text-muted-foreground">(sets the follow-up schedule)</span>}
              </Label>
              <Pills options={TIMELINES} value={timeline} onChange={setTimeline} />
            </div>
          </div>
        </Section>

        <Section title="What happened on the call?">
          <Pills options={OUTCOMES} value={outcome} onChange={setOutcome} />

          {outcome === "engaged" && (
            <div className="flex items-center gap-2.5 rounded-lg border bg-card p-3">
              <Checkbox id="ready" checked={readyNow} onCheckedChange={(c) => setReadyNow(c === true)} />
              <Label htmlFor="ready" className="cursor-pointer text-sm font-normal">
                Ready to buy now — book a meeting (otherwise they go into the drip for their planned purchase)
              </Label>
            </div>
          )}
          {outcome === "not_interested" && (
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Pills options={NI_REASONS} value={niReason} onChange={setNiReason} />
            </div>
          )}
          {outcome === "call_back_requested" && (
            <div className="space-y-1.5">
              <Label>Call back at</Label>
              <Input type="datetime-local" value={callbackAt} onChange={(e) => setCallbackAt(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Textarea rows={2} placeholder="Anything worth remembering from the call" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </Section>

        <div className="flex justify-end">
          <Button type="button" onClick={submit} disabled={isPending} className="gap-1.5">
            {isPending ? <><Loader2 className="size-4 animate-spin" />Adding…</> : <><CheckCircle2 className="size-4" />Add lead</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
