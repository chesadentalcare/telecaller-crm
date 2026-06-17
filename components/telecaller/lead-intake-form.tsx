"use client"

import { useState } from "react"
import { useForm, Controller, useWatch, type Control, type UseFormRegister, type FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  Phone, MapPin, CheckCircle2, Mail, MessageSquare, Home, Hash, MapIcon,
  Package, Wallet, Flame, User, Calendar, Loader2,
  ArrowLeft, ArrowRight, Check, Sparkles, Snowflake, Eye, Thermometer, Pencil,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useProducts } from "@/hooks/use-products"
import { useSapEmployees } from "@/hooks/use-sap-employees"
import { useSapSources } from "@/hooks/use-sap-sources"
import { useCreateLead } from "@/hooks/use-lead-mutations"
import { ApiError } from "@/lib/api/client"
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

// Sources are loaded dynamically from SAP — see useSapSources()

const CATEGORY_OPTIONS = [
  "Indian Products","Imported Products","Bundled Packages","Software & Services",
] as const

const INTEREST_LEVELS = [
  { value: "hot",            label: "Hot",      desc: "Ready to buy",    icon: Flame,       cls: "bg-red-500/10 text-red-600 border-red-500/40" },
  { value: "warm",           label: "Warm",     desc: "Strong interest", icon: Thermometer, cls: "bg-orange-500/10 text-orange-600 border-orange-500/40" },
  { value: "cold",           label: "Cold",     desc: "Just exploring",  icon: Snowflake,   cls: "bg-blue-500/10 text-blue-600 border-blue-500/40" },
  { value: "just_exploring", label: "Curious",  desc: "Window-shopping", icon: Eye,         cls: "bg-slate-500/10 text-slate-600 border-slate-500/40" },
] as const

const BUDGET_OPTIONS = [
  { value: "<5L",    label: "Under ₹5L",   tier: "Starter"                },
  { value: "5-10L",  label: "₹5L – ₹10L",  tier: "Growing Practice"       },
  { value: "10-25L", label: "₹10L – ₹25L", tier: "Established"            },
  { value: "25L+",   label: "₹25L+",       tier: "Premium / Multi-chair"  },
] as const

// Sales employees are now fetched live from SAP Ashva via useSapEmployees().

// ─── Step config ──────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: "Contact",  subtitle: "Who is the lead?",            icon: User         },
  { id: 2, title: "Location", subtitle: "Where are they based?",       icon: MapPin       },
  { id: 3, title: "Interest", subtitle: "What do they want?",          icon: Sparkles     },
  { id: 4, title: "Review",   subtitle: "Confirm & add to pipeline",   icon: CheckCircle2 },
] as const

type StepId = 1 | 2 | 3 | 4

// ─── Main component ────────────────────────────────────────────────────
export function LeadIntakeForm() {
  const [currentStep, setCurrentStep] = useState<StepId>(1)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [createdDocEntry, setCreatedDocEntry] = useState<number | null>(null)
  const { data: products, isLoading: productsLoading, error: productsError } = useProducts()
  const { data: salesEmployees, isLoading: employeesLoading } = useSapEmployees()
  const { data: sapSources, isLoading: sourcesLoading } = useSapSources()
  const { mutateAsync: createLead } = useCreateLead()

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
    try {
      const res = await createLead(values)
      setCreatedDocEntry(res.opportunityDocEntry)
      setSubmitSuccess(true)
      toast.success(`Lead created — Opp #${res.opportunityDocEntry}`)
      setTimeout(() => {
        reset(leadIntakeDefaults)
        setCurrentStep(1)
        setSubmitSuccess(false)
        setCreatedDocEntry(null)
      }, 2800)
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to create lead"
      toast.error(msg)
    }
  }

  // ── Success state ─────────────────────────────────────────────────
  if (submitSuccess) {
    const name = getValues("leadName")
    return (
      <Card className="overflow-hidden border-success/20">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent pointer-events-none" />
          <CardContent className="relative flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-success/10 mb-5 ring-8 ring-success/5">
              <CheckCircle2 className="size-8 text-success" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight">Lead added to pipeline</h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
              {name ? `${name} ` : "The lead "}has been logged and is ready for the first call.
            </p>
            {createdDocEntry !== null && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-success" />
                SAP Opportunity #<span className="font-mono font-medium text-foreground">{createdDocEntry}</span>
                <span className="text-muted-foreground/60">·</span> Synced to MySQL
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    )
  }

  const progressPct = (currentStep / STEPS.length) * 100
  const stepConfig = STEPS[currentStep - 1]
  const StepIcon = stepConfig.icon

  return (
    <Card className="overflow-hidden p-0 shadow-sm">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="lg:grid lg:grid-cols-[15rem_1fr]">
        {/* ── Desktop step rail ───────────────────────────────────── */}
        <aside className="hidden lg:flex lg:flex-col border-r bg-muted/30 p-6">
          <div className="mb-6">
            <h2 className="text-sm font-semibold tracking-tight">New Lead</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Four quick steps to add to the pipeline.</p>
          </div>
          <nav className="flex flex-col">
            {STEPS.map((s, i) => {
              const isActive = s.id === currentStep
              const isDone = s.id < currentStep
              const isFuture = s.id > currentStep
              const last = i === STEPS.length - 1
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => jumpTo(s.id as StepId)}
                  disabled={isFuture}
                  className={cn(
                    "group relative flex items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition",
                    isActive && "bg-card shadow-sm ring-1 ring-border",
                    !isActive && !isFuture && "hover:bg-card/60",
                    isFuture && "cursor-not-allowed",
                  )}
                >
                  <div className="relative flex flex-col items-center">
                    <span
                      className={cn(
                        "z-10 flex size-7 items-center justify-center rounded-full text-xs font-semibold transition",
                        isActive && "bg-primary text-primary-foreground shadow-sm",
                        isDone && "bg-success/15 text-success",
                        isFuture && "bg-muted text-muted-foreground ring-1 ring-border",
                      )}
                    >
                      {isDone ? <Check className="size-3.5" /> : s.id}
                    </span>
                    {!last && (
                      <span
                        className={cn(
                          "absolute left-1/2 top-7 h-[calc(100%+0.6rem)] w-px -translate-x-1/2",
                          isDone ? "bg-success/40" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <div
                      className={cn(
                        "text-sm font-medium leading-tight transition",
                        isActive ? "text-foreground" : isDone ? "text-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {s.title}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{s.subtitle}</div>
                  </div>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* ── Main column ─────────────────────────────────────────── */}
        <div className="flex min-h-[28rem] flex-col">
          {/* Mobile progress header */}
          <div className="border-b px-5 py-4 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <StepIcon className="size-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold tracking-tight">{stepConfig.title}</h2>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Step {currentStep} / {STEPS.length}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{stepConfig.subtitle}</p>
              </div>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Desktop step heading */}
          <div className="hidden items-center gap-3 border-b px-7 py-5 lg:flex">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <StepIcon className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight tracking-tight">{stepConfig.title}</h2>
              <p className="text-xs text-muted-foreground">{stepConfig.subtitle}</p>
            </div>
          </div>

          {/* Step body */}
          <div className="flex-1 px-5 py-6 sm:px-7">
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
                employees={salesEmployees ?? []}
                employeesLoading={employeesLoading}
                sapSources={sapSources ?? []}
                sourcesLoading={sourcesLoading}
              />
            )}
            {currentStep === 4 && (
              <Step4Review
                control={control}
                products={products}
                employees={salesEmployees ?? []}
                jumpTo={jumpTo}
              />
            )}
          </div>

          {/* Footer nav */}
          <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-5 py-3.5 sm:px-7">
            <Button type="button" variant="ghost" onClick={prevStep} disabled={currentStep === 1} className="gap-1.5">
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {currentStep < 4 ? (
              <Button type="button" onClick={nextStep} className="gap-1.5">
                Continue
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting} className="gap-1.5">
                {isSubmitting ? (
                  <><Loader2 className="size-4 animate-spin" />Adding Lead…</>
                ) : (
                  <><CheckCircle2 className="size-4" />Add Lead to Pipeline</>
                )}
              </Button>
            )}
          </div>
        </div>
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

// ─── Small presentational helpers ──────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

function Field({
  label, htmlFor, required, optional, hint, error, children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  optional?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
        {optional && <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError message={error} />
    </div>
  )
}

// A neutral panel that groups related controls (replaces the rainbow tint boxes).
function Panel({
  icon: Icon, title, children,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      {title && (
        <div className="flex items-center gap-2">
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          <span className="text-sm font-semibold">{title}</span>
        </div>
      )}
      {children}
    </div>
  )
}

const inputCls = "h-10"
const iconInputCls = "h-10 pl-10"
const leadingIcon = "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"

// ─── Step 1: Contact ──────────────────────────────────────────────────
function Step1Contact({ control, register, errors }: StepProps) {
  const phoneNumber = useWatch({ control, name: "phoneNumber" })
  const whatsappSameAsMobile = useWatch({ control, name: "whatsappSameAsMobile" })

  return (
    <div className="space-y-5">
      <Field label="Lead's Full Name" htmlFor="leadName" required error={errors.leadName?.message}>
        <div className="relative">
          <User className={leadingIcon} />
          <Input
            id="leadName"
            placeholder="Dr. Ramesh Sharma"
            {...register("leadName")}
            className={cn(iconInputCls, errors.leadName && "border-destructive focus-visible:ring-destructive")}
          />
        </div>
      </Field>

      <Field label="Mobile Number" htmlFor="phoneNumber" required error={errors.phoneNumber?.message}>
        <div className="relative">
          <Phone className={leadingIcon} />
          <Controller
            control={control}
            name="phoneNumber"
            render={({ field }) => (
              <Input
                id="phoneNumber"
                inputMode="numeric"
                placeholder="9876543210"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onBlur={field.onBlur}
                className={cn(iconInputCls, errors.phoneNumber && "border-destructive focus-visible:ring-destructive")}
              />
            )}
          />
        </div>
      </Field>

      <Panel>
        <div className="flex items-center gap-2.5">
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
          <Label htmlFor="whatsappSameAsMobile" className="cursor-pointer text-sm font-normal">
            WhatsApp is the same as mobile{phoneNumber ? ` (${phoneNumber})` : ""}
          </Label>
        </div>
        {!whatsappSameAsMobile && (
          <Field label="WhatsApp Number" htmlFor="whatsappNumber" required error={errors.whatsappNumber?.message}>
            <div className="relative">
              <MessageSquare className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#25D366]" />
              <Controller
                control={control}
                name="whatsappNumber"
                render={({ field }) => (
                  <Input
                    id="whatsappNumber"
                    inputMode="numeric"
                    placeholder="9876543210"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onBlur={field.onBlur}
                    className={cn(iconInputCls, errors.whatsappNumber && "border-destructive focus-visible:ring-destructive")}
                  />
                )}
              />
            </div>
          </Field>
        )}
      </Panel>

      <Field label="Email" htmlFor="email" optional error={errors.email?.message}>
        <div className="relative">
          <Mail className={leadingIcon} />
          <Input
            id="email"
            type="email"
            placeholder="dr.name@example.com"
            {...register("email")}
            className={cn(iconInputCls, errors.email && "border-destructive focus-visible:ring-destructive")}
          />
        </div>
      </Field>
    </div>
  )
}

// ─── Step 2: Location ──────────────────────────────────────────────────
function Step2Location({ control, register, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Saved to the dentist's billing &amp; shipping address in SAP.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-xs"
          onClick={() => toast.info("Map picker coming soon — Google Places integration lands in the next iteration.")}
        >
          <MapIcon className="size-3.5" />
          Pick on Map
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="State" required error={errors.state?.message}>
          <Controller
            control={control}
            name="state"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={cn(inputCls, "w-full", errors.state && "border-destructive")}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label="City" htmlFor="city" required error={errors.city?.message}>
          <div className="relative">
            <MapPin className={leadingIcon} />
            <Input
              id="city"
              placeholder="Mumbai"
              {...register("city")}
              className={cn(iconInputCls, errors.city && "border-destructive focus-visible:ring-destructive")}
            />
          </div>
        </Field>
      </div>

      <Field label="Pincode" htmlFor="pincode" required error={errors.pincode?.message}>
        <div className="relative">
          <Hash className={leadingIcon} />
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
                className={cn(iconInputCls, errors.pincode && "border-destructive focus-visible:ring-destructive")}
              />
            )}
          />
        </div>
      </Field>

      <Field
        label="Street Address"
        htmlFor="address"
        required
        error={errors.address?.message}
      >
        <Textarea
          id="address"
          placeholder="Building / Street / Landmark"
          rows={3}
          {...register("address")}
          className={cn("resize-none", errors.address && "border-destructive focus-visible:ring-destructive")}
        />
      </Field>
    </div>
  )
}

// ─── Step 3: Interest & Products ──────────────────────────────────────
interface Step3Props extends StepProps {
  products: { id: number; pname: string }[]
  productsLoading: boolean
  sapSources: { sequenceNo: number; description: string }[]
  sourcesLoading: boolean
  productsError: string | null
  employees: { employeeId: number; name: string; jobTitle: string | null }[]
  employeesLoading: boolean
}

function Step3Interest({
  control, errors, products, productsLoading, productsError,
  employees: salesEmployees, employeesLoading,
  sapSources, sourcesLoading,
}: Step3Props) {
  // Watch product1 so product2's options exclude it. Hook is at the top of
  // this component, not behind a conditional in the parent — rules-of-hooks.
  const currentProduct1Id = useWatch({ control, name: "product1Id" })
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Equipment Interest" required error={errors.equipmentInterest?.message}>
          <Controller
            control={control}
            name="equipmentInterest"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={cn(inputCls, "w-full", errors.equipmentInterest && "border-destructive")}>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label="Lead Source" required error={errors.source?.message}>
          <Controller
            control={control}
            name="source"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={cn(inputCls, "w-full", errors.source && "border-destructive")} disabled={sourcesLoading}>
                  <SelectValue placeholder={sourcesLoading ? "Loading sources…" : "How did they find us?"} />
                </SelectTrigger>
                <SelectContent>
                  {(sapSources ?? []).map((s) => (
                    <SelectItem key={s.sequenceNo} value={s.description}>{s.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      {/* Products */}
      <Panel icon={Package} title="Products of Interest">
        <Field label="Category" required error={errors.category?.message}>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={cn(inputCls, "w-full", errors.category && "border-destructive")}>
                  <SelectValue placeholder="Select one" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Product 1" required error={errors.product1Id?.message}>
            <Controller
              control={control}
              name="product1Id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={productsLoading}>
                  <SelectTrigger className={cn(inputCls, "w-full", errors.product1Id && "border-destructive")}>
                    {productsLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" />Loading…
                      </div>
                    ) : <SelectValue placeholder="Select a product" />}
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.pname}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {productsError && <p className="text-xs text-destructive">Failed: {productsError}</p>}
          </Field>

          <Field label="Product 2" optional>
            <Controller
              control={control}
              name="product2Id"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val) => field.onChange(val === "_none" ? "" : val)}
                  disabled={productsLoading}
                >
                  <SelectTrigger className={cn(inputCls, "w-full")}>
                    <SelectValue placeholder="Select (optional)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="_none" className="italic text-muted-foreground">None</SelectItem>
                    {products
                      .filter((p) => String(p.id) !== currentProduct1Id)
                      .map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.pname}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
      </Panel>

      {/* Interest level pills */}
      <Field label="How interested are they?" required error={errors.interestLevel?.message}>
        <Controller
          control={control}
          name="interestLevel"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {INTEREST_LEVELS.map((lvl) => {
                const I = lvl.icon
                const active = field.value === lvl.value
                return (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => field.onChange(lvl.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3.5 text-center transition",
                      active
                        ? cn(lvl.cls, "ring-2 ring-current ring-offset-1 ring-offset-card")
                        : "border-border bg-card hover:border-foreground/20 hover:bg-muted/40",
                    )}
                  >
                    <I className="size-5" />
                    <span className="text-sm font-semibold leading-none">{lvl.label}</span>
                    <span className="text-[11px] leading-none text-muted-foreground">{lvl.desc}</span>
                  </button>
                )
              })}
            </div>
          )}
        />
      </Field>

      {/* Budget */}
      <Field label="Budget Range" required error={errors.budget?.message}>
        <Controller
          control={control}
          name="budget"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {BUDGET_OPTIONS.map((b) => {
                const active = field.value === b.value
                return (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => field.onChange(b.value)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition",
                      active ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border bg-card hover:border-foreground/20 hover:bg-muted/40",
                    )}
                  >
                    <div className={cn("text-sm font-semibold", active && "text-primary")}>{b.label}</div>
                    <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{b.tier}</div>
                  </button>
                )
              })}
            </div>
          )}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Assigned Employee" required error={errors.ourEmployee?.message}>
          <Controller
            control={control}
            name="ourEmployee"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={employeesLoading}>
                <SelectTrigger className={cn(inputCls, "w-full", errors.ourEmployee && "border-destructive")}>
                  <SelectValue placeholder={employeesLoading ? "Loading employees…" : "Select employee"} />
                </SelectTrigger>
                <SelectContent>
                  {(salesEmployees ?? []).map((e) => (
                    <SelectItem key={e.employeeId} value={String(e.employeeId)}>
                      {e.name}{e.jobTitle ? ` · ${e.jobTitle}` : ""}
                    </SelectItem>
                  ))}
                  {!employeesLoading && salesEmployees?.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No active sales employees found</div>
                  )}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field
          label="Planned Purchase Date"
          htmlFor="expectedBy"
          required
          hint="“By when would you like the equipment installed?”"
          error={errors.expectedBy?.message}
        >
          <Input
            id="expectedBy"
            type="date"
            min={new Date().toISOString().split("T")[0]}
            {...control.register("expectedBy")}
            className={cn(inputCls, errors.expectedBy && "border-destructive focus-visible:ring-destructive")}
          />
        </Field>
      </div>
    </div>
  )
}

// ─── Step 4: Review ────────────────────────────────────────────────────
function Step4Review({
  control, products, employees, jumpTo,
}: {
  control: Control<LeadIntakeValues>
  products: { id: number; pname: string }[]
  employees: { employeeId: number; name: string }[]
  jumpTo: (s: StepId) => void
}) {
  // Watch all fields — Review is read-only so re-renders here cost nothing.
  const v = useWatch({ control })

  const p1 = products.find((p) => String(p.id) === v.product1Id)?.pname ?? "—"
  const p2 = products.find((p) => String(p.id) === v.product2Id)?.pname
  const emp = employees.find((e) => String(e.employeeId) === v.ourEmployee)?.name ?? "—"
  const lvl = INTEREST_LEVELS.find((l) => l.value === v.interestLevel)
  const bud = BUDGET_OPTIONS.find((b) => b.value === v.budget)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review the details below, then add the lead to the pipeline. Tap a section to edit.
      </p>

      <ReviewSection title="Contact" stepNumber={1} jumpTo={jumpTo} icon={User}>
        <Row label="Name" value={v.leadName} />
        <Row label="Mobile" value={v.phoneNumber} />
        <Row label="WhatsApp" value={v.whatsappSameAsMobile ? `${v.phoneNumber} (same as mobile)` : v.whatsappNumber} />
        <Row label="Email" value={v.email || "Not provided"} />
      </ReviewSection>

      <ReviewSection title="Location" stepNumber={2} jumpTo={jumpTo} icon={MapPin}>
        <Row label="Address" value={v.address} />
        <Row label="City / State" value={[v.city, v.state].filter(Boolean).join(", ")} />
        <Row label="Pincode" value={v.pincode} />
      </ReviewSection>

      <ReviewSection title="Interest" stepNumber={3} jumpTo={jumpTo} icon={Sparkles}>
        <Row label="Category" value={v.category} />
        <Row label="Equipment" value={v.equipmentInterest} />
        <Row label="Source" value={v.source} />
        <Row label="Product 1" value={p1} />
        {p2 && <Row label="Product 2" value={p2} />}
        <Row
          label="Interest"
          value={lvl ? (
            <Badge variant="outline" className={cn("gap-1", lvl.cls)}>
              <lvl.icon className="size-2.5" />{lvl.label}
            </Badge>
          ) : "—"}
        />
        <Row label="Budget" value={bud ? `${bud.label} · ${bud.tier}` : "—"} />
        <Row label="Assigned" value={emp} />
        <Row label="Planned date" value={v.expectedBy ? new Date(v.expectedBy).toLocaleDateString() : "—"} />
      </ReviewSection>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-right text-sm font-medium">{value || "—"}</span>
    </div>
  )
}

interface ReviewSectionProps {
  title: string
  stepNumber: 1 | 2 | 3
  jumpTo: (s: StepId) => void
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}

function ReviewSection({ title, stepNumber, jumpTo, icon: Icon, children }: ReviewSectionProps) {
  return (
    <button
      type="button"
      onClick={() => jumpTo(stepNumber)}
      className="group block w-full rounded-xl border bg-card p-4 text-left transition hover:border-foreground/20 hover:bg-muted/20"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-muted">
            <Icon className="size-3.5 text-muted-foreground" />
          </div>
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground transition group-hover:text-foreground">
          <Pencil className="size-3" />Edit
        </span>
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </button>
  )
}
