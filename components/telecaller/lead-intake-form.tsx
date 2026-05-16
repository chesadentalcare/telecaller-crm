"use client"

import { useState } from "react"
import { useForm, Controller, useWatch, type Control, type UseFormRegister, type FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  Phone, MapPin, CheckCircle2, Mail, MessageSquare, Home, Hash, MapIcon,
  Package, Wallet, Flame, User, Calendar, Loader2,
  ArrowLeft, ArrowRight, Check, Sparkles, Snowflake, Eye, Thermometer,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useProducts } from "@/hooks/use-products"
import { cn } from "@/lib/utils"
import {
  leadIntakeSchema,
  leadIntakeDefaults,
  STEP_FIELDS,
  type LeadIntakeValues,
} from "@/lib/schemas/lead-intake"

// ─── Static option lists ──────────────────────────────────────────────
const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
] as const

const EQUIPMENT_OPTIONS = [
  "Dental Chair","X-Ray Unit","Autoclave","Compressor","Handpiece","Scaler",
  "Light Cure","Imaging System","Other",
] as const

const SOURCE_OPTIONS = [
  "Website Inquiry","Trade Show","Referral","Cold Call","Social Media",
  "Google Ads","Email Campaign","Walk-in",
] as const

const CATEGORY_OPTIONS = [
  "Indian Products","Imported Products","Bundled Packages","Software & Services",
] as const

const INTEREST_LEVELS = [
  { value: "hot",            label: "Hot",      desc: "Ready to buy",    icon: Flame,       cls: "bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20" },
  { value: "warm",           label: "Warm",     desc: "Strong interest", icon: Thermometer, cls: "bg-orange-500/10 text-orange-600 border-orange-500/30 hover:bg-orange-500/20" },
  { value: "cold",           label: "Cold",     desc: "Just exploring",  icon: Snowflake,   cls: "bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20" },
  { value: "just_exploring", label: "Curious",  desc: "Window-shopping", icon: Eye,         cls: "bg-slate-500/10 text-slate-600 border-slate-500/30 hover:bg-slate-500/20" },
] as const

const BUDGET_OPTIONS = [
  { value: "<5L",    label: "Under ₹5L",   tier: "Starter"                  },
  { value: "5-10L",  label: "₹5L – ₹10L",  tier: "Growing Practice"         },
  { value: "10-25L", label: "₹10L – ₹25L", tier: "Established"              },
  { value: "25L+",   label: "₹25L+",       tier: "Premium / Multi-chair"   },
] as const

const EMPLOYEE_OPTIONS = [
  { id: "73", name: "Vivek Chahvan" },
  { id: "74", name: "Ravi Kumar" },
  { id: "75", name: "Anita Verma" },
  { id: "76", name: "Jagjit Singh" },
] as const

// ─── Step config ──────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: "Contact",  subtitle: "Who is the lead?",            icon: User,         accent: "text-blue-600",    bg: "bg-blue-500/10"    },
  { id: 2, title: "Location", subtitle: "Where are they?",             icon: MapPin,       accent: "text-emerald-600", bg: "bg-emerald-500/10" },
  { id: 3, title: "Interest", subtitle: "What do they want?",          icon: Sparkles,     accent: "text-amber-600",   bg: "bg-amber-500/10"   },
  { id: 4, title: "Review",   subtitle: "Confirm and add to pipeline", icon: CheckCircle2, accent: "text-violet-600",  bg: "bg-violet-500/10"  },
] as const

type StepId = 1 | 2 | 3 | 4

// ─── Main component ────────────────────────────────────────────────────
export function LeadIntakeForm() {
  const [currentStep, setCurrentStep] = useState<StepId>(1)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const { data: products, isLoading: productsLoading, error: productsError } = useProducts()

  const form = useForm<LeadIntakeValues>({
    resolver: zodResolver(leadIntakeSchema),
    defaultValues: leadIntakeDefaults,
    mode: "onTouched",
  })
  const { control, register, handleSubmit, trigger, reset, formState, getValues } = form
  const { errors, isSubmitting } = formState

  const nextStep = async () => {
    // Validate only the fields belonging to the current step. RHF won't flip
    // isValid on the whole form until everything passes — per-step is what
    // matters for the Next button.
    const fields = STEP_FIELDS[currentStep as 1 | 2 | 3]
    const ok = await trigger(fields)
    if (ok) setCurrentStep((s) => Math.min(s + 1, 4) as StepId)
    else toast.error("Please fix the highlighted fields")
  }

  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1) as StepId)

  const jumpTo = (step: StepId) => {
    if (step <= currentStep) setCurrentStep(step)
  }

  const onSubmit = async (values: LeadIntakeValues) => {
    // Stand-in for real submit; swap with a mutation once the API lands.
    await new Promise((r) => setTimeout(r, 800))
    setSubmitSuccess(true)
    setTimeout(() => {
      reset(leadIntakeDefaults)
      setCurrentStep(1)
      setSubmitSuccess(false)
    }, 2200)
  }

  // Success card
  if (submitSuccess) {
    const name = getValues("leadName")
    return (
      <Card className="overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
        <CardContent className="relative flex flex-col items-center justify-center py-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-success/10 mb-4 ring-4 ring-success/20">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <h3 className="text-lg font-semibold">Lead added to pipeline!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {name ? `${name} ` : "The lead "}has been logged and is ready for the first call.
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
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className={cn("flex size-11 items-center justify-center rounded-lg shrink-0", currentStepConfig.bg)}>
              <Icon className={cn("size-5", currentStepConfig.accent)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <CardTitle className="text-base">{currentStepConfig.title}</CardTitle>
                <span className="text-[11px] text-muted-foreground">Step {currentStep} of {STEPS.length}</span>
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
                  onClick={() => jumpTo(s.id as StepId)}
                  disabled={isFuture}
                  className={cn("flex items-center gap-1.5 group transition", isFuture && "opacity-40 cursor-not-allowed")}
                  aria-label={`Step ${s.id}: ${s.title}`}
                >
                  <div className={cn(
                    "flex size-6 items-center justify-center rounded-full text-[10px] font-semibold transition",
                    isActive && cn(s.bg, s.accent, "ring-2 ring-offset-1 ring-offset-card"),
                    isDone && "bg-success/15 text-success",
                    isFuture && "bg-muted text-muted-foreground",
                  )}>
                    {isDone ? <Check className="size-3" /> : s.id}
                  </div>
                  <span className={cn(
                    "text-[11px] hidden sm:inline transition",
                    isActive && "font-medium text-foreground",
                    isDone && "text-success",
                    isFuture && "text-muted-foreground",
                  )}>{s.title}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${progressPct}%` }} />
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {currentStep === 1 && <Step1Contact control={control} register={register} errors={errors} />}
          {currentStep === 2 && <Step2Location control={control} register={register} errors={errors} />}
          {currentStep === 3 && (
            <Step3Interest
              control={control}
              register={register}
              errors={errors}
              products={products}
              productsLoading={productsLoading}
              productsError={productsError}
            />
          )}
          {currentStep === 4 && <Step4Review control={control} products={products} jumpTo={jumpTo} />}
        </CardContent>

        <CardFooter className="flex justify-between gap-2 border-t bg-muted/30">
          <Button type="button" variant="ghost" onClick={prevStep} disabled={currentStep === 1} className="gap-1.5">
            <ArrowLeft className="size-4" />
            Back
          </Button>
          {currentStep < 4 ? (
            <Button type="button" onClick={nextStep} className="gap-1.5">
              Next
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? (
                <><Loader2 className="size-4 animate-spin" />Adding Lead...</>
              ) : (
                <><CheckCircle2 className="size-4" />Add Lead to Pipeline</>
              )}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}

// ─── Shared step prop shape ────────────────────────────────────────────
interface StepProps {
  control: Control<LeadIntakeValues>
  register: UseFormRegister<LeadIntakeValues>
  errors: FieldErrors<LeadIntakeValues>
}

// ─── Helpers ───────────────────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[11px] text-destructive">{message}</p>
}

// ─── Step 1: Contact ──────────────────────────────────────────────────
function Step1Contact({ control, register, errors }: StepProps) {
  const leadName = useWatch({ control, name: "leadName" })
  const phoneNumber = useWatch({ control, name: "phoneNumber" })
  const whatsappSameAsMobile = useWatch({ control, name: "whatsappSameAsMobile" })

  const initials = leadName?.trim()
    ? leadName.trim().split(" ").slice(-2).map((n) => n[0]).join("").toUpperCase()
    : "?"

  return (
    <div className="space-y-4">
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
            {...register("leadName")}
            className={cn("h-9", errors.leadName && "border-destructive focus-visible:ring-destructive")}
          />
          <FieldError message={errors.leadName?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phoneNumber" className="text-xs font-medium">
          Mobile Number <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Controller
            control={control}
            name="phoneNumber"
            render={({ field }) => (
              <Input
                id="phoneNumber"
                placeholder="9876543210"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onBlur={field.onBlur}
                className={cn("h-9 pl-9", errors.phoneNumber && "border-destructive focus-visible:ring-destructive")}
              />
            )}
          />
        </div>
        <FieldError message={errors.phoneNumber?.message} />
      </div>

      <div className="rounded-md bg-muted/40 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="whatsappSameAsMobile"
            render={({ field }) => (
              <Checkbox
                id="whatsappSameAsMobile"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            )}
          />
          <Label htmlFor="whatsappSameAsMobile" className="text-xs cursor-pointer">
            WhatsApp number is same as mobile {phoneNumber && `(${phoneNumber})`}
          </Label>
        </div>
        {!whatsappSameAsMobile && (
          <div className="space-y-1.5">
            <Label htmlFor="whatsappNumber" className="text-xs font-medium">
              WhatsApp Number <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#25D366]" />
              <Controller
                control={control}
                name="whatsappNumber"
                render={({ field }) => (
                  <Input
                    id="whatsappNumber"
                    placeholder="9876543210"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onBlur={field.onBlur}
                    className={cn("h-9 pl-9", errors.whatsappNumber && "border-destructive focus-visible:ring-destructive")}
                  />
                )}
              />
            </div>
            <FieldError message={errors.whatsappNumber?.message} />
          </div>
        )}
      </div>

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
            {...register("email")}
            className={cn("h-9 pl-9", errors.email && "border-destructive focus-visible:ring-destructive")}
          />
        </div>
        <FieldError message={errors.email?.message} />
      </div>
    </div>
  )
}

// ─── Step 2: Location ──────────────────────────────────────────────────
function Step2Location({ control, register, errors }: StepProps) {
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
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">State <span className="text-destructive">*</span></Label>
          <Controller
            control={control}
            name="state"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={cn("h-9", errors.state && "border-destructive")}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {INDIAN_STATES.map((s) => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.state?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city" className="text-xs font-medium">
            City <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="city"
              placeholder="Mumbai"
              {...register("city")}
              className={cn("h-9 pl-9", errors.city && "border-destructive focus-visible:ring-destructive")}
            />
          </div>
          <FieldError message={errors.city?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pincode" className="text-xs font-medium">
          Pincode <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Controller
            control={control}
            name="pincode"
            render={({ field }) => (
              <Input
                id="pincode"
                placeholder="400001"
                inputMode="numeric"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onBlur={field.onBlur}
                className={cn("h-9 pl-9", errors.pincode && "border-destructive focus-visible:ring-destructive")}
              />
            )}
          />
        </div>
        <FieldError message={errors.pincode?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address" className="text-xs font-medium flex items-center gap-1.5">
          <Home className="size-3.5 text-muted-foreground" />
          Street Address <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="address"
          placeholder="Building / Street / Landmark"
          rows={2}
          {...register("address")}
          className={cn(errors.address && "border-destructive focus-visible:ring-destructive")}
        />
        <FieldError message={errors.address?.message} />
      </div>
    </div>
  )
}

// ─── Step 3: Interest & Products ──────────────────────────────────────
interface Step3Props extends StepProps {
  products: { id: number; pname: string }[]
  productsLoading: boolean
  productsError: string | null
}

function Step3Interest({ control, errors, products, productsLoading, productsError }: Step3Props) {
  // Watch product1 so product2's options exclude it. Hook is at the top of
  // this component, not behind a conditional in the parent — rules-of-hooks.
  const currentProduct1Id = useWatch({ control, name: "product1Id" })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Equipment Interest <span className="text-destructive">*</span></Label>
          <Controller
            control={control}
            name="equipmentInterest"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={cn("h-9", errors.equipmentInterest && "border-destructive")}>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_OPTIONS.map((o) => <SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.equipmentInterest?.message} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Lead Source <span className="text-destructive">*</span></Label>
          <Controller
            control={control}
            name="source"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={cn("h-9", errors.source && "border-destructive")}>
                  <SelectValue placeholder="How did they find us?" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((o) => <SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.source?.message} />
        </div>
      </div>

      {/* Products */}
      <div className="rounded-md border bg-amber-500/5 p-3 space-y-3">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Package className="size-3.5 text-amber-600" />
          Products of Interest
        </Label>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Category <span className="text-destructive">*</span></Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={cn("h-9", errors.category && "border-destructive")}>
                  <SelectValue placeholder="Select one" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.category?.message} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Product 1 <span className="text-destructive">*</span></Label>
            <Controller
              control={control}
              name="product1Id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={productsLoading}>
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
              )}
            />
            {productsError && <p className="text-[11px] text-destructive">Failed: {productsError}</p>}
            <FieldError message={errors.product1Id?.message} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Product 2 <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Controller
              control={control}
              name="product2Id"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v === "_none" ? "" : v)}
                  disabled={productsLoading}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select (optional)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="_none" className="text-sm italic text-muted-foreground">None</SelectItem>
                    {products
                      .filter((p) => String(p.id) !== currentProduct1Id)
                      .map((p) => <SelectItem key={p.id} value={String(p.id)} className="text-sm">{p.pname}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>

      {/* Interest level pills */}
      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <Flame className="size-3.5 text-muted-foreground" />
          How interested are they? <span className="text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="interestLevel"
          render={({ field }) => (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {INTEREST_LEVELS.map((lvl) => {
                const I = lvl.icon
                const active = field.value === lvl.value
                return (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => field.onChange(lvl.value)}
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
          )}
        />
        <FieldError message={errors.interestLevel?.message} />
      </div>

      {/* Budget */}
      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <Wallet className="size-3.5 text-muted-foreground" />
          Budget Range <span className="text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="budget"
          render={({ field }) => (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BUDGET_OPTIONS.map((b) => {
                const active = field.value === b.value
                return (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => field.onChange(b.value)}
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
          )}
        />
        <FieldError message={errors.budget?.message} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <User className="size-3.5 text-muted-foreground" />
            Our Employee <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="ourEmployee"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={cn("h-9", errors.ourEmployee && "border-destructive")}>
                  <SelectValue placeholder="-- Select Employee --" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_OPTIONS.map((e) => <SelectItem key={e.id} value={e.id} className="text-sm">{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.ourEmployee?.message} />
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
            {...control.register("expectedBy")}
            className={cn("h-9", errors.expectedBy && "border-destructive focus-visible:ring-destructive")}
          />
          <p className="text-[10px] text-muted-foreground italic">
            "By when would you like the equipment installed?"
          </p>
          <FieldError message={errors.expectedBy?.message} />
        </div>
      </div>
    </div>
  )
}

// ─── Step 4: Review ────────────────────────────────────────────────────
function Step4Review({
  control, products, jumpTo,
}: {
  control: Control<LeadIntakeValues>
  products: { id: number; pname: string }[]
  jumpTo: (s: StepId) => void
}) {
  // Watch all fields — Review is read-only so re-renders here cost nothing.
  const v = useWatch({ control })

  const p1 = products.find((p) => String(p.id) === v.product1Id)?.pname ?? "—"
  const p2 = products.find((p) => String(p.id) === v.product2Id)?.pname
  const emp = EMPLOYEE_OPTIONS.find((e) => e.id === v.ourEmployee)?.name ?? "—"
  const lvl = INTEREST_LEVELS.find((l) => l.value === v.interestLevel)
  const bud = BUDGET_OPTIONS.find((b) => b.value === v.budget)

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-violet-500/5 border border-violet-500/20 p-3 text-center">
        <p className="text-xs text-muted-foreground">
          Final check before adding to the pipeline. Tap any section to edit.
        </p>
      </div>

      <ReviewSection title="Contact" stepNumber={1} jumpTo={jumpTo} accent="text-blue-600" bg="bg-blue-500/10" icon={User}>
        <Row label="Name" value={v.leadName} />
        <Row label="Mobile" value={v.phoneNumber} />
        <Row label="WhatsApp" value={v.whatsappSameAsMobile ? `${v.phoneNumber} (same as mobile)` : v.whatsappNumber} />
        <Row label="Email" value={v.email || "Not provided"} />
      </ReviewSection>

      <ReviewSection title="Location" stepNumber={2} jumpTo={jumpTo} accent="text-emerald-600" bg="bg-emerald-500/10" icon={MapPin}>
        <Row label="Address" value={v.address} />
        <Row label="City / State" value={`${v.city ?? ""}, ${v.state ?? ""}`} />
        <Row label="Pincode" value={v.pincode} />
      </ReviewSection>

      <ReviewSection title="Interest" stepNumber={3} jumpTo={jumpTo} accent="text-amber-600" bg="bg-amber-500/10" icon={Sparkles}>
        <Row label="Category" value={v.category} />
        <Row label="Equipment" value={v.equipmentInterest} />
        <Row label="Source" value={v.source} />
        <Row label="Product 1" value={p1} />
        {p2 && <Row label="Product 2" value={p2} />}
        <Row
          label="Interest"
          value={lvl ? (
            <Badge variant="outline" className={cn("text-[10px]", lvl.cls)}>
              <lvl.icon className="size-2.5 mr-1" />{lvl.label}
            </Badge>
          ) : "—"}
        />
        <Row label="Budget" value={bud ? `${bud.label} · ${bud.tier}` : "—"} />
        <Row label="Owner" value={emp} />
        <Row label="Expected by" value={v.expectedBy ? new Date(v.expectedBy).toLocaleDateString() : "—"} />
      </ReviewSection>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right truncate">{value || "—"}</span>
    </div>
  )
}

interface ReviewSectionProps {
  title: string
  stepNumber: 1 | 2 | 3
  jumpTo: (s: StepId) => void
  accent: string
  bg: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}

function ReviewSection({ title, stepNumber, jumpTo, accent, bg, icon: Icon, children }: ReviewSectionProps) {
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

