import { z } from "zod"

export const physicalMeetingSchema = z.object({
  meetingAt: z.string().min(1, "Date and time are required"),
  location: z.string().trim().min(1, "Location is required"),
  extraEmails: z.string().optional().default(""),
})

export type PhysicalMeetingValues = z.infer<typeof physicalMeetingSchema>

export const physicalMeetingDefaults: PhysicalMeetingValues = {
  meetingAt: "",
  location: "",
  extraEmails: "",
}
