import { describe, it, expect } from "vitest"
import { employeeOf, groupLostByEmployee, countSapMismatches, sapStatusMeta } from "@/lib/lost-summary"
import type { LostLead } from "@/lib/types/lead"
import type { LostSapCheckMap } from "@/lib/api/leads"

const lead = (id: string, salesEmployee?: string | null): LostLead =>
  ({ id, name: `Dr ${id}`, phone: "9", equipment: "chair", reason: "x", salesEmployee } as unknown as LostLead)

describe("employeeOf", () => {
  it("falls back to Unassigned for null/blank", () => {
    expect(employeeOf(null)).toBe("Unassigned")
    expect(employeeOf("")).toBe("Unassigned")
    expect(employeeOf("   ")).toBe("Unassigned")
  })
  it("trims a real name", () => {
    expect(employeeOf("  Sudhir Pujar ")).toBe("Sudhir Pujar")
  })
})

describe("groupLostByEmployee", () => {
  it("counts per employee, highest first, blanks bucketed as Unassigned", () => {
    const rows = groupLostByEmployee([
      lead("1", "Sudhir Pujar"),
      lead("2", "Sudhir Pujar"),
      lead("3", "Sadul Singh"),
      lead("4", null),
    ])
    expect(rows).toEqual([
      ["Sudhir Pujar", 2],
      ["Sadul Singh", 1],
      ["Unassigned", 1],
    ])
  })
  it("returns [] for no leads", () => {
    expect(groupLostByEmployee([])).toEqual([])
  })
})

describe("countSapMismatches", () => {
  const leads = [lead("1"), lead("2"), lead("3")]
  it("is 0 when the SAP map is not loaded yet", () => {
    expect(countSapMismatches(leads, undefined)).toBe(0)
  })
  it("counts leads whose SAP status is not 'lost'", () => {
    const map: LostSapCheckMap = {
      "1": { sapStatus: "lost", sapStatusRaw: "sos_Missed", sapSalesPerson: null },
      "2": { sapStatus: "won", sapStatusRaw: "sos_Sold", sapSalesPerson: null },
      "3": { sapStatus: "open", sapStatusRaw: "sos_Open", sapSalesPerson: null },
    }
    expect(countSapMismatches(leads, map)).toBe(2)
  })
})

describe("sapStatusMeta", () => {
  it("marks only 'lost' as ok", () => {
    expect(sapStatusMeta("lost").ok).toBe(true)
    expect(sapStatusMeta("won").ok).toBe(false)
    expect(sapStatusMeta("open").ok).toBe(false)
    expect(sapStatusMeta("not_found").ok).toBe(false)
  })
  it("gives a human label per status", () => {
    expect(sapStatusMeta("lost").label).toMatch(/Lost/)
    expect(sapStatusMeta("won").label).toMatch(/WON/)
    expect(sapStatusMeta("open").label).toMatch(/Open/)
    expect(sapStatusMeta("not_found").label).toMatch(/not found/)
  })
})
