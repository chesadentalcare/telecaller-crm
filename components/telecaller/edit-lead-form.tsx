"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { leadEditSchema, type LeadEditValues, INTEREST_LEVELS } from "@/lib/schemas/lead-edit"
import { BUDGET_RANGES, PURCHASE_TYPES } from "@/lib/schemas/qualification"
import { useUpdateLead } from "@/hooks/use-lead-mutations"
import { ApiError } from "@/lib/api/client"

// Amendment 2 (Theme 1) — "edit everything." Full-field lead editor used from the
// cockpit and the lead-detail header. Submits only the fields that changed (PATCH).
export function EditLeadForm({
  leadId,
  initial,
  onSaved,
}: {
  leadId: string | number
  initial: Partial<LeadEditValues>
  onSaved?: () => void
}) {
  const { mutateAsync: updateLead } = useUpdateLead(leadId)
  const { control, handleSubmit, formState } = useForm<LeadEditValues>({
    resolver: zodResolver(leadEditSchema),
    defaultValues: { ...initial },
    mode: "onChange",
  })
  const { isSubmitting, dirtyFields } = formState

  const onSubmit = async (values: LeadEditValues) => {
    // Send only the fields the rep actually changed.
    const changed: Partial<LeadEditValues> = {}
    for (const key of Object.keys(dirtyFields) as (keyof LeadEditValues)[]) {
      changed[key] = values[key] as never
    }
    if (Object.keys(changed).length === 0) {
      toast.info("No changes to save")
      onSaved?.()
      return
    }
    try {
      const res = await updateLead(changed)
      toast.success("Lead updated")
      if (res?.phoneReset) toast.info("Phone changed — re-verify the new number before calling.")
      if (res?.sapSynced === false) toast.warning("Saved, but the SAP sync failed — it will need a re-sync.")
      onSaved?.()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update lead")
    }
  }

  const text = (name: keyof LeadEditValues, label: string, placeholder?: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="space-y-1.5">
          <Label className="text-xs">{label}</Label>
          <Input className="h-9" placeholder={placeholder} value={(field.value as string) ?? ""} onChange={field.onChange} />
          {fieldState.error && <p className="text-[11px] text-destructive">{fieldState.error.message}</p>}
        </div>
      )}
    />
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {text("name", "Name")}
        {text("phone", "Phone")}
        {text("whatsappNumber", "WhatsApp number")}
        {text("email", "Email")}
        {text("city", "City")}
        {text("state", "State")}
        {text("pincode", "Pincode")}
        {text("address", "Address")}
        {text("equipment", "Equipment interest")}
        {text("source", "Source")}
        {text("category", "Category")}

        <Controller
          control={control}
          name="interestLevel"
          render={({ field }) => (
            <div className="space-y-1.5">
              <Label className="text-xs">Interest level</Label>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {INTEREST_LEVELS.map((o) => <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          control={control}
          name="budgetRange"
          render={({ field }) => (
            <div className="space-y-1.5">
              <Label className="text-xs">Budget range</Label>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGES.map((o) => <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          control={control}
          name="purchaseType"
          render={({ field }) => (
            <div className="space-y-1.5">
              <Label className="text-xs">Purchase type</Label>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {PURCHASE_TYPES.map((o) => <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        />
      </div>

      <Button type="submit" className="w-full h-9" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  )
}
