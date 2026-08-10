const REP_PALETTE = [
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#4f46e5",
  "#ca8a04",
  "#0d9488",
]

export function repColor(name?: string | null): string {
  if (!name) return "#64748b"
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return REP_PALETTE[hash % REP_PALETTE.length]
}
