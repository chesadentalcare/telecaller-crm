"use client"

import { RefreshCw } from "lucide-react"
import { useVersionWatcher, forceUpdateReload } from "@/hooks/use-version-watcher"

export function VersionUpdateBanner() {
  const { updateAvailable } = useVersionWatcher()
  if (!updateAvailable) return null
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-3 top-3 z-[10000] mx-auto flex max-w-lg items-center gap-3 rounded-xl border border-amber-600/50 bg-amber-500 px-4 py-3 text-amber-950 shadow-2xl ring-1 ring-amber-950/10 animate-in fade-in slide-in-from-top-4"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-950/10">
        <RefreshCw className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">A new version is available</p>
        <p className="text-xs font-medium opacity-90">Click Refresh to load it — nothing changes until you do.</p>
      </div>
      <button
        type="button"
        onClick={() => void forceUpdateReload()}
        className="shrink-0 rounded-lg bg-amber-950 px-3.5 py-2 text-xs font-bold text-amber-50 shadow-sm hover:bg-amber-900"
      >
        Refresh now
      </button>
    </div>
  )
}
