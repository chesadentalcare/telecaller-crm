"use client"

import { useEffect, useState } from "react"

// Polls /version.json (emitted at build time by scripts/gen-version.mjs) and, when the
// build number changes, sets `updateAvailable` so the banner offers a manual Refresh.
// It does NOT auto-reload — an unprompted window.location.reload() interrupts the rep
// mid-action (bad UX). Module-level singleton → ONE poll loop shared by every subscriber.
// Network/JSON errors (e.g. dev, which has no version.json) are ignored.

const POLL_INTERVAL_MS = 2 * 60 * 1000 // 2 min

type WatcherState = { updateAvailable: boolean; runningVersion: number | null; runningBuildAt: string | null }

let state: WatcherState = { updateAvailable: false, runningVersion: null, runningBuildAt: null }
let runningVersion: number | null = null
let reloadScheduled = false
let initialized = false
const listeners = new Set<(s: WatcherState) => void>()

const notify = () => listeners.forEach((fn) => fn(state))
const setState = (patch: Partial<WatcherState>) => { state = { ...state, ...patch }; notify() }

// Bust any caches (defensive — the static export has no service worker, but this
// clears the Cache API if one is ever added) then reload to pull the fresh build.
export const forceUpdateReload = async () => {
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)))
    }
  } catch { /* ignore */ }
  window.location.reload()
}

const check = async () => {
  if (reloadScheduled) return
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: "no-store" })
    if (!res.ok) return
    const { version, buildAt } = (await res.json()) as { version?: number; buildAt?: string }
    if (version == null) return
    if (runningVersion === null) {
      runningVersion = version
      setState({ runningVersion: version, runningBuildAt: buildAt ?? null })
      return
    }
    if (version !== runningVersion) {
      reloadScheduled = true
      setState({ updateAvailable: true })
    }
  } catch { /* dev has no version.json — ignore */ }
}

const init = () => {
  if (initialized) return
  initialized = true
  void check()
  setInterval(() => { void check() }, POLL_INTERVAL_MS)
}

export function useVersionWatcher(): WatcherState {
  const [s, setS] = useState(state)
  useEffect(() => {
    listeners.add(setS)
    init()
    return () => { listeners.delete(setS) }
  }, [])
  return s
}
