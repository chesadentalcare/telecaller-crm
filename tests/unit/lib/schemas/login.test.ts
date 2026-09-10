import { describe, it, expect } from "vitest"
import { loginSchema, loginDefaults } from "@/lib/schemas/login"

describe("loginSchema", () => {
  it("parses a valid credential object", () => {
    const parsed = loginSchema.parse({ username: "neha", password: "secret" })
    expect(parsed).toEqual({ username: "neha", password: "secret" })
  })

  it("trims the username", () => {
    const parsed = loginSchema.parse({ username: "  neha  ", password: "x" })
    expect(parsed.username).toBe("neha")
  })

  it("rejects a too-short username on the username field", () => {
    const res = loginSchema.safeParse({ username: "n", password: "x" })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].path).toEqual(["username"])
      expect(res.error.issues[0].message).toBe("Enter your username")
    }
  })

  it("rejects an empty password on the password field", () => {
    const res = loginSchema.safeParse({ username: "neha", password: "" })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].path).toEqual(["password"])
      expect(res.error.issues[0].message).toBe("Enter your password")
    }
  })

  it("exposes empty defaults that fail validation", () => {
    expect(loginDefaults).toEqual({ username: "", password: "" })
    expect(loginSchema.safeParse(loginDefaults).success).toBe(false)
  })
})
