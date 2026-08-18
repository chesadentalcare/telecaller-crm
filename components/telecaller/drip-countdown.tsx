"use client"

import { memo, useEffect, useState } from "react"
import { Timer, Phone, MessageSquare } from "lucide-react"

export function formatCountdown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`
}

export const Countdown = memo(function Countdown({
  seconds,
  channel,
}: {
  seconds: number
  channel?: "call" | "whatsapp" | null
}) {
  const [remaining, setRemaining] = useState(seconds)
  useEffect(() => setRemaining(seconds), [seconds])
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      setRemaining((s) => (s <= 0 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [])
  const urgent = remaining < 3600
  const Icon = channel === "call" ? Phone : channel === "whatsapp" ? MessageSquare : Timer
  const word = channel === "call" ? "call " : channel === "whatsapp" ? "WhatsApp " : ""
  return (
    <span className={`inline-flex items-center gap-1 ${urgent ? "text-warning font-medium" : ""}`}>
      <Icon className="size-3" />next {word}{formatCountdown(remaining)}
    </span>
  )
})
