// Auth-related API calls. Returns shapes match the backend at
// telecaller_api_gateway/src/apis/telecaller/controllers/auth.js.

import { api } from "./client"
import type { AuthUser } from "@/lib/auth/token"

export interface LoginResponse {
  status: "success"
  token: string
  user: AuthUser
}

export const authApi = {
  /**
   * POST /api/telecaller/login. Throws ApiError on failure.
   * skipAuth so we don't send a stale token alongside the request.
   */
  login: (username: string, password: string) =>
    api.post<LoginResponse>("/api/telecaller/login", { username, password }, { skipAuth: true }),
}
