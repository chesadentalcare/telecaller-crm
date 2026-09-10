import { describe, it, expect } from "vitest"
import { stageLabel } from "@/lib/stage-label"

describe("stageLabel", () => {
  it("returns an em dash when no stage is given", () => {
    expect(stageLabel()).toBe("—")
    expect(stageLabel(null)).toBe("—")
    expect(stageLabel("")).toBe("—")
    expect(stageLabel(undefined, "3_month")).toBe("—")
  })

  it("maps known stages to their friendly label", () => {
    expect(stageLabel("new")).toBe("New")
    expect(stageLabel("new_lead")).toBe("New")
    expect(stageLabel("rapid_qualified")).toBe("Qualified")
    expect(stageLabel("full_qualified")).toBe("Qualified")
    expect(stageLabel("qualified")).toBe("Qualified")
    expect(stageLabel("sales_handover")).toBe("Handed to sales")
    expect(stageLabel("closed_won")).toBe("Won")
    expect(stageLabel("won")).toBe("Won")
    expect(stageLabel("closed_lost")).toBe("Lost")
    expect(stageLabel("existing_customer")).toBe("Existing customer")
  })

  it("title-cases an unknown stage by replacing underscores", () => {
    expect(stageLabel("some_new_stage")).toBe("Some New Stage")
    expect(stageLabel("foobar")).toBe("Foobar")
  })

  it("appends the track suffix for nurture stages when a known track is given", () => {
    expect(stageLabel("six_month_funnel", "1_month")).toBe("In nurture (1-Month track)")
    expect(stageLabel("six_month_funnel", "6_plus_month")).toBe("In nurture (6+ Month track)")
    expect(stageLabel("drip", "3_month")).toBe("In nurture (3-Month track)")
    expect(stageLabel("drip", "24_month")).toBe("In nurture (24-Month track)")
  })

  it("omits the track suffix when the track is unknown or missing", () => {
    expect(stageLabel("six_month_funnel")).toBe("In nurture")
    expect(stageLabel("drip", null)).toBe("In nurture")
    expect(stageLabel("six_month_funnel", "99_month")).toBe("In nurture")
  })

  it("ignores the track for non-nurture stages", () => {
    expect(stageLabel("qualified", "3_month")).toBe("Qualified")
    expect(stageLabel("quotation_sent", "1_month")).toBe("Quotation sent")
  })
})
