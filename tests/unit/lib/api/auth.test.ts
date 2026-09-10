import { describe, it, expect, vi, beforeEach } from "vitest"

const post = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/client", () => ({ api: { post } }))

import { authApi, type LoginResponse } from "@/lib/api/auth"
import type { AuthUser } from "@/lib/auth/token"

const user: AuthUser = { id: 9, username: "neha", role: "telecaller", fullName: "Neha" }

beforeEach(() => post.mockReset())

describe("authApi.login", () => {
  it("POSTs credentials to /login with skipAuth and returns the response", async () => {
    const resp: LoginResponse = { status: "success", token: "jwt-abc", user }
    post.mockResolvedValue(resp)

    const out = await authApi.login("neha", "secret")

    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith(
      "/login",
      { username: "neha", password: "secret" },
      { skipAuth: true },
    )
    expect(out).toEqual(resp)
    expect(out.token).toBe("jwt-abc")
    expect(out.user.role).toBe("telecaller")
  })

  it("propagates a rejected client call (bad credentials)", async () => {
    const err = new Error("Invalid credentials")
    post.mockImplementationOnce(() => Promise.reject(err))
    await expect(authApi.login("neha", "wrong")).rejects.toBe(err)
  })

  it("passes the exact username/password through unchanged", async () => {
    post.mockResolvedValue({ status: "success", token: "t", user })
    await authApi.login("  Admin ", "P@ss#1")
    const [, body] = post.mock.calls[0]
    expect(body).toEqual({ username: "  Admin ", password: "P@ss#1" })
  })
})
