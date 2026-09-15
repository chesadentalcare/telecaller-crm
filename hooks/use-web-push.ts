"use client"

import { useEffect } from "react"
import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api-config"
import { tokenStorage } from "@/lib/auth/token"

// Baked at build time (static export). If unset, the whole hook is a no-op — Web Push stays
// dormant until VAPID keys are configured, so this can't break the build or runtime.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// Registers the push service worker and subscribes the browser to Web Push, sending the
// subscription to the telecaller gateway. Owner-scoped delivery happens server-side (only the
// lead's assigned owner is pushed). Subscribes only once Notification permission is granted
// (the SSE hook requests permission on first user gesture), so this quietly retries on remount.
export function useWebPush() {
  const token = typeof window !== "undefined" ? tokenStorage.get() : null

  useEffect(() => {
    if (!token || !VAPID_PUBLIC_KEY) return
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return

    let cancelled = false
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" })
        const existing = await reg.pushManager.getSubscription()
        const sub =
          existing ||
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          }))
        if (cancelled) return
        await api.post(endpoints.pushSubscribe, sub.toJSON())
      } catch {
        /* push unavailable / permission race — safe to ignore, retries on next mount */
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])
}
