import { describe, it, expect, vi, beforeEach } from "vitest"

const get = vi.hoisted(() => vi.fn())
const post = vi.hoisted(() => vi.fn())
const put = vi.hoisted(() => vi.fn())
const patch = vi.hoisted(() => vi.fn())
const del = vi.hoisted(() => vi.fn())
vi.mock("./client", () => ({ api: { get, post, put, patch, delete: del } }))

import { leadsApi } from "./leads"

const envelope = <T,>(data: T) => Promise.resolve({ success: true, data })

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  put.mockReset()
  patch.mockReset()
  del.mockReset()
})

describe("leadsApi — envelope unwrapping", () => {
  it("returns only the .data payload from the wrapped response", async () => {
    get.mockReturnValue(envelope({ id: 7, foo: "bar" }))
    const out = await leadsApi.detail(7)
    expect(out).toEqual({ id: 7, foo: "bar" })
  })

  it("stringifies a numeric id into the detail path", async () => {
    get.mockReturnValue(envelope({}))
    await leadsApi.detail(4200)
    expect(get).toHaveBeenCalledWith("/leads/4200")
  })

  it("accepts a string id unchanged", async () => {
    get.mockReturnValue(envelope({}))
    await leadsApi.detail("4200")
    expect(get).toHaveBeenCalledWith("/leads/4200")
  })
})

describe("leadsApi — mutations forward id + body", () => {
  it("create posts the values to /leads and unwraps", async () => {
    post.mockReturnValue(envelope({ opportunityDocEntry: 1, cardCode: "C1" }))
    const out = await leadsApi.create({ leadName: "Asha" } as never)
    expect(post).toHaveBeenCalledWith("/leads", { leadName: "Asha" })
    expect(out).toEqual({ opportunityDocEntry: 1, cardCode: "C1" })
  })

  it("logAttempt posts to the per-lead attempt path with the body", async () => {
    post.mockReturnValue(envelope({ attemptNumber: 2, triggerRecovery: false }))
    const body = { outcome: "engaged" as const, notes: "hi" }
    const out = await leadsApi.logAttempt(42, body)
    expect(post).toHaveBeenCalledWith("/leads/42/attempt", body)
    expect(out.attemptNumber).toBe(2)
  })

  it("editAttempt patches the nested attempt path", async () => {
    patch.mockReturnValue(envelope({ id: 7, outcome: "engaged", notes: null }))
    await leadsApi.editAttempt(42, 7, { outcome: "engaged", notes: "x" })
    expect(patch).toHaveBeenCalledWith("/leads/42/attempts/7", { outcome: "engaged", notes: "x" })
  })

  it("flag sends only the flagged field on the PATCH", async () => {
    patch.mockReturnValue(envelope({ opportunityDocEntry: 42, phoneReset: false, sapSynced: true }))
    await leadsApi.flag(42, true)
    expect(patch).toHaveBeenCalledWith("/leads/42", { flagged: true })
  })

  it("approveArchive posts the id list", async () => {
    post.mockReturnValue(envelope({ approved: 2, ids: [1, 2] }))
    await leadsApi.approveArchive([1, 2])
    expect(post).toHaveBeenCalledWith("/queue/drip-completed/approve", { ids: [1, 2] })
  })
})

describe("leadsApi — FormData assembly", () => {
  it("zoomMeeting builds multipart fields from the form values", async () => {
    post.mockReturnValue(envelope({ meetingId: 1 }))
    await leadsApi.zoomMeeting(42, {
      meetingAt: "2026-10-01T10:00",
      customerEmail: "a@b.com",
      layoutShared: "yes",
      designFeeStatus: "paid",
      durationMinutes: 30,
      notes: "call notes",
    } as never)

    expect(post).toHaveBeenCalledTimes(1)
    const [path, fd] = post.mock.calls[0]
    expect(path).toBe("/leads/42/zoom-meeting")
    expect(fd).toBeInstanceOf(FormData)
    const f = fd as FormData
    expect(f.get("meeting_at")).toBe("2026-10-01T10:00")
    expect(f.get("customer_email")).toBe("a@b.com")
    expect(f.get("layout_shared")).toBe("true")
    expect(f.get("design_fee_discussed")).toBe("true")
    expect(f.get("design_fee_paid")).toBe("true")
    expect(f.get("design_fee_declined")).toBe("false")
    expect(f.get("duration_minutes")).toBe("30")
    expect(f.get("notes")).toBe("call notes")
  })

  it("zoomMeeting flags a declined fee correctly and omits absent optionals", async () => {
    post.mockReturnValue(envelope({ meetingId: 1 }))
    await leadsApi.zoomMeeting(42, {
      meetingAt: "2026-10-01T10:00",
      customerEmail: "a@b.com",
      layoutShared: "no",
      designFeeStatus: "declined",
    } as never)
    const f = post.mock.calls[0][1] as FormData
    expect(f.get("layout_shared")).toBe("false")
    expect(f.get("design_fee_paid")).toBe("false")
    expect(f.get("design_fee_declined")).toBe("true")
    expect(f.get("duration_minutes")).toBeNull()
    expect(f.get("notes")).toBeNull()
  })

  it("sendBrochure attaches the file under the 'brochure' key", async () => {
    post.mockReturnValue(envelope({ dryRun: true, messageId: null, url: "u" }))
    const file = new File(["pdf"], "b.pdf", { type: "application/pdf" })
    await leadsApi.sendBrochure(42, file)
    const [path, fd] = post.mock.calls[0]
    expect(path).toBe("/leads/42/send-brochure")
    expect((fd as FormData).get("brochure")).toBe(file)
  })
})

describe("leadsApi.queues — query-string builder (qs)", () => {
  it("appends no query string when no range/filters are given", async () => {
    get.mockReturnValue(envelope([]))
    await leadsApi.queues.pipeline()
    expect(get).toHaveBeenCalledWith("/queue/pipeline")
  })

  it("encodes from/to date range", async () => {
    get.mockReturnValue(envelope([]))
    await leadsApi.queues.pipeline({ from: "2026-09-01", to: "2026-09-30" })
    expect(get).toHaveBeenCalledWith("/queue/pipeline?from=2026-09-01&to=2026-09-30")
  })

  it("encodes state + flagged + salesPerson filters", async () => {
    get.mockReturnValue(envelope([]))
    await leadsApi.queues.pipeline(undefined, { state: "Karnataka", flagged: true, salesPerson: "rakesh" })
    const url = get.mock.calls[0][0] as string
    expect(url.startsWith("/queue/pipeline?")).toBe(true)
    const params = new URLSearchParams(url.split("?")[1])
    expect(params.get("state")).toBe("Karnataka")
    expect(params.get("flagged")).toBe("1")
    expect(params.get("salesPerson")).toBe("rakesh")
  })

  it("treats the __all__ sentinel as no filter", async () => {
    get.mockReturnValue(envelope([]))
    await leadsApi.queues.counts(undefined, { state: "__all__", salesPerson: "__all__" })
    expect(get).toHaveBeenCalledWith("/queue/counts")
  })

  it("omits flagged from the query string when false", async () => {
    get.mockReturnValue(envelope([]))
    await leadsApi.queues.drip(undefined, { flagged: false })
    expect(get).toHaveBeenCalledWith("/queue/drip")
  })

  it("repliesDue takes no filters and hits the static path", async () => {
    get.mockReturnValue(envelope([]))
    await leadsApi.queues.repliesDue()
    expect(get).toHaveBeenCalledWith("/queue/replies-due")
  })
})

describe("leadsApi — query params on read helpers", () => {
  it("getSalesUsers appends oppId only when provided", async () => {
    get.mockReturnValue(envelope([]))
    await leadsApi.getSalesUsers()
    expect(get).toHaveBeenCalledWith("/sales/users")

    get.mockReturnValue(envelope([]))
    await leadsApi.getSalesUsers(4200)
    expect(get).toHaveBeenLastCalledWith("/sales/users?oppId=4200")
  })

  it("getSapItems appends an encoded q only when provided", async () => {
    get.mockReturnValue(envelope([]))
    await leadsApi.getSapItems()
    expect(get).toHaveBeenCalledWith("/sap/items")

    get.mockReturnValue(envelope([]))
    await leadsApi.getSapItems("chair & scanner")
    expect(get).toHaveBeenLastCalledWith("/sap/items?q=chair%20%26%20scanner")
  })

  it("getNotifications encodes limit + offset defaults", async () => {
    get.mockReturnValue(envelope([]))
    await leadsApi.getNotifications()
    expect(get).toHaveBeenCalledWith("/notifications?limit=20&offset=0")

    get.mockReturnValue(envelope([]))
    await leadsApi.getNotifications(5, 10)
    expect(get).toHaveBeenLastCalledWith("/notifications?limit=5&offset=10")
  })

  it("lookupSapOrder encodes the docNum query param", async () => {
    get.mockReturnValue(envelope({}))
    await leadsApi.lookupSapOrder(42, "SO 100")
    expect(get).toHaveBeenCalledWith("/leads/42/closure/sap-order?docNum=SO%20100")
  })
})
