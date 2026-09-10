import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const tokenGet = vi.hoisted(() => vi.fn<[], string | null>(() => null))
const tokenClear = vi.hoisted(() => vi.fn())
vi.mock("@/lib/auth/token", () => ({
  tokenStorage: { get: tokenGet, clear: tokenClear },
}))

import { api, ApiError } from "@/lib/api/client"
import { API_BASE_URL } from "@/lib/api-config"

type FetchMock = ReturnType<typeof vi.fn>

function jsonResponse(body: unknown, init: { status?: number; ok?: boolean } = {}) {
  const status = init.status ?? 200
  return {
    status,
    ok: init.ok ?? (status >= 200 && status < 300),
    statusText: "",
    headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? "application/json" : null) },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }
}

function textResponse(body: string, init: { status?: number; ok?: boolean } = {}) {
  const status = init.status ?? 200
  return {
    status,
    ok: init.ok ?? (status >= 200 && status < 300),
    statusText: "",
    headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? "text/plain" : null) },
    json: () => Promise.resolve(null),
    text: () => Promise.resolve(body),
  }
}

let fetchMock: FetchMock

beforeEach(() => {
  tokenGet.mockReset().mockReturnValue(null)
  tokenClear.mockReset()
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ApiError", () => {
  it("is an Error carrying status + payload + message", () => {
    const err = new ApiError("nope", 418, { detail: "teapot" })
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.message).toBe("nope")
    expect(err.status).toBe(418)
    expect(err.payload).toEqual({ detail: "teapot" })
  })
})

describe("api client — URL + method", () => {
  it("prepends the configured base URL to the path", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))
    await api.get("/leads")
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/leads`, expect.objectContaining({ method: "GET" }))
  })

  it("uses the right HTTP verb per helper", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.post("/a", { x: 1 })
    await api.put("/b", { x: 2 })
    await api.patch("/c", { x: 3 })
    await api.delete("/d")
    const methods = fetchMock.mock.calls.map((c) => (c[1] as RequestInit).method)
    expect(methods).toEqual(["POST", "PUT", "PATCH", "DELETE"])
  })
})

describe("api client — auth header", () => {
  it("injects a Bearer token from storage by default", async () => {
    tokenGet.mockReturnValue("jwt-xyz")
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.get("/leads")
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBe("Bearer jwt-xyz")
  })

  it("omits Authorization when there is no token", async () => {
    tokenGet.mockReturnValue(null)
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.get("/leads")
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it("does not read or send a token when skipAuth is set", async () => {
    tokenGet.mockReturnValue("jwt-xyz")
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.post("/login", { username: "a" }, { skipAuth: true })
    expect(tokenGet).not.toHaveBeenCalled()
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })
})

describe("api client — body serialization", () => {
  it("JSON-stringifies an object body and sets Content-Type", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.post("/leads", { name: "Asha" })
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.body).toBe(JSON.stringify({ name: "Asha" }))
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json")
  })

  it("passes FormData through untouched (no JSON header, no stringify)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    const fd = new FormData()
    fd.append("file", "x")
    await api.post("/upload", fd)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.body).toBe(fd)
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined()
  })

  it("sends no body / Content-Type for a GET", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api.get("/leads")
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.body).toBeUndefined()
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined()
  })
})

describe("api client — response parsing", () => {
  it("returns the parsed JSON payload on success", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { id: 1 } }))
    const res = await api.get<{ success: boolean; data: { id: number } }>("/leads/1")
    expect(res).toEqual({ success: true, data: { id: 1 } })
  })

  it("returns text when the content-type is not JSON", async () => {
    fetchMock.mockResolvedValue(textResponse("pong"))
    const res = await api.get<string>("/ping")
    expect(res).toBe("pong")
  })
})

describe("api client — error handling", () => {
  it("throws an ApiError with the payload message on a non-2xx JSON response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Lead not found" }, { status: 404 }))
    await expect(api.get("/leads/999")).rejects.toMatchObject({
      name: "Error",
      status: 404,
      message: "Lead not found",
    })
    await expect(api.get("/leads/999")).rejects.toBeInstanceOf(ApiError)
  })

  it("falls back to a generic message when the error payload has none", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ code: "X" }, { status: 500 }))
    await expect(api.get("/boom")).rejects.toMatchObject({ status: 500, message: "Request failed" })
  })

  it("clears the token on a 401 and still throws ApiError", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "unauthorized" }, { status: 401 }))
    await expect(api.get("/secure")).rejects.toBeInstanceOf(ApiError)
    expect(tokenClear).toHaveBeenCalledTimes(1)
  })

  it("attaches the raw payload to the thrown ApiError", async () => {
    const payload = { message: "bad", errors: ["a", "b"] }
    fetchMock.mockResolvedValue(jsonResponse(payload, { status: 422 }))
    await expect(api.get("/x")).rejects.toMatchObject({ payload })
  })
})
