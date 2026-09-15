"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { tokenStorage } from "@/lib/auth/token"
import { apiUrl, endpoints } from "@/lib/api-config"
import { leadKeys } from "@/hooks/use-leads"
import { createCoalescer } from "@/lib/coalesce"

const SSE_REFRESH_COALESCE_MS = 500

let audioCtx: AudioContext | null = null
let audioCloseTimer: ReturnType<typeof setTimeout> | null = null

function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    if (!audioCtx) audioCtx = new Ctx()
    const ctx = audioCtx
    if (ctx.state === "suspended") ctx.resume().catch(() => {})
    const gain = ctx.createGain()
    gain.gain.value = 0.06
    gain.connect(ctx.destination)
    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator()
      osc.type = "sine"
      osc.frequency.value = freq
      osc.connect(gain)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur)
    }
    beep(880, 0, 0.15)
    beep(1174.7, 0.16, 0.2)
    if (audioCloseTimer) clearTimeout(audioCloseTimer)
    audioCloseTimer = setTimeout(() => {
      audioCtx?.close().catch(() => {})
      audioCtx = null
      audioCloseTimer = null
    }, 4000)
  } catch {
    /* audio unavailable / blocked */
  }
}

function stopAudio() {
  if (audioCloseTimer) { clearTimeout(audioCloseTimer); audioCloseTimer = null }
  if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null }
}

let baseTitle: string | null = null
let titleTimer: ReturnType<typeof setTimeout> | null = null
let titleFocusHandler: (() => void) | null = null

function restoreTitle() {
  if (titleTimer) { clearTimeout(titleTimer); titleTimer = null }
  if (titleFocusHandler) { window.removeEventListener("focus", titleFocusHandler); titleFocusHandler = null }
  if (baseTitle != null && typeof document !== "undefined") { document.title = baseTitle; baseTitle = null }
}

function flashTitle() {
  if (typeof document === "undefined") return
  const current = document.title
  const base = current.startsWith("🔔 ") ? current.slice(3) : current
  baseTitle = base
  document.title = `🔔 ${base}`
  if (titleTimer) clearTimeout(titleTimer)
  titleTimer = setTimeout(restoreTitle, 10000)
  if (titleFocusHandler) window.removeEventListener("focus", titleFocusHandler)
  titleFocusHandler = restoreTitle
  window.addEventListener("focus", restoreTitle, { once: true })
}

function browserNotify(title: string, body: string, tag: string) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return
    if (!document.hidden) return
    const n = new Notification(title, { body, tag })
    n.onclick = () => {
      try {
        window.focus()
        const id = tag.replace(/^reply-/, "")
        if (id && id !== "unknown") window.history.pushState(null, "", `/?view=lead-detail&leadId=${id}`)
      } finally {
        n.close()
      }
    }
  } catch {
    /* notifications unavailable */
  }
}

// Live WhatsApp conversation updates via Server-Sent Events.
//
// Opens ONE EventSource for the whole session (mount once in the dashboard shell). On each
// pushed event it invalidates the lead query group so open threads, queue rows and awaiting-reply
// badges refresh instantly. When the event is an INBOUND customer reply it also raises an ACTIVE
// alert — toast + chime + tab-title flash + (backgrounded) a browser notification — and eagerly
// refreshes the bell so the count moves in <500ms instead of on the 60s poll.
//
// The JWT rides in the query string because EventSource can't set an Authorization header. The
// backend stream already scopes events to the owner (assignedTo), so alerts stay owner-scoped.
export function useConversationStream() {
  const qc = useQueryClient()
  const token = typeof window !== "undefined" ? tokenStorage.get() : null

  useEffect(() => {
    if (!token) return
    if (typeof window === "undefined" || typeof EventSource === "undefined") return

    // Browsers only honour Notification.requestPermission() from a user gesture, so defer it to
    // the first interaction rather than firing (and being ignored) on mount.
    let askPermission: (() => void) | null = null
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      askPermission = () => {
        Notification.requestPermission().catch(() => {})
        if (askPermission) {
          window.removeEventListener("pointerdown", askPermission)
          window.removeEventListener("keydown", askPermission)
        }
      }
      window.addEventListener("pointerdown", askPermission, { once: true })
      window.addEventListener("keydown", askPermission, { once: true })
    }

    const url = `${apiUrl(endpoints.conversationStream)}?token=${encodeURIComponent(token)}`
    let es: EventSource | null = null

    const refresh = createCoalescer(
      () => qc.invalidateQueries({ queryKey: leadKeys.all }),
      SSE_REFRESH_COALESCE_MS,
    )

    const onConversation = (event: Event) => {
      refresh.schedule()

      let data: { direction?: string; oppId?: number | string; customerName?: string; preview?: string } | null = null
      try {
        const raw = (event as MessageEvent).data
        data = raw ? JSON.parse(raw) : null
      } catch {
        data = null
      }
      if (!data || data.direction !== "inbound") return

      qc.invalidateQueries({ queryKey: leadKeys.notifications() })
      qc.invalidateQueries({ queryKey: leadKeys.notificationCount() })

      const idTag = `reply-${data.oppId ?? "unknown"}`
      const name = data.customerName || `Lead #${data.oppId ?? ""}`.trim()
      const preview = data.preview || "New WhatsApp reply"
      toast.message(`💬 ${name} replied`, { id: idTag, description: preview })
      playChime()
      flashTitle()
      browserNotify(`${name} replied`, preview, idTag)
    }

    try {
      es = new EventSource(url)
      es.addEventListener("conversation", onConversation as EventListener)
    } catch {
      es = null
    }

    return () => {
      refresh.cancel()
      stopAudio()
      restoreTitle()
      if (askPermission) {
        window.removeEventListener("pointerdown", askPermission)
        window.removeEventListener("keydown", askPermission)
      }
      if (es) {
        es.removeEventListener("conversation", onConversation as EventListener)
        es.close()
      }
    }
    // qc from useQueryClient() is stable across renders (context value), so [token] is the only
    // input that should re-open the stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])
}
