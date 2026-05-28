"use client"

import { useAuth } from "@/lib/auth/AuthContext"
import type { UserRole } from "@/lib/auth/token"

/** Convenience hook for role-based rendering decisions. */
export function useRole() {
  const { user } = useAuth()
  const role: UserRole | null = user?.role ?? null

  return {
    role,
    isTelecaller: role === "telecaller",
    isSalesperson: role === "salesperson",
    isManager: role === "manager",
    isAdmin: role === "admin",
    /** Manager or admin — can approve discounts, view all leads, etc. */
    isManagerOrAbove: role === "manager" || role === "admin",
    /** Any sales-track role (salesperson, manager, admin). */
    isSalesTrack: role === "salesperson" || role === "manager" || role === "admin",
    /** Check if user has one of the given roles. */
    hasRole: (...roles: UserRole[]) => role !== null && roles.includes(role),
  }
}
