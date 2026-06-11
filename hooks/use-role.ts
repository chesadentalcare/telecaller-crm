"use client"

import { useAuth } from "@/lib/auth/AuthContext"
import type { UserRole } from "@/lib/auth/token"

/** Convenience hook for role-based rendering decisions. */
export function useRole() {
  const { user } = useAuth()
  const role: UserRole | null = user?.role ?? null

  // The DB sales track (migration 013) is sale_staff / coordinator / sale_head;
  // "salesperson" is kept as a legacy alias. Matching all of these keeps the FE
  // gates in lock-step with the backend requireRole(...) allowlists.
  const SALES_ROLES: UserRole[] = ["salesperson", "sale_staff", "coordinator", "sale_head"]
  const isSales = role !== null && SALES_ROLES.includes(role)

  return {
    role,
    isTelecaller: role === "telecaller",
    isSalesperson: isSales,
    isManager: role === "manager",
    isAdmin: role === "admin",
    /** Manager or admin — can approve discounts, view all leads, etc. */
    isManagerOrAbove: role === "manager" || role === "admin",
    /** Any sales-track role (sale_staff/coordinator/sale_head, plus manager/admin). */
    isSalesTrack: isSales || role === "manager" || role === "admin",
    /**
     * Can hand a lead back to the telecaller (Reactivation queue).
     * Mirrors the backend gate on POST /leads/:id/hand-back, which allows the
     * sale_staff / coordinator / sale_head roles plus manager and admin.
     */
    canHandBack: isSales || role === "manager" || role === "admin",
    /** Check if user has one of the given roles. */
    hasRole: (...roles: UserRole[]) => role !== null && roles.includes(role),
  }
}
