const STAGE_LABELS: Record<string, string> = {
  new: "New",
  new_lead: "New",
  unqualified: "Unqualified",
  rapid_qualified: "Qualified",
  full_qualified: "Qualified",
  qualified: "Qualified",
  requalification: "Re-qualification",
  six_month_funnel: "In nurture",
  drip: "In nurture",
  physical_meeting_scheduled: "Physical meeting scheduled",
  zoom_meeting_done: "Online meeting done",
  meeting_scheduled: "Meeting scheduled",
  quotation_sent: "Quotation sent",
  sales_handover: "Handed to sales",
  handed_back: "Handed back",
  existing_customer: "Existing customer",
  dormant: "Dormant",
  archived: "Archived",
  closed_won: "Won",
  won: "Won",
  closed_lost: "Lost",
  lost: "Lost",
}

const TRACK_LABELS: Record<string, string> = {
  "1_month": "1-Month",
  "3_month": "3-Month",
  "6_plus_month": "6+ Month",
  "24_month": "24-Month",
}

export function stageLabel(stage?: string | null, track?: string | null): string {
  if (!stage) return "—"
  const base =
    STAGE_LABELS[stage] ||
    stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  if ((stage === "six_month_funnel" || stage === "drip") && track && TRACK_LABELS[track]) {
    return `${base} (${TRACK_LABELS[track]} track)`
  }
  return base
}
