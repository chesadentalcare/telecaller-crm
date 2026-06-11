// localStorage wrapper for the JWT + cached user. Kept in a single file so
// the storage shape lives in one place — if we move to cookies later, only
// this file changes.
//
// SSR-safe: every accessor short-circuits when `window` isn't defined so
// Next can render the login page on the server without crashing.

// Roles match the backend login.role ENUM (migration 013_align_sales_roles):
// the sales track is sale_staff / coordinator / sale_head. "salesperson" is kept
// as a legacy alias for older seeds/tests — the gateway issues the raw DB role.
export type UserRole =
  | "telecaller"
  | "salesperson"
  | "sale_staff"
  | "coordinator"
  | "sale_head"
  | "manager"
  | "admin"

export interface AuthUser {
  id: number
  username: string
  role: UserRole
  fullName?: string | null
}

const TOKEN_KEY = "tc.auth.token"
const USER_KEY = "tc.auth.user"

const isBrowser = () => typeof window !== "undefined"

export const tokenStorage = {
  get(): string | null {
    if (!isBrowser()) return null
    return window.localStorage.getItem(TOKEN_KEY)
  },
  set(token: string) {
    if (!isBrowser()) return
    window.localStorage.setItem(TOKEN_KEY, token)
  },
  clear() {
    if (!isBrowser()) return
    window.localStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(USER_KEY)
  },
}

export const userStorage = {
  get(): AuthUser | null {
    if (!isBrowser()) return null
    const raw = window.localStorage.getItem(USER_KEY)
    if (!raw) return null
    try { return JSON.parse(raw) as AuthUser } catch { return null }
  },
  set(user: AuthUser) {
    if (!isBrowser()) return
    window.localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
}
