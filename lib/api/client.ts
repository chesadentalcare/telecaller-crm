// Thin fetch wrapper. One place owns:
//   - prepending the API base URL
//   - injecting the Bearer token from localStorage
//   - parsing JSON responses
//   - turning non-2xx into a thrown ApiError (so TanStack Query can detect it)
//   - kicking the user back to /login on 401
//
// Repositories and hooks call `api.get/post/put/...` — they never touch fetch
// directly. When the backend changes (auth scheme, base URL, error shape),
// only this file changes.

import { apiUrl } from "@/lib/api-config"
import { tokenStorage } from "@/lib/auth/token"

export class ApiError extends Error {
  status: number
  payload: unknown
  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

interface RequestOptions {
  /** When true, omit the Authorization header (used by /login). */
  skipAuth?: boolean
  /** Pass a FormData / Blob to skip JSON body serialization. */
  body?: unknown
  /** Override fetch signal (for AbortController). */
  signal?: AbortSignal
  /** Extra headers (merged with defaults). */
  headers?: Record<string, string>
}

async function request<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers || {}) }

  const isFormData = typeof FormData !== "undefined" && opts.body instanceof FormData
  if (!isFormData && opts.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json"
  }

  if (!opts.skipAuth) {
    const token = tokenStorage.get()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(apiUrl(path), {
    method,
    headers,
    body:
      opts.body === undefined
        ? undefined
        : isFormData
          ? (opts.body as FormData)
          : JSON.stringify(opts.body),
    signal: opts.signal,
  })

  // 401: token is bad or missing. Clear local state and bounce to login.
  if (res.status === 401) {
    tokenStorage.clear()
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.assign("/login")
    }
  }

  const ct = res.headers.get("content-type") || ""
  const payload = ct.includes("application/json") ? await res.json().catch(() => null) : await res.text()

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload && String((payload as Record<string, unknown>).message)) ||
      res.statusText ||
      "Request failed"
    throw new ApiError(message, res.status, payload)
  }

  return payload as T
}

export const api = {
  get:    <T>(path: string, opts?: RequestOptions) => request<T>("GET",    path, opts),
  post:   <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("POST",   path, { ...opts, body }),
  put:    <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PUT",    path, { ...opts, body }),
  patch:  <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PATCH",  path, { ...opts, body }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>("DELETE", path, opts),
}
