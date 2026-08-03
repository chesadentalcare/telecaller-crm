"use client"

import { RefreshCw } from "lucide-react"
import { useVersionWatcher, forceUpdateReload } from "@/hooks/use-version-watcher"

// Mounted app-wide (in Providers). Calling useVersionWatcher() here starts the
// single poll loop; the banner only renders once a new build is detected. A
// staggered auto-reload also fires from the watcher, so this is the "reload now"
// shortcut, not the only path.
export function VersionUpdateBanner() {
  const { updateAvailable } = useVersionWatcher()
  if (!updateAvailable) return null
  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed inset-x-3 top-3 z-[10000] mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-foreground px-4 py-3 text-background shadow-xl"
    >
      <RefreshCw className="size-4 shrink-0 animate-spin" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Update available</p>
        <p className="text-xs opacity-80">A new version is ready — refreshing…</p>
      </div>
      <button
        type="button"
        onClick={() => void forceUpdateReload()}
        className="shrink-0 rounded-lg bg-background px-3 py-1.5 text-xs font-semibold text-foreground"
      >
        Refresh now
      </button>
    </div>
  )
}
