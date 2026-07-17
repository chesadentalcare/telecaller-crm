import { SelectItem } from "@/components/ui/select"
import type { SalesUserRow } from "@/lib/api/leads"

function Row(u: SalesUserRow) {
  return (
    <SelectItem key={u.username} value={u.username} disabled={!u.sales_person_code}>
      <span className="font-medium">{u.full_name || u.username}</span>
      <span className="text-muted-foreground"> · {u.role.replace("_", " ")}</span>
      {u.match_label ? (
        <span className="ml-1 rounded bg-emerald-500/15 px-1 py-0.5 text-[10px] font-medium text-emerald-600">
          ★ {u.match_label}
        </span>
      ) : u.territory_label ? (
        <span className="text-muted-foreground"> · {u.territory_label}</span>
      ) : null}
      {!u.sales_person_code ? <span className="text-amber-600"> · ⚠ no SAP code</span> : null}
    </SelectItem>
  )
}

export function SalesUserOptions({
  salesUsers,
  loading,
}: {
  salesUsers: SalesUserRow[]
  loading?: boolean
}) {
  const matched = salesUsers.filter((u) => (u.match_tier ?? 0) > 0)
  const rest = salesUsers.filter((u) => (u.match_tier ?? 0) === 0)

  return (
    <>
      {matched.length > 0 && (
        <>
          <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            Suggested for this territory
          </div>
          {matched.map(Row)}
          {rest.length > 0 && (
            <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              All sales employees
            </div>
          )}
        </>
      )}
      {rest.map(Row)}
      {!loading && salesUsers.length === 0 && (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">No active salespeople found</div>
      )}
    </>
  )
}
