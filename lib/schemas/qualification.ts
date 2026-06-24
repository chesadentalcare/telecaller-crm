import { z } from "zod"

// Amendment 2 (Theme 3) — ONE qualification bar. The earlier two-stage rapid+full
// split is dropped; this is the UNION of every qualification field, all mandatory.
// Address is NOT here — it's reconfirmed only at physical-meeting booking (Theme 7).
// `route` mirrors the backend first_call_route the lead should take next.
export const qualificationSchema = z.object({
  phoneVerified: z.literal(true, {
    errorMap: () => ({ message: "Confirm the phone was verified" }),
  }),
  decisionMaker: z.string().trim().min(1, "Decision maker is required"),
  dentistType: z.string().min(1, "Pick a dentist type"),
  practiceType: z.string().min(1, "Pick a practice type"),
  timeline: z.string().min(1, "Pick a timeline"),
  budgetRange: z.string().min(1, "Pick a budget"),
  competitors: z.string().min(1, "Note a competitor (or 'None')"),
  fundingMethod: z.string().min(1, "Pick a funding method"),
  purchaseType: z.string().min(1, "Pick a purchase type"),
  route: z.string().min(1, "Pick a next-step route"),
})

export type QualificationValues = z.infer<typeof qualificationSchema>

export const qualificationDefaults: QualificationValues = {
  phoneVerified: true as const,
  decisionMaker: "",
  dentistType: "",
  practiceType: "",
  timeline: "",
  budgetRange: "",
  competitors: "",
  fundingMethod: "",
  purchaseType: "",
  route: "",
}

// Shared option lists (single source of truth for the qualification bar).
export const DENTIST_TYPES = [
  { value: "general_practitioner", label: "General Practitioner" },
  { value: "orthodontist", label: "Orthodontist" },
  { value: "endodontist", label: "Endodontist" },
  { value: "prosthodontist_implantologist", label: "Prosthodontist / Implantologist" },
  { value: "oral_maxillofacial_surgeon", label: "Oral / Maxillofacial Surgeon" },
  { value: "other", label: "Other" },
] as const

export const PRACTICE_TYPES = [
  { value: "solo_practice", label: "Solo Practice" },
  { value: "group_clinic", label: "Group Clinic" },
  { value: "multi_specialty_clinic", label: "Multi-Specialty Clinic" },
  { value: "chain_corporate", label: "Chain / Corporate" },
  { value: "hospital_or_academic", label: "Hospital / Academic" },
  { value: "other", label: "Other" },
] as const

export const TIMELINE_OPTIONS = [
  { value: "1_month", label: "1 Month", desc: "Buying soon" },
  { value: "3_months", label: "3 Months", desc: "Near term" },
  { value: "6_plus_months", label: "6+ Months", desc: "Long cycle" },
] as const

export const BUDGET_RANGES = [
  { value: "<5L", label: "Under ₹5L" },
  { value: "5-10L", label: "₹5L – ₹10L" },
  { value: "10-25L", label: "₹10L – ₹25L" },
  { value: "25L+", label: "₹25L+" },
] as const

export const COMPETITOR_OPTIONS = [
  "None", "Planmeca", "Sirona / Dentsply", "A-dec", "KaVo", "Belmont", "Local / Unbranded", "Other",
] as const

export const FUNDING_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "loan", label: "Loan / Finance" },
  { value: "not_sure", label: "Not sure yet" },
] as const

export const PURCHASE_TYPES = [
  { value: "new_setup", label: "New Setup" },
  { value: "upgrade", label: "Upgrade" },
  { value: "replacement", label: "Replacement" },
  { value: "expansion", label: "Expansion" },
] as const

export const ROUTE_OPTIONS = [
  { value: "online_meeting", label: "Online Meeting", desc: "Schedule video demo" },
  { value: "physical_meeting", label: "Physical Meeting", desc: "In-person clinic demo" },
  { value: "drip_info", label: "Add to Drip", desc: "Nurture over time" },
] as const
