import { z } from "zod"

// Amendment 2 (Theme 7): the rep names the SALES EMPLOYEE on the same screen and
// reconfirms the address — both required, both gate the booking (which fires the
// automatic handover to the named employee).
export const physicalMeetingSchema = z.object({
  meetingAt: z.string().min(1, "Date and time are required"),
  location: z.string().trim().min(1, "Location is required"),
  salesUsername: z.string().min(1, "Assign a sales employee"),
  address: z.string().trim().min(1, "Reconfirm the lead address"),
  extraEmails: z.string().optional().default(""),
})

export type PhysicalMeetingValues = z.infer<typeof physicalMeetingSchema>

export const physicalMeetingDefaults: PhysicalMeetingValues = {
  meetingAt: "",
  location: "",
  salesUsername: "",
  address: "",
  extraEmails: "",
}
