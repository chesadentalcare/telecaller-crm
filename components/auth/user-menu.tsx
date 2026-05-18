"use client"

import { LogOut, User } from "lucide-react"
import { useRouter } from "next/navigation"

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth/AuthContext"

export function UserMenu() {
  const router = useRouter()
  const { user, logout } = useAuth()

  if (!user) return null

  const initials =
    (user.fullName || user.username)
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"

  const handleLogout = () => {
    logout()
    router.replace("/login")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 rounded-full" aria-label="Account menu">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <User className="size-4 text-muted-foreground" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{user.fullName || user.username}</div>
            <div className="truncate text-[11px] text-muted-foreground">{user.role}</div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
