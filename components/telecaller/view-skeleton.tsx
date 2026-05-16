import { Skeleton } from "@/components/ui/skeleton"

// Generic placeholder shown while a lazy-loaded view is fetching its chunk.
// Mirrors the rough shape of a card-based list so the layout doesn't jolt
// once content lands.
export function ViewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full rounded-lg" />
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Skeleton className="size-10 rounded-full shrink-0" />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <Skeleton className="h-3.5 w-40 max-w-full" />
                  <Skeleton className="h-3 w-56 max-w-full" />
                </div>
              </div>
              <Skeleton className="h-8 w-20 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
