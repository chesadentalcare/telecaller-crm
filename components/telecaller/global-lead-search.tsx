"use client"

import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, Loader2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { searchLeadsApi } from "@/lib/api/search"

const pretty = (s: string | null | undefined) =>
  (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

// Top-bar global lead search. Debounced server search across ALL of the user's
// leads (any stage); clicking a result opens that lead via `onOpenLead`.
export function GlobalLeadSearch({
  onOpenLead,
  className,
}: {
  onOpenLead: (id: string) => void
  className?: string
}) {
  const [input, setInput] = useState("")
  const [debounced, setDebounced] = useState("")
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input.trim()), 250)
    return () => clearTimeout(t)
  }, [input])

  const enabled = debounced.length >= 2
  const { data: results = [], isFetching } = useQuery({
    queryKey: ["lead-search", debounced],
    queryFn: () => searchLeadsApi(debounced),
    enabled,
    staleTime: 30_000,
  })

  // Close the dropdown when clicking outside the box.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  const pick = (id: number) => {
    onOpenLead(String(id))
    setInput("")
    setDebounced("")
    setOpen(false)
  }

  const showDropdown = open && enabled

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={input}
        onChange={(e) => { setInput(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false) }}
        placeholder="Search leads by name, phone, or ID…"
        className="h-9 w-64 bg-background pl-9 pr-8"
        inputMode="search"
        aria-label="Search leads"
      />
      {input && (
        <button
          type="button"
          onClick={() => { setInput(""); setDebounced(""); setOpen(false) }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}

      {showDropdown && (
        <div className="absolute right-0 z-50 mt-1 w-80 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
          {isFetching && results.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">No leads match &ldquo;{debounced}&rdquo;.</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => pick(r.id)}
                    className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {r.customer_name || `Lead #${r.id}`}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {r.phone || "no phone"} · #{r.id}{r.city ? ` · ${r.city}` : ""}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">{pretty(r.stage)}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
