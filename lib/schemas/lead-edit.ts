import { z } from "zod"

// Amendment 2 (Theme 1): "edit everything, not just stage and notes." The full-field
// lead edit surface. Every field is optional — the cockpit sends only what changed and
// the backend (PATCH /leads/:id) updates only the supplied columns. Phone/contact edits
// write through to the SAP BusinessPartner; changing the phone resets verification.
export const leadEditSchema = z.object({
  name: z.string().trim().min(1, "Name can't be empty").optional(),
  phone: z.string().trim().min(7, "Enter a valid phone").optional(),
  whatsappNumber: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")).optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
  address: z.string().trim().optional(),
  equipment: z.string().trim().optional(),
  source: z.string().trim().optional(),
  category: z.string().trim().optional(),
  interestLevel: z.string().optional(),
  budgetRange: z.string().optional(),
  purchaseType: z.string().optional(),
})

export type LeadEditValues = z.infer<typeof leadEditSchema>

export const INTEREST_LEVELS = [
  { value: "cold", label: "Cold" },
  { value: "warm", label: "Warm" },
  { value: "hot", label: "Hot" },
  { value: "very_hot", label: "Very Hot" },
  { value: "just_exploring", label: "Just Exploring" },
] as const
