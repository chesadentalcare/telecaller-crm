"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { tokenStorage } from "@/lib/auth/token"
import { apiUrl, endpoints } from "@/lib/api-config"
import { leadKeys } from "@/hooks/use-leads"
import { createCoalescer } from "@/lib/coalesce"

const SSE_REFRESH_COALESCE_MS = 500

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

    // Broad invalidation stays (load-bearing for live badges/lists); the coalescer only
    // changes how often it fires — one refresh per burst instead of one per event.
    const refresh = createCoalescer(
      () => qc.invalidateQueries({ queryKey: leadKeys.all }),
      SSE_REFRESH_COALESCE_MS,
    )

    const onConversation = () => refresh.schedule()

    try {
      es = new EventSource(url)
      es.addEventListener("conversation", onConversation as EventListener)
      // EventSource reconnects automatically on transient errors — no action needed.
    } catch {
      // SSE unavailable — rely on the React Query polling/refetch fallback.
      es = null
    }

    return () => {
      refresh.cancel()
      if (es) {
        es.removeEventListener("conversation", onConversation as EventListener)
        es.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])
}
