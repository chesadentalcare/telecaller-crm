"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { tokenStorage } from "@/lib/auth/token"
import { apiUrl, endpoints } from "@/lib/api-config"
import { leadKeys } from "@/hooks/use-leads"

// Live WhatsApp conversation updates via Server-Sent Events.
//
// Opens ONE EventSource for the whole session (mount once in the dashboard shell) and, on
// each pushed event, invalidates the lead query group so the open chat thread, the queue
// rows ("Needs reply"), and the awaiting-reply nav badges all refresh the instant a
// customer replies or a rep sends a reply — no manual refresh.
//
// The payload is just a signal ({ oppId, direction, ... }); React Query re-fetches the
// authoritative data. EventSource auto-reconnects on transient drops; the JWT rides in the
// query string because EventSource can't set an Authorization header. If the browser blocks
// SSE, the app silently falls back to React Query's refetchOnReconnect / refetchOnWindowFocus.
export function useConversationStream() {
  const qc = useQueryClient()
  // Reading on every render is cheap and returns a stable string, so the effect re-runs
  // only when the token actually changes (e.g. login within the same tab).
  const token = typeof window !== "undefined" ? tokenStorage.get() : null

  useEffect(() => {
    if (!token) return
    if (typeof window === "undefined" || typeof EventSource === "undefined") return

    const url = `${apiUrl(endpoints.conversationStream)}?token=${encodeURIComponent(token)}`
    let es: EventSource | null = null

    // Invalidating the whole `leads` group refreshes every CURRENTLY-OBSERVED lead query
    // (open chat full-detail, queue lists, awaiting-reply counts) and nothing else.
    const refresh = () => qc.invalidateQueries({ queryKey: leadKeys.all })

    const onConversation = () => refresh()

    try {
      es = new EventSource(url)
      es.addEventListener("conversation", onConversation as EventListener)
      // EventSource reconnects automatically on transient errors — no action needed.
    } catch {
      // SSE unavailable — rely on the React Query polling/refetch fallback.
      es = null
    }

    return () => {
      if (es) {
        es.removeEventListener("conversation", onConversation as EventListener)
        es.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])
}
