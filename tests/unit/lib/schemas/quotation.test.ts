import { describe, it, expect } from "vitest"
import { quotationSchema, quotationDefaults, emptyLineItem } from "@/lib/schemas/quotation"

const validLineItem = {
  itemCode: "DC-100",
  description: "Dental Chair",
  quantity: 2,
  unitPrice: 150000,
  taxGroup: "GST18",
  taxAmount: 27000,
}

const validQuotation = {
  opportunityDocEntry: 4200,
  customerCardCode: "C4200",
  customerName: "Dr. Asha Rao",
  lineItems: [validLineItem],
  validityDate: "2026-10-31",
  paymentTerms: "50% advance",
  discountPct: 10,
  meetingId: 7,
}

describe("quotationSchema", () => {
  it("parses a valid quotation", () => {
    const parsed = quotationSchema.parse(validQuotation)
    expect(parsed.opportunityDocEntry).toBe(4200)
    expect(parsed.lineItems).toHaveLength(1)
    expect(parsed.discountPct).toBe(10)
  })

  it("coerces numeric strings for docEntry, quantity and price", () => {
    const parsed = quotationSchema.parse({
      ...validQuotation,
      opportunityDocEntry: "4200",
      lineItems: [{ ...validLineItem, quantity: "3", unitPrice: "1000" }],
    })
    expect(parsed.opportunityDocEntry).toBe(4200)
    expect(parsed.lineItems[0].quantity).toBe(3)
    expect(parsed.lineItems[0].unitPrice).toBe(1000)
  })

  it("defaults discountPct and per-item taxAmount", () => {
    const parsed = quotationSchema.parse({
      opportunityDocEntry: 1,
      lineItems: [{ itemCode: "X", quantity: 1, unitPrice: 5 }],
      validityDate: "2026-10-31",
      paymentTerms: "net30",
    })
    expect(parsed.discountPct).toBe(0)
    expect(parsed.customerCardCode).toBe("")
    expect(parsed.lineItems[0].taxAmount).toBe(0)
  })

  it("requires at least one line item", () => {
    const res = quotationSchema.safeParse({ ...validQuotation, lineItems: [] })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "lineItems")
      expect(issue?.message).toBe("At least one line item is required")
    }
  })

  it("rejects a line item with quantity below 1", () => {
    const res = quotationSchema.safeParse({
      ...validQuotation,
      lineItems: [{ ...validLineItem, quantity: 0 }],
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.join(".") === "lineItems.0.quantity")).toBe(true)
    }
  })

  it("rejects a negative unit price on the item path", () => {
    const res = quotationSchema.safeParse({
      ...validQuotation,
      lineItems: [{ ...validLineItem, unitPrice: -1 }],
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.join(".") === "lineItems.0.unitPrice")
      expect(issue?.message).toBe("Price cannot be negative")
    }
  })

  it("requires an item code on each line item", () => {
    const res = quotationSchema.safeParse({
      ...validQuotation,
      lineItems: [{ ...validLineItem, itemCode: "" }],
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.join(".") === "lineItems.0.itemCode")
      expect(issue?.message).toBe("Item code is required")
    }
  })

  it("rejects an empty validity date and payment terms", () => {
    const res = quotationSchema.safeParse({
      ...validQuotation,
      validityDate: "",
      paymentTerms: "",
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      const paths = res.error.issues.map((i) => i.path[0])
      expect(paths).toContain("validityDate")
      expect(paths).toContain("paymentTerms")
    }
  })

  it("rejects a discount above 100", () => {
    const res = quotationSchema.safeParse({ ...validQuotation, discountPct: 101 })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path[0] === "discountPct")).toBe(true)
    }
  })

  it("has defaults with a single empty line item that fail validation", () => {
    expect(quotationDefaults.lineItems).toHaveLength(1)
    expect(quotationDefaults.lineItems[0]).toEqual(emptyLineItem)
    expect(quotationSchema.safeParse(quotationDefaults).success).toBe(false)
  })
})
