import { describe, it, expect, beforeEach } from "vitest"
import { tokenStorage, userStorage, type AuthUser } from "@/lib/auth/token"

const sampleUser: AuthUser = {
  id: 9,
  username: "neha",
  role: "telecaller",
  fullName: "Neha",
}

describe("tokenStorage", () => {
  beforeEach(() => window.localStorage.clear())

  it("returns null when no token has been set", () => {
    expect(tokenStorage.get()).toBeNull()
  })

  it("round-trips a token through set/get", () => {
    tokenStorage.set("jwt-abc")
    expect(tokenStorage.get()).toBe("jwt-abc")
    expect(window.localStorage.getItem("tc.auth.token")).toBe("jwt-abc")
  })

  it("clear() removes both the token AND the cached user", () => {
    tokenStorage.set("jwt-abc")
    userStorage.set(sampleUser)

    tokenStorage.clear()

    expect(tokenStorage.get()).toBeNull()
    expect(userStorage.get()).toBeNull()
  })
})

describe("userStorage", () => {
  beforeEach(() => window.localStorage.clear())

  it("returns null when nothing is stored", () => {
    expect(userStorage.get()).toBeNull()
  })

  it("round-trips a user (JSON serialized) through set/get including the role", () => {
    userStorage.set(sampleUser)
    const got = userStorage.get()
    expect(got).toEqual(sampleUser)
    expect(got?.role).toBe("telecaller")
  })

  it("preserves an admin role through the round-trip", () => {
    userStorage.set({ ...sampleUser, id: 11, username: "admin", role: "admin" })
    expect(userStorage.get()?.role).toBe("admin")
  })

  it("returns null (does not throw) when the stored JSON is corrupt", () => {
    window.localStorage.setItem("tc.auth.user", "{not-valid-json")
    expect(userStorage.get()).toBeNull()
  })
})
