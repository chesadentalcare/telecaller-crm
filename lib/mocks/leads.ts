// Fixture data. The repository layer reads from here until the backend ships.
// When wiring real endpoints, delete these and point fetch* at the API.

import type {
  PipelineLead,
  DripLead,
  NoResponseLead,
  IdleLead,
  DormantLead,
  ReactivationLead,
  SixMonthLead,
  QueueCounts,
} from "@/lib/types/lead"

// Computed lazily so Date.now() is captured at first read, not module load —
// matters because the no-response banner triggers off `lastAttemptTime`.
export function getMockPipelineLeads(): PipelineLead[] {
  return [
    { id: "1", name: "Dr. Amit Verma",   phone: "9876543211", equipment: "Dental Chair",    source: "Website",    city: "Delhi",     status: "new",                phoneVerified: true,  failedAttempts: 0, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),                                                                value: "₹2.5L" },
    { id: "2", name: "Dr. Neha Gupta",   phone: "9123456780", equipment: "X-Ray Unit",       source: "Trade Show", city: "Mumbai",    status: "contacted",          phoneVerified: false, failedAttempts: 5, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), lastAttemptTime: new Date(Date.now() - 1000 * 60 * 30), value: "₹4.2L" },
    { id: "3", name: "Dr. Vikram Singh", phone: "9567891235", equipment: "Autoclave",        source: "Referral",   city: "Bangalore", status: "qualified",          phoneVerified: true,  failedAttempts: 1, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),                                                          value: "₹85K"  },
    { id: "4", name: "Dr. Sunita Reddy", phone: "9432198766", equipment: "Imaging System",   source: "Google Ads", city: "Hyderabad", status: "meeting-scheduled",  phoneVerified: true,  failedAttempts: 0, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),                                                          value: "₹8.5L" },
    { id: "5", name: "Dr. Manoj Tiwari", phone: "9876123451", equipment: "Compressor",       source: "Cold Call",  city: "Chennai",   status: "new",                phoneVerified: false, failedAttempts: 2, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),                                                                value: "₹45K"  },
    { id: "6", name: "Dr. Priya Kapoor", phone: "9988776655", equipment: "Light Cure",       source: "Website",    city: "Pune",      status: "contacted",          phoneVerified: true,  failedAttempts: 1, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8),                                                                value: "₹32K"  },
    { id: "7", name: "Dr. Rohit Sharma", phone: "9112233445", equipment: "Handpiece",        source: "Referral",   city: "Jaipur",    status: "new",                phoneVerified: false, failedAttempts: 0, createdAt: new Date(Date.now() - 1000 * 60 * 30),                                                                     value: "₹18K"  },
  ]
}

export function getMockDripLeads(): DripLead[] {
  const H = 3600
  const D = 86400
  return [
    { id: "1", name: "Dr. Priya Mehta",   phone: "9876543210", track: "1-month", nextMessageIn: H * 2,     lastEngagement: new Date(Date.now() - 1000 * D * 2),  messagesSent: 3, totalMessages: 8,  equipment: "Dental Chair"   },
    { id: "2", name: "Dr. Suresh Patel",  phone: "9123456789", track: "3-month", nextMessageIn: D * 3,     lastEngagement: new Date(Date.now() - 1000 * D * 7),  messagesSent: 5, totalMessages: 12, equipment: "X-Ray Unit"     },
    { id: "3", name: "Dr. Anita Sharma",  phone: "9567891234", track: "6-month", nextMessageIn: D * 14,    lastEngagement: new Date(Date.now() - 1000 * D * 30), messagesSent: 2, totalMessages: 6,  equipment: "Autoclave"      },
    { id: "4", name: "Dr. Rajesh Kumar",  phone: "9432198765", track: "1-month", nextMessageIn: 60 * 45,   lastEngagement: new Date(Date.now() - 1000 * D * 1),  messagesSent: 6, totalMessages: 8,  equipment: "Compressor"     },
    { id: "5", name: "Dr. Kavita Singh",  phone: "9876123450", track: "3-month", nextMessageIn: D * 5,     lastEngagement: new Date(Date.now() - 1000 * D * 10), messagesSent: 8, totalMessages: 12, equipment: "Imaging System" },
    { id: "6", name: "Dr. Arun Nair",     phone: "9988776655", track: "1-month", nextMessageIn: H * 6,     lastEngagement: new Date(Date.now() - 1000 * D * 2),  messagesSent: 4, totalMessages: 8,  equipment: "Light Cure"     },
    { id: "7", name: "Dr. Deepa Joshi",   phone: "9112233445", track: "6-month", nextMessageIn: D * 21,    lastEngagement: new Date(Date.now() - 1000 * D * 45), messagesSent: 1, totalMessages: 6,  equipment: "Handpiece"      },
    { id: "8", name: "Dr. Mohan Das",     phone: "9556677889", track: "3-month", nextMessageIn: D * 8,     lastEngagement: new Date(Date.now() - 1000 * D * 14), messagesSent: 3, totalMessages: 12, equipment: "Scaler"         },
  ]
}

export const MOCK_NO_RESPONSE_LEADS: NoResponseLead[] = [
  { id: "1", name: "Dr. Neha Gupta",   phone: "9123456780", attempts: 5, lastAttempt: "30 min ago", equipment: "X-Ray Unit"   },
  { id: "2", name: "Dr. Rahul Mehta",  phone: "9876123456", attempts: 4, lastAttempt: "2 hours ago", equipment: "Dental Chair" },
  { id: "3", name: "Dr. Priya Sharma", phone: "9567891234", attempts: 6, lastAttempt: "1 day ago",   equipment: "Autoclave"    },
  { id: "4", name: "Dr. Amit Patel",   phone: "9432198765", attempts: 4, lastAttempt: "3 hours ago", equipment: "Compressor"   },
]

export const MOCK_IDLE_LEADS: IdleLead[] = [
  { id: "1", name: "Dr. Kavita Singh", phone: "9876123450", idleDays: 12, lastActivity: "Viewed proposal", equipment: "Imaging System" },
  { id: "2", name: "Dr. Suresh Patel", phone: "9123456789", idleDays: 8,  lastActivity: "Email opened",    equipment: "Dental Chair"   },
  { id: "3", name: "Dr. Meena Reddy",  phone: "9567891234", idleDays: 15, lastActivity: "Call scheduled",  equipment: "X-Ray Unit"     },
]

export const MOCK_DORMANT_LEADS: DormantLead[] = [
  { id: "1", name: "Dr. Rajesh Sharma", phone: "9876543210", dormantDays: 92, reason: "Budget constraints" },
  { id: "2", name: "Dr. Anita Verma",   phone: "9123456780", dormantDays: 78, reason: "Went silent"        },
]

export const MOCK_REACTIVATION_LEADS: ReactivationLead[] = [
  { id: "R-1", name: "Dr. Manish Joshi", phone: "9001122334", handedBackAt: "2 days ago",  handedBackBy: "Ravi Kumar",   reason: "Customer asked to follow up in 3 months — budget cycle starts in Q3" },
  { id: "R-2", name: "Dr. Sneha Iyer",   phone: "9665544332", handedBackAt: "5 hours ago", handedBackBy: "Anita Verma", reason: "Lost competitor; revisit when their AMC expires" },
]

export const MOCK_SIX_MONTH_LEADS: SixMonthLead[] = [
  { id: "F-1", name: "Dr. Tanvi Bose",     phone: "9442211009", reactivateBy: "Aug 2026", source: "Reactivated",          reason: "Budget Q3",       retouch: false },
  { id: "F-2", name: "Dr. Praveen Nair",   phone: "9112233445", reactivateBy: "Jul 2026", source: "Cold-cycle drip exit", reason: "Long timeline",   retouch: false },
  { id: "F-3", name: "Dr. Vinod Menon",    phone: "9221100887", reactivateBy: "Sep 2026", source: "Reactivated",          reason: "AMC expiry",      retouch: false },
  { id: "F-4", name: "Dr. Lata Kulkarni",  phone: "9778899001", reactivateBy: "Dec 2026", source: "24-month re-touch",     reason: "Already purchased — re-touch", retouch: true },
  { id: "F-5", name: "Dr. Rakesh Pillai",  phone: "9554433221", reactivateBy: "Oct 2026", source: "Cold-cycle drip exit", reason: "Watching market", retouch: false },
]

export const MOCK_QUEUE_COUNTS: QueueCounts = {
  pipeline: 12,
  noResponse: 4,
  drip: 8,
  idle: 3,
  dormant: 2,
  reactivation: 2,
  sixMonth: 5,
  archived: 6,
  requalification: 1,
  callsDue: 7,
  reTouch: 2,
  neglected: 1,
}
