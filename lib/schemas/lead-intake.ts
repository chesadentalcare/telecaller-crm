import { z } from "zod"

// Indian mobile: starts 6-9, 10 digits.
const phoneRegex = /^[6-9]\d{9}$/
// Indian pincode: 6 digits, first not 0.
const pincodeRegex = /^[1-9][0-9]{5}$/

export const leadIntakeSchema = z
  .object({
    // Step 1 — Contact
    leadName: z.string().trim().min(2, "At least 2 characters"),
    phoneNumber: z.string().regex(phoneRegex, "Enter a valid 10-digit mobile"),
    whatsappSameAsMobile: z.boolean(),
    whatsappNumber: z.string(),
    email: z.union([z.literal(""), z.string().email("Enter a valid email")]),

    // Step 2 — Location
    state: z.string().min(1, "State is required"),
    city: z.string().trim().min(1, "City is required"),
    pincode: z.string().regex(pincodeRegex, "Enter a valid 6-digit pincode"),
    address: z.string().trim().min(1, "Address is required"),

    // Step 3 — Interest & Products
    equipmentInterest: z.string().min(1, "Pick an equipment"),
    source: z.string().min(1, "Lead source is required"),
    category: z.string().min(1, "Category is required"),
    product1Id: z.string().min(1, "Product 1 is required"),
    product2Id: z.string().optional().default(""),
    interestLevel: z.string().min(1, "Pick interest level"),
    budget: z.string().min(1, "Budget is required"),
    // The sales employee is assigned later, at the handover stage — not at
    // intake. No `ourEmployee` field here on purpose.
    expectedBy: z.string().min(1, "Expected date is required"),
  })
  // Cross-field rule: if WhatsApp isn't the same as mobile, the separate
  // WhatsApp field has to be a valid number. Attaching the error to the
  // `whatsappNumber` path lights up the right input.
  .refine(
    (data) => data.whatsappSameAsMobile || phoneRegex.test(data.whatsappNumber),
    { path: ["whatsappNumber"], message: "Enter a valid 10-digit number" },
  )

export type LeadIntakeValues = z.infer<typeof leadIntakeSchema>

export const leadIntakeDefaults: LeadIntakeValues = {
  leadName: "", phoneNumber: "",
  whatsappSameAsMobile: false, whatsappNumber: "",
  email: "",
  state: "", city: "", pincode: "", address: "",
  equipmentInterest: "", source: "",
  category: "", product1Id: "", product2Id: "",
  interestLevel: "", budget: "",
  expectedBy: "",
}

// Per-step field map — used by RHF's `trigger(stepFields[currentStep])` to
// validate only the visible fields when advancing. Adding a field to a step
// here is the only change required to make `Next` enforce it.
export const STEP_FIELDS = {
  1: ["leadName", "phoneNumber", "whatsappSameAsMobile", "whatsappNumber", "email"],
  2: ["state", "city", "pincode", "address"],
  3: [
    "equipmentInterest", "source", "category", "product1Id",
    "interestLevel", "budget", "expectedBy",
  ],
} as const satisfies Record<1 | 2 | 3, ReadonlyArray<keyof LeadIntakeValues>>
