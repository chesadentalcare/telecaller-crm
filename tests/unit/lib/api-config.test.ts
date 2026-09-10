import { describe, it, expect } from "vitest"
import {
  API_BASE_URLS,
  API_BASE_URL,
  SHARED_API_BASE_URL,
  endpoints,
  apiUrl,
  sharedApiUrl,
} from "@/lib/api-config"

describe("api-config base URLs", () => {
  it("has a distinct base URL registered for every environment", () => {
    expect(API_BASE_URLS.dev).toBe("http://localhost:4002/api/telecaller")
    expect(API_BASE_URLS.staging).toBe("https://staging-api.chesadentalcare.com/telecaller")
    expect(API_BASE_URLS.prod).toBe("https://api.chesadentalcare.com/telecaller")
  })

  it("resolves API_BASE_URL to one of the registered env URLs (prod default in test)", () => {
    expect(Object.values(API_BASE_URLS)).toContain(API_BASE_URL)
    expect(API_BASE_URL).toBe(API_BASE_URLS.prod)
  })

  it("defaults the shared (chesa gateway) base URL to the prod host", () => {
    expect(SHARED_API_BASE_URL).toBe("https://api.chesadentalcare.com")
  })
})

describe("apiUrl / sharedApiUrl builders", () => {
  it("prepends the telecaller base URL to a static path", () => {
    expect(apiUrl(endpoints.leads)).toBe(`${API_BASE_URL}/leads`)
  })

  it("prepends the telecaller base URL to a built path", () => {
    expect(apiUrl(endpoints.leadAttempt("L-001"))).toBe(`${API_BASE_URL}/leads/L-001/attempt`)
  })

  it("prepends the shared base URL for reference-data endpoints", () => {
    expect(sharedApiUrl(endpoints.products)).toBe(`${SHARED_API_BASE_URL}/crmpro`)
  })

  it("leaves the path untouched (pure concatenation, no normalisation)", () => {
    expect(apiUrl("/foo//bar")).toBe(`${API_BASE_URL}/foo//bar`)
    expect(apiUrl("")).toBe(API_BASE_URL)
  })
})

describe("endpoints catalog", () => {
  it("exposes static string paths for list endpoints", () => {
    expect(endpoints.leads).toBe("/leads")
    expect(endpoints.leadsSearch).toBe("/leads/search")
    expect(endpoints.queueCounts).toBe("/queue/counts")
  })

  it("builds per-id lead paths", () => {
    expect(endpoints.leadDetail("42")).toBe("/leads/42")
    expect(endpoints.leadUpdate("42")).toBe("/leads/42")
    expect(endpoints.leadQualify("42")).toBe("/leads/42/qualify")
    expect(endpoints.leadSendReply("42")).toBe("/leads/42/replies/send")
    expect(endpoints.catalogueSend("42")).toBe("/leads/42/send-catalogue")
  })

  it("builds nested attempt-edit paths from two ids", () => {
    expect(endpoints.leadAttemptEdit("42", "7")).toBe("/leads/42/attempts/7")
  })

  it("builds per-meeting paths", () => {
    expect(endpoints.meetingReschedule("9")).toBe("/meetings/9/reschedule")
    expect(endpoints.meetingCancel("9")).toBe("/meetings/9/cancel")
    expect(endpoints.meetingSummaryUpload("9")).toBe("/meetings/9/summary")
  })

  it("builds per-quotation and per-approval paths", () => {
    expect(endpoints.quotationDetail("Q1")).toBe("/quotations/Q1")
    expect(endpoints.quotationSendWhatsapp("Q1")).toBe("/quotations/Q1/send-whatsapp")
    expect(endpoints.approveDiscount("A1")).toBe("/approvals/A1/approve")
    expect(endpoints.rejectDiscount("A1")).toBe("/approvals/A1/reject")
  })

  it("builds drip enter/exit paths", () => {
    expect(endpoints.dripEnter("42")).toBe("/drip/enter/42")
    expect(endpoints.dripExit("42")).toBe("/drip/exit/42")
  })
})
