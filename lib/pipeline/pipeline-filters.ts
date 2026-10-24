import type { DripTrack } from "@/lib/types/lead"

export type TrackFilter = "all" | DripTrack | "none" | "second-round"

export interface PipelineModalFilters {
  repliedOnly: boolean
  meetingPendingOnly: boolean
  unverifiedOnly: boolean
  flaggedOnly: boolean
  closeFrom: string
  closeTo: string
  closingCadenceOnly: boolean
}

// The system's "closing sprint" — the step at which a longer track switches to the
// fast 1-month calling rhythm (mirrors BAND_PACED_TRACKS.sprintStartIndex in the backend).
export const CLOSING_SPRINT_START: Record<string, number> = { "3-month": 13, "6-month": 20 }

// A lead is "in the 1-month closing cadence" if it is a native 1-month lead, or a
// 3/6-month lead that has reached its closing sprint.
export function inClosingCadence(lead: { dripTrack?: DripTrack | null; messagesSent?: number | null }): boolean {
  const track = lead.dripTrack
  if (track === "1-month") return true
  if (track === "3-month" || track === "6-month") {
    return (lead.messagesSent ?? 0) >= CLOSING_SPRINT_START[track]
  }
  return false
}

export interface TrackCounts {
  "1-month": number
  "3-month": number
  "6-month": number
  none: number
  "second-round": number
}

interface ModalFields {
  projectedClose?: Date | null
  meetingPending?: boolean | null
  phoneVerified?: boolean | null
  flagged?: boolean | null
  dripTrack?: DripTrack | null
  messagesSent?: number | null
}

interface TrackField {
  dripTrack?: DripTrack | null
  requalifyPending?: boolean | null
}

// A re-qualified ("second round") lead is bucketed on its own — NOT under its now-stale
// drip track nor "Not in drip" — so the pipeline stops mislabelling it as 1-Month.
export function trackBucket(l: TrackField): DripTrack | "none" | "second-round" {
  if (l.requalifyPending) return "second-round"
  if (l.dripTrack) return l.dripTrack
  return "none"
}

export function inCloseRange(
  projectedClose: Date | null | undefined,
  closeFrom: string,
  closeTo: string,
): boolean {
  if (!closeFrom && !closeTo) return true
  if (!projectedClose) return false
  const t = projectedClose.getTime()
  if (closeFrom && t < new Date(`${closeFrom}T00:00:00`).getTime()) return false
  if (closeTo && t > new Date(`${closeTo}T23:59:59`).getTime()) return false
  return true
}

export function applyModalFilters<T extends ModalFields>(
  leads: T[],
  f: PipelineModalFilters,
  isReplied: (l: T) => boolean,
): T[] {
  return leads
    .filter((l) => !f.repliedOnly || isReplied(l))
    .filter((l) => !f.meetingPendingOnly || !!l.meetingPending)
    .filter((l) => !f.unverifiedOnly || !l.phoneVerified)
    .filter((l) => inCloseRange(l.projectedClose, f.closeFrom, f.closeTo))
    .filter((l) => !f.flaggedOnly || !!l.flagged)
    .filter((l) => !f.closingCadenceOnly || inClosingCadence(l))
}

export function countTracks(leads: TrackField[]): TrackCounts {
  const by = (b: DripTrack | "none" | "second-round") => leads.filter((l) => trackBucket(l) === b).length
  return {
    "1-month": by("1-month"),
    "3-month": by("3-month"),
    "6-month": by("6-month"),
    none: by("none"),
    "second-round": by("second-round"),
  }
}

export function applyTrackFilter<T extends TrackField>(
  leads: T[],
  trackFilter: TrackFilter,
): T[] {
  if (trackFilter === "all") return leads
  return leads.filter((l) => trackBucket(l) === trackFilter)
}
