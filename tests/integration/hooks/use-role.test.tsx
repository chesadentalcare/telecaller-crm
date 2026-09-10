import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"

import type { UserRole } from "@/lib/auth/token"

const useAuth = vi.hoisted(() => vi.fn())
vi.mock("@/lib/auth/AuthContext", () => ({ useAuth }))

import { useRole } from "@/hooks/use-role"

function withRole(role: UserRole | null) {
  useAuth.mockReturnValue({ user: role === null ? null : { id: 1, username: "u", role } })
  return renderHook(() => useRole()).result
}

describe("useRole", () => {
  it("returns null role and all flags false when logged out", () => {
    const { current } = withRole(null)
    expect(current.role).toBeNull()
    expect(current.isTelecaller).toBe(false)
    expect(current.isSalesperson).toBe(false)
    expect(current.isManager).toBe(false)
    expect(current.isAdmin).toBe(false)
    expect(current.isManagerOrAbove).toBe(false)
    expect(current.isFullAccess).toBe(false)
    expect(current.isSalesTrack).toBe(false)
    expect(current.canHandBack).toBe(false)
    expect(current.hasRole("admin")).toBe(false)
  })

  it("recognises the telecaller role", () => {
    const { current } = withRole("telecaller")
    expect(current.role).toBe("telecaller")
    expect(current.isTelecaller).toBe(true)
    expect(current.isSalesperson).toBe(false)
    expect(current.isManagerOrAbove).toBe(false)
    expect(current.isFullAccess).toBe(true)
    expect(current.isSalesTrack).toBe(false)
    expect(current.canHandBack).toBe(true)
  })

  it("recognises the admin role", () => {
    const { current } = withRole("admin")
    expect(current.isAdmin).toBe(true)
    expect(current.isManager).toBe(false)
    expect(current.isManagerOrAbove).toBe(true)
    expect(current.isFullAccess).toBe(true)
    expect(current.isSalesTrack).toBe(true)
    expect(current.canHandBack).toBe(true)
    expect(current.isSalesperson).toBe(false)
  })

  it("recognises the manager role", () => {
    const { current } = withRole("manager")
    expect(current.isManager).toBe(true)
    expect(current.isAdmin).toBe(false)
    expect(current.isManagerOrAbove).toBe(true)
    expect(current.isFullAccess).toBe(true)
    expect(current.isSalesTrack).toBe(true)
    expect(current.canHandBack).toBe(true)
  })

  it.each<UserRole>(["salesperson", "sale_staff", "coordinator", "sale_head"])(
    "treats %s as a sales-track role",
    (role) => {
      const { current } = withRole(role)
      expect(current.isSalesperson).toBe(true)
      expect(current.isSalesTrack).toBe(true)
      expect(current.canHandBack).toBe(true)
      expect(current.isManagerOrAbove).toBe(false)
      expect(current.isFullAccess).toBe(false)
      expect(current.isTelecaller).toBe(false)
    },
  )

  it("hasRole matches any of the supplied roles", () => {
    const { current } = withRole("coordinator")
    expect(current.hasRole("coordinator")).toBe(true)
    expect(current.hasRole("admin", "coordinator")).toBe(true)
    expect(current.hasRole("admin", "manager")).toBe(false)
    expect(current.hasRole()).toBe(false)
  })

  it("treats a missing user object the same as a null role", () => {
    useAuth.mockReturnValue({ user: undefined })
    const { result } = renderHook(() => useRole())
    expect(result.current.role).toBeNull()
    expect(result.current.isFullAccess).toBe(false)
  })
})
