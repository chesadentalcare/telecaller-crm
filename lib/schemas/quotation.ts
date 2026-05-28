import { z } from "zod"

const lineItemSchema = z.object({
  itemCode: z.string().min(1, "Item code is required"),
  description: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "Min 1"),
  unitPrice: z.coerce.number().min(0, "Price cannot be negative"),
  taxGroup: z.string().optional(),
  taxAmount: z.coerce.number().min(0).default(0),
})

export const quotationSchema = z.object({
  opportunityDocEntry: z.coerce.number(),
  customerCardCode: z.string().default(""),
  customerName: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  validityDate: z.string().min(1, "Validity date is required"),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  meetingId: z.coerce.number().optional(),
})

export type QuotationValues = z.infer<typeof quotationSchema>
export type LineItemValues = z.infer<typeof lineItemSchema>

export const emptyLineItem: LineItemValues = {
  itemCode: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxGroup: "NONE",
  taxAmount: 0,
}

export const quotationDefaults: QuotationValues = {
  opportunityDocEntry: 0,
  customerCardCode: "",
  customerName: "",
  lineItems: [{ ...emptyLineItem }],
  validityDate: "",
  paymentTerms: "",
  discountPct: 0,
}
