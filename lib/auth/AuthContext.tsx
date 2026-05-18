"use client"

// AuthProvider — the single React-side owner of "is the user logged in".
//
// Status states:
//   "loading"  → reading localStorage on mount (one tick).
//   "authed"   → token + user are in memory and storage.
//   "anon"     → no token; UI should redirect to /login.
//
// Everything else in the app reads via `useAuth()`. Components don't
// touch localStorage or call the auth API directly.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { authApi } from "@/lib/api/auth"
import { tokenStorage, userStorage, type AuthUser } from "./token"

type Status = "loading" | "authed" | "anon"

interface AuthContextValue {
  status: Status
  user: AuthUser | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading")
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // Hydrate from localStorage on mount. SSR returns nothing because the
  // accessors short-circuit when window is undefined.
  useEffect(() => {
    const t = tokenStorage.get()
    const u = userStorage.get()
    if (t && u) {
      setToken(t)
      setUser(u)
      setStatus("authed")
    } else {
      setStatus("anon")
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password)
    tokenStorage.set(res.token)
    userStorage.set(res.user)
    setToken(res.token)
    setUser(res.user)
    setStatus("authed")
  }, [])

  const logout = useCallback(() => {
    tokenStorage.clear()
    setToken(null)
    setUser(null)
    setStatus("anon")
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, token, login, logout }),
    [status, user, token, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
