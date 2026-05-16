"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  UserPlus, Phone, MapPin, CheckCircle2, Mail, MessageSquare, Home, Hash, MapIcon,
  Package, Wallet, Flame, User, Calendar, Loader2,
  ArrowLeft, ArrowRight, Check, Sparkles, Snowflake, Eye, Thermometer,
} from "lucide-react"
import { useProducts } from "@/hooks/use-products"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────
interface FormData {
  // Step 1 — Contact
  leadName: string
  phoneNumber: string
  whatsappSameAsMobile: boolean
  whatsappNumber: string
  email: string
  // Step 2 — Location
  state: string
  city: string
  pincode: string
  address: string
  // Step 3 — Interest & Products
  equipmentInterest: string
  source: string
  category: string
  product1Id: string
  product2Id: string
  interestLevel: string
  budget: string
  ourEmployee: string
  expectedBy: string
}

interface FormErrors {
  leadName?: string; phoneNumber?: string; whatsappNumber?: string; email?: string
  state?: string; city?: string; pincode?: string; address?: string
  equipmentInterest?: string; source?: string; category?: string; product1Id?: string
  interestLevel?: string; budget?: string; ourEmployee?: string; expectedBy?: string
}

const initialFormData: FormData = {
  leadName: "", phoneNumber: "",
  whatsappSameAsMobile: false, whatsappNumber: "",
  email: "",
  state: "", city: "", pincode: "", address: "",
  equipmentInterest: "", source: "",
  category: "", product1Id: "", product2Id: "",
  interestLevel: "", budget: "", ourEmployee: "",
  expectedBy: "",
}

// ─── Option lists ──────────────────────────────────────────────────────
const indianStates = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
]
const equipmentOptions = [
  "Dental Chair","X-Ray Unit","Autoclave","Compressor","Handpiece","Scaler",
  "Light Cure","Imaging System","Other",
]
const sourceOptions = [
  "Website Inquiry","Trade Show","Referral","Cold Call","Social Media",
  "Google Ads","Email Campaign","Walk-in",
]
const categoryOptions = ["Indian Products","Imported Products","Bundled Packages","Software & Services"]
const interestLevels = [
  { value: "hot",            label: "Hot",          desc: "Ready to buy",     icon: Flame,       cls: "bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20" },
  { value: "warm",           label: "Warm",         desc: "Strong interest",  icon: Thermometer, cls: "bg-orange-500/10 text-orange-600 border-orange-500/30 hover:bg-orange-500/20" },
  { value: "cold",           label: "Cold",         desc: "Just exploring",   icon: Snowflake,   cls: "bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20" },
  { value: "just_exploring", label: "Curious",      desc: "Window-shopping",  icon: Eye,         cls: "bg-slate-500/10 text-slate-600 border-slate-500/30 hover:bg-slate-500/20" },
]
const budgetOptions = [
  { value: "<5L",    label: "Under ₹5L",   tier: "Starter" },
  { value: "5-10L",  label: "₹5L – ₹10L",  tier: "Growing Practice" },
  { value: "10-25L", label: "₹10L – ₹25L", tier: "Established" },
  { value: "25L+",   label: "₹25L+",       tier: "Premium / Multi-chair" },
]
const employeeOptions = [
  { id: "73", name: "Vivek Chahvan" },
  { id: "74", name: "Ravi Kumar" },
  { id: "75", name: "Anita Verma" },
  { id: "76", name: "Jagjit Singh" },
]

// ─── Step config ──────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: "Contact",  subtitle: "Who is the lead?",          icon: User,     accent: "text-blue-600",   bg: "bg-blue-500/10" },
  { id: 2, title: "Location", subtitle: "Where are they?",           icon: MapPin,   accent: "text-emerald-600", bg: "bg-emerald-500/10" },
  { id: 3, title: "Interest", subtitle: "What do they want?",        icon: Sparkles, accent: "text-amber-600",   bg: "bg-amber-500/10" },
  { id: 4, title: "Review",   subtitle: "Confirm and add to pipeline", icon: CheckCircle2, accent: "text-violet-600", bg: "bg-violet-500/10" },
] as const

// ─── Main component ────────────────────────────────────────────────────
export function LeadIntakeForm() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const { data: products, isLoading: productsLoading, error: productsError } = useProducts()

  // Per-step validation
  const validateStep = (step: number): boolean => {
    const e: FormErrors = {}
    const phoneRegex = /^[6-9]\d{9}$/
    const pincodeRegex = /^[1-9][0-9]{5}$/

    if (step === 1) {
      if (!formData.leadName.trim()) e.leadName = "Lead name is required"
      else if (formData.leadName.length < 2) e.leadName = "At least 2 characters"
      if (!formData.phoneNumber.trim()) e.phoneNumber = "Mobile number is required"
      else if (!phoneRegex.test(formData.phoneNumber)) e.phoneNumber = "Enter a valid 10-digit mobile"
      if (!formData.whatsappSameAsMobile) {
        if (!formData.whatsappNumber.trim()) e.whatsappNumber = "WhatsApp number is required"
        else if (!phoneRegex.test(formData.whatsappNumber)) e.whatsappNumber = "Enter a valid 10-digit number"
      }
      if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        e.email = "Enter a valid email"
      }
    }

    if (step === 2) {
      if (!formData.state) e.state = "State is required"
      if (!formData.city.trim()) e.city = "City is required"
      if (!formData.pincode.trim()) e.pincode = "Pincode is required"
      else if (!pincodeRegex.test(formData.pincode)) e.pincode = "Enter a valid 6-digit pincode"
      if (!formData.address.trim()) e.address = "Address is required"
    }

    if (step === 3) {
      if (!formData.equipmentInterest) e.equipmentInterest = "Pick an equipment"
      if (!formData.source) e.source = "Lead source is required"
      if (!formData.category) e.category = "Category is required"
      if (!formData.product1Id) e.product1Id = "Product 1 is required"
      if (!formData.interestLevel) e.interestLevel = "Pick interest level"
      if (!formData.budget) e.budget = "Budget is required"
      if (!formData.ourEmployee) e.ourEmployee = "Pick an employee"
      if (!formData.expectedBy) e.expectedBy = "Expected date is required"
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => (Math.min(s + 1, 4) as 1 | 2 | 3 | 4))
    } else {
      toast.error("Please fix the highlighted fields")
    }
  }
  const prevStep = () => setCurrentStep((s) => (Math.max(s - 1, 1) as 1 | 2 | 3 | 4))
  const jumpTo = (step: 1 | 2 | 3 | 4) => {
    // Only allow jumping to a completed step (any step < currentStep) or current
    if (step <= currentStep) setCurrentStep(step)
  }

  const handleSubmit = async () => {
    if (![1, 2, 3].every((s) => validateStep(s))) {
      toast.error("Please fix the highlighted fields")
      return
    }
    setIsSubmitting(true)
    await new Promise((r) => setTimeout(r, 800))
    setIsSubmitting(false)
    setSubmitSuccess(true)
    setTimeout(() => {
      setFormData(initialFormData)
      setCurrentStep(1)
      setSubmitSuccess(false)
    }, 2200)
  }

  // Success card
  if (submitSuccess) {
    return (
      <Card className="overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
        <CardContent className="relative flex flex-col items-center justify-center py-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-success/10 mb-4 ring-4 ring-success/20">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <h3 className="text-lg font-semibold">Lead added to pipeline!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {formData.leadName ? `${formData.leadName} ` : "The lead "}
            has been logged and is ready for the first call.
          </p>
        </CardContent>
      </Card>
    )
  }

  const currentStepConfig = STEPS[currentStep - 1]
  const Icon = currentStepConfig.icon
  const progressPct = (currentStep / STEPS.length) * 100

  return (
    <Card className="overflow-hidden shadow-sm">
      {/* Header with progress strip */}
      <div className="relative">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className={cn("flex size-11 items-center justify-center rounded-lg shrink-0", currentStepConfig.bg)}>
              <Icon className={cn("size-5", currentStepConfig.accent)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <CardTitle className="text-base">{currentStepConfig.title}</CardTitle>
                <span className="text-[11px] text-muted-foreground">
                  Step {currentStep} of {STEPS.length}
                </span>
              </div>
              <CardDescription className="text-xs">{currentStepConfig.subtitle}</CardDescription>
            </div>
          </div>

          {/* Step dots */}
          <div className="mt-4 flex items-center gap-1.5">
            {STEPS.map((s) => {
              const isActive = s.id === currentStep
              const isDone = s.id < currentStep
              const isFuture = s.id > currentStep
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => jumpTo(s.id as 1 | 2 | 3 | 4)}
                  disabled={isFuture}
                  className={cn(
                    "flex items-center gap-1.5 group transition",
                    isFuture && "opacity-40 cursor-not-allowed",
                  )}
                  aria-label={`Step ${s.id}: ${s.title}`}
                >
                  <div
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-[10px] font-semibold transition",
                      isActive && cn(s.bg, s.accent, "ring-2 ring-offset-1 ring-offset-card", s.accent.replace("text-", "ring-")),
                      isDone && "bg-success/15 text-success",
                      isFuture && "bg-muted text-muted-foreground",
                    )}
                  >
                    {isDone ? <Check className="size-3" /> : s.id}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] hidden sm:inline transition",
                      isActive && "font-medium text-foreground",
                      isDone && "text-success",
                      isFuture && "text-muted-foreground",
                    )}
                  >
                    {s.title}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Linear progress bar */}
          <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </CardHeader>
      </div>

      <CardContent className="pt-2">
        {currentStep === 1 && <Step1Contact formData={formData} setFormData={setFormData} errors={errors} />}
        {currentStep === 2 && <Step2Location formData={formData} setFormData={setFormData} errors={errors} />}
        {currentStep === 3 && (
          <Step3Interest
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            products={products}
            productsLoading={productsLoading}
            productsError={productsError}
          />
        )}
        {currentStep === 4 && <Step4Review formData={formData} products={products} jumpTo={jumpTo} />}
      </CardContent>

      <CardFooter className="flex justify-between gap-2 border-t bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        {currentStep < 4 ? (
          <Button type="button" onClick={nextStep} className="gap-1.5">
            Next
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="gap-1.5">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Adding Lead...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Add Lead to Pipeline
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

// ─── Step 1: Contact ──────────────────────────────────────────────────
function Step1Contact({
  formData, setFormData, errors,
}: {
  formData: FormData
  setFormData: (f: FormData) => void
  errors: FormErrors
}) {
  // Avatar initials preview
  const initials = formData.leadName.trim()
    ? formData.leadName.trim().split(" ").slice(-2).map((n) => n[0]).join("").toUpperCase()
    : "?"

  return (
    <div className="space-y-4">
      {/* Avatar preview + Lead name */}
      <div className="flex items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-semibold shrink-0">
          {initials}
        </div>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="leadName" className="text-xs font-medium">
            Lead's Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="leadName"
            placeholder="Dr. Ramesh Sharma"
            value={formData.leadName}
            onChange={(e) => setFormData({ ...formData, leadName: e.target.value })}
            className={cn("h-9", errors.leadName && "border-destructive focus-visible:ring-destructive")}
          />
          {errors.leadName && <p className="text-[11px] text-destructive">{errors.leadName}</p>}
        </div>
      </div>

      {/* Mobile */}
      <div className="space-y-1.5">
        <Label htmlFor="phoneNumber" className="text-xs font-medium">
          Mobile Number <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="phoneNumber"
            placeholder="9876543210"
            value={formData.phoneNumber}
            onChange={(e) =>
              setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })
            }
            className={cn("h-9 pl-9", errors.phoneNumber && "border-destructive focus-visible:ring-destructive")}
          />
        </div>
        {errors.phoneNumber && <p className="text-[11px] text-destructive">{errors.phoneNumber}</p>}
      </div>

      {/* WhatsApp toggle */}
      <div className="rounded-md bg-muted/40 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="whatsappSameAsMobile"
            checked={formData.whatsappSameAsMobile}
            onCheckedChange={(checked) =>
              setFormData({
                ...formData,
                whatsappSameAsMobile: checked === true,
                whatsappNumber: checked === true ? "" : formData.whatsappNumber,
              })
            }
          />
          <Label htmlFor="whatsappSameAsMobile" className="text-xs cursor-pointer">
            WhatsApp number is same as mobile
          </Label>
        </div>
        {!formData.whatsappSameAsMobile && (
          <div className="space-y-1.5">
            <Label htmlFor="whatsappNumber" className="text-xs font-medium">
              WhatsApp Number <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#25D366]" />
              <Input
                id="whatsappNumber"
                placeholder="9876543210"
                value={formData.whatsappNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    whatsappNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                className={cn("h-9 pl-9", errors.whatsappNumber && "border-destructive focus-visible:ring-destructive")}
              />
            </div>
            {errors.whatsappNumber && <p className="text-[11px] text-destructive">{errors.whatsappNumber}</p>}
          </div>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-medium">
          Email <span className="text-muted-foreground">(optional)</span>
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="dr.name@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={cn("h-9 pl-9", errors.email && "border-destructive focus-visible:ring-destructive")}
          />
        </div>
        {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
      </div>
    </div>
  )
}

// ─── Step 2: Location ──────────────────────────────────────────────────
function Step2Location({
  formData, setFormData, errors,
}: {
  formData: FormData
  setFormData: (f: FormData) => void
  errors: FormErrors
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 rounded-md bg-emerald-500/5 border border-emerald-500/20 p-2.5">
        <p className="text-xs text-muted-foreground">
          📍 Saves to the dentist's billing & shipping address in SAP.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => toast.info("Map picker coming soon — Google Places integration will land in the next iteration.")}
        >
          <MapIcon className="size-3.5" />
          Pick on Map
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* State */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">State <span className="text-destructive">*</span></Label>
          <Select value={formData.state} onValueChange={(v) => setFormData({ ...formData, state: v })}>
            <SelectTrigger className={cn("h-9", errors.state && "border-destructive")}>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {indianStates.map((s) => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.state && <p className="text-[11px] text-destructive">{errors.state}</p>}
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <Label htmlFor="city" className="text-xs font-medium">City <span className="text-destructive">*</span></Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="city"
              placeholder="Mumbai"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className={cn("h-9 pl-9", errors.city && "border-destructive focus-visible:ring-destructive")}
            />
          </div>
          {errors.city && <p className="text-[11px] text-destructive">{errors.city}</p>}
        </div>
      </div>

      {/* Pincode */}
      <div className="space-y-1.5">
        <Label htmlFor="pincode" className="text-xs font-medium">Pincode <span className="text-destructive">*</span></Label>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="pincode"
            placeholder="400001"
            inputMode="numeric"
            value={formData.pincode}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
            className={cn("h-9 pl-9", errors.pincode && "border-destructive focus-visible:ring-destructive")}
          />
        </div>
        {errors.pincode && <p className="text-[11px] text-destructive">{errors.pincode}</p>}
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address" className="text-xs font-medium flex items-center gap-1.5">
          <Home className="size-3.5 text-muted-foreground" />
          Street Address <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="address"
          placeholder="Building / Street / Landmark"
          rows={2}
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className={cn(errors.address && "border-destructive focus-visible:ring-destructive")}
        />
        {errors.address && <p className="text-[11px] text-destructive">{errors.address}</p>}
      </div>
    </div>
  )
}

// ─── Step 3: Interest & Products ──────────────────────────────────────
function Step3Interest({
  formData, setFormData, errors, products, productsLoading, productsError,
}: {
  formData: FormData
  setFormData: (f: FormData) => void
  errors: FormErrors
  products: { id: number; pname: string }[]
  productsLoading: boolean
  productsError: string | null
}) {
  return (
    <div className="space-y-4">
      {/* Equipment Interest + Source */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Equipment Interest <span className="text-destructive">*</span></Label>
          <Select value={formData.equipmentInterest} onValueChange={(v) => setFormData({ ...formData, equipmentInterest: v })}>
            <SelectTrigger className={cn("h-9", errors.equipmentInterest && "border-destructive")}>
              <SelectValue placeholder="Select equipment" />
            </SelectTrigger>
            <SelectContent>
              {equipmentOptions.map((o) => <SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.equipmentInterest && <p className="text-[11px] text-destructive">{errors.equipmentInterest}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Lead Source <span className="text-destructive">*</span></Label>
          <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
            <SelectTrigger className={cn("h-9", errors.source && "border-destructive")}>
              <SelectValue placeholder="How did they find us?" />
            </SelectTrigger>
            <SelectContent>
              {sourceOptions.map((o) => <SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.source && <p className="text-[11px] text-destructive">{errors.source}</p>}
        </div>
      </div>

      {/* Products card */}
      <div className="rounded-md border bg-amber-500/5 p-3 space-y-3">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Package className="size-3.5 text-amber-600" />
          Products of Interest
        </Label>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Category <span className="text-destructive">*</span></Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger className={cn("h-9", errors.category && "border-destructive")}>
              <SelectValue placeholder="Select one" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((c) => <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-[11px] text-destructive">{errors.category}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Product 1 <span className="text-destructive">*</span></Label>
            <Select
              value={formData.product1Id}
              onValueChange={(v) => setFormData({ ...formData, product1Id: v })}
              disabled={productsLoading}
            >
              <SelectTrigger className={cn("h-9", errors.product1Id && "border-destructive")}>
                {productsLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />Loading...
                  </div>
                ) : <SelectValue placeholder="Select a product" />}
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {products.map((p) => <SelectItem key={p.id} value={String(p.id)} className="text-sm">{p.pname}</SelectItem>)}
              </SelectContent>
            </Select>
            {productsError && <p className="text-[11px] text-destructive">Failed: {productsError}</p>}
            {errors.product1Id && <p className="text-[11px] text-destructive">{errors.product1Id}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Product 2 <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Select
              value={formData.product2Id}
              onValueChange={(v) => setFormData({ ...formData, product2Id: v === "_none" ? "" : v })}
              disabled={productsLoading}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select (optional)" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="_none" className="text-sm italic text-muted-foreground">None</SelectItem>
                {products.filter((p) => String(p.id) !== formData.product1Id).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-sm">{p.pname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Interest Level as colored pill selector */}
      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <Flame className="size-3.5 text-muted-foreground" />
          How interested are they? <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {interestLevels.map((lvl) => {
            const I = lvl.icon
            const active = formData.interestLevel === lvl.value
            return (
              <button
                key={lvl.value}
                type="button"
                onClick={() => setFormData({ ...formData, interestLevel: lvl.value })}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-3 transition text-center",
                  active ? lvl.cls + " ring-2 ring-offset-1 ring-current" : "bg-card border-border hover:bg-muted/50",
                )}
              >
                <I className="size-5" />
                <span className="text-xs font-semibold leading-none">{lvl.label}</span>
                <span className="text-[10px] text-muted-foreground leading-none">{lvl.desc}</span>
              </button>
            )
          })}
        </div>
        {errors.interestLevel && <p className="text-[11px] text-destructive">{errors.interestLevel}</p>}
      </div>

      {/* Budget */}
      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <Wallet className="size-3.5 text-muted-foreground" />
          Budget Range <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {budgetOptions.map((b) => {
            const active = formData.budget === b.value
            return (
              <button
                key={b.value}
                type="button"
                onClick={() => setFormData({ ...formData, budget: b.value })}
                className={cn(
                  "rounded-lg border-2 px-3 py-2.5 transition text-left",
                  active ? "border-primary bg-primary/5" : "bg-card border-border hover:bg-muted/50",
                )}
              >
                <div className={cn("text-sm font-semibold", active && "text-primary")}>{b.label}</div>
                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{b.tier}</div>
              </button>
            )
          })}
        </div>
        {errors.budget && <p className="text-[11px] text-destructive">{errors.budget}</p>}
      </div>

      {/* Employee + Expected Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <User className="size-3.5 text-muted-foreground" />
            Our Employee <span className="text-destructive">*</span>
          </Label>
          <Select value={formData.ourEmployee} onValueChange={(v) => setFormData({ ...formData, ourEmployee: v })}>
            <SelectTrigger className={cn("h-9", errors.ourEmployee && "border-destructive")}>
              <SelectValue placeholder="-- Select Employee --" />
            </SelectTrigger>
            <SelectContent>
              {employeeOptions.map((e) => <SelectItem key={e.id} value={e.id} className="text-sm">{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.ourEmployee && <p className="text-[11px] text-destructive">{errors.ourEmployee}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="expectedBy" className="text-xs font-medium flex items-center gap-1.5">
            <Calendar className="size-3.5 text-muted-foreground" />
            When do they plan to buy? <span className="text-destructive">*</span>
          </Label>
          <Input
            id="expectedBy"
            type="date"
            min={new Date().toISOString().split("T")[0]}
            value={formData.expectedBy}
            onChange={(e) => setFormData({ ...formData, expectedBy: e.target.value })}
            className={cn("h-9", errors.expectedBy && "border-destructive focus-visible:ring-destructive")}
          />
          <p className="text-[10px] text-muted-foreground italic">
            "By when would you like the equipment installed?"
          </p>
          {errors.expectedBy && <p className="text-[11px] text-destructive">{errors.expectedBy}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Step 4: Review ────────────────────────────────────────────────────
function Step4Review({
  formData, products, jumpTo,
}: {
  formData: FormData
  products: { id: number; pname: string }[]
  jumpTo: (s: 1 | 2 | 3 | 4) => void
}) {
  const p1 = products.find((p) => String(p.id) === formData.product1Id)?.pname ?? "—"
  const p2 = products.find((p) => String(p.id) === formData.product2Id)?.pname
  const emp = employeeOptions.find((e) => e.id === formData.ourEmployee)?.name ?? "—"
  const lvl = interestLevels.find((l) => l.value === formData.interestLevel)
  const bud = budgetOptions.find((b) => b.value === formData.budget)

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-baseline justify-between gap-2 py-1">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right truncate">{value || "—"}</span>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-violet-500/5 border border-violet-500/20 p-3 text-center">
        <p className="text-xs text-muted-foreground">
          Final check before adding to the pipeline. Tap any section to edit.
        </p>
      </div>

      {/* Contact summary */}
      <ReviewSection title="Contact" stepNumber={1} jumpTo={jumpTo} accent="text-blue-600" bg="bg-blue-500/10" icon={User}>
        <Row label="Name" value={formData.leadName} />
        <Row label="Mobile" value={formData.phoneNumber} />
        <Row label="WhatsApp" value={formData.whatsappSameAsMobile ? `${formData.phoneNumber} (same as mobile)` : formData.whatsappNumber} />
        <Row label="Email" value={formData.email || "Not provided"} />
      </ReviewSection>

      {/* Location summary */}
      <ReviewSection title="Location" stepNumber={2} jumpTo={jumpTo} accent="text-emerald-600" bg="bg-emerald-500/10" icon={MapPin}>
        <Row label="Address" value={formData.address} />
        <Row label="City / State" value={`${formData.city}, ${formData.state}`} />
        <Row label="Pincode" value={formData.pincode} />
      </ReviewSection>

      {/* Interest summary */}
      <ReviewSection title="Interest" stepNumber={3} jumpTo={jumpTo} accent="text-amber-600" bg="bg-amber-500/10" icon={Sparkles}>
        <Row label="Category" value={formData.category} />
        <Row label="Equipment" value={formData.equipmentInterest} />
        <Row label="Source" value={formData.source} />
        <Row label="Product 1" value={p1} />
        {p2 && <Row label="Product 2" value={p2} />}
        <Row
          label="Interest"
          value={
            lvl ? (
              <Badge variant="outline" className={cn("text-[10px]", lvl.cls)}>
                <lvl.icon className="size-2.5 mr-1" />
                {lvl.label}
              </Badge>
            ) : "—"
          }
        />
        <Row label="Budget" value={bud ? `${bud.label} · ${bud.tier}` : "—"} />
        <Row label="Owner" value={emp} />
        <Row
          label="Expected by"
          value={formData.expectedBy ? new Date(formData.expectedBy).toLocaleDateString() : "—"}
        />
      </ReviewSection>
    </div>
  )
}

function ReviewSection({
  title, stepNumber, jumpTo, accent, bg, icon: Icon, children,
}: {
  title: string
  stepNumber: 1 | 2 | 3
  jumpTo: (s: 1 | 2 | 3 | 4) => void
  accent: string
  bg: string
  icon: any
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => jumpTo(stepNumber)}
      className="block w-full text-left rounded-md border bg-card p-3 hover:bg-muted/30 transition group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn("flex size-7 items-center justify-center rounded-md", bg)}>
            <Icon className={cn("size-3.5", accent)} />
          </div>
          <span className="text-xs font-semibold">{title}</span>
        </div>
        <span className="text-[10px] text-muted-foreground group-hover:text-foreground">Edit</span>
      </div>
      <div className="space-y-0">{children}</div>
    </button>
  )
}
