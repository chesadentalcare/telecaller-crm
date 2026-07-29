"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/AuthContext"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Phone,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Inbox,
  LayoutDashboard,
  Activity,
  ClipboardCheck,
  AlertTriangle,
  MessageSquare,
  CalendarClock,
  BookOpen,
  type LucideIcon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useRole } from "@/hooks/use-role"
import type { UserRole } from "@/lib/auth/token"
import type { QueueCounts } from "@/lib/types/lead"

interface SidebarNavProps {
  activeView: string
  onViewChange: (view: string) => void
  queueCounts: QueueCounts
}

interface NavItem {
  id: string
  title: string
  icon: LucideIcon
  count?: number | null
  isReplyCount?: boolean
  roles?: UserRole[] | null
}

export function SidebarNav({ activeView, onViewChange, queueCounts }: SidebarNavProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { role, isManagerOrAbove } = useRole()

  const displayName = user?.fullName || user?.username || "—"
  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "Member"
  const initials =
    (user?.fullName || user?.username || "")
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"

  const handleLogout = () => {
    logout()
    router.replace("/login")
  }

  // Lean navigation: every status bucket lives behind the in-page segment switcher
  // inside Pipeline; the sidebar keeps only the genuinely-distinct work surfaces.
  const allStages = useMemo<NavItem[]>(
    () => [
      { id: "due",            title: "Due",            icon: CalendarClock,  count: queueCounts.callsDueAwaitingReply, isReplyCount: true,  roles: ["telecaller"] },
      { id: "pipeline",       title: "Pipeline",       icon: Inbox,          count: queueCounts.pipelineAwaitingReply, isReplyCount: true,  roles: null },
      { id: "flow-oversight", title: "Flow Oversight", icon: Activity,       count: null,                              isReplyCount: false, roles: ["manager", "admin"] },
      { id: "approvals",      title: "Approvals",      icon: ClipboardCheck, count: null,                              isReplyCount: false, roles: ["manager", "admin"] },
      { id: "docs",           title: "Guide",          icon: BookOpen,      count: null,                              isReplyCount: false, roles: null },
    ],
    [queueCounts],
  )

  const stages = useMemo(
    () =>
      isManagerOrAbove
        ? allStages
        : allStages.filter((s) => s.roles == null || (role !== null && s.roles.includes(role))),
    [allStages, role, isManagerOrAbove],
  )

  const renderItem = (item: NavItem) => {
    const active = activeView === item.id
    const Icon = item.icon
    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          onClick={() => onViewChange(item.id)}
          isActive={active}
          tooltip={item.title}
          className={cn(
            "relative h-9 gap-3 rounded-md px-3 text-sm font-medium transition-colors",
            active
              ? "bg-sidebar-accent text-sidebar-foreground"
              : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          )}
        >
          {/* Single accent indicator instead of per-item colors + connector dots. */}
          {active && (
            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
          )}
          <Icon className={cn("size-4 shrink-0", active ? "text-sidebar-primary" : "text-sidebar-foreground/55")} />
          <span className="flex items-center gap-1.5 truncate group-data-[collapsible=icon]:hidden">
            {item.title}
            {item.id === "pipeline" && queueCounts.neglected > 0 && (
              <span
                title="Brand-new leads with no activity (24h+) — call them"
                className="inline-flex items-center gap-0.5 rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white"
              >
                <AlertTriangle className="size-2.5" />
                {queueCounts.neglected}
              </span>
            )}
          </span>
        </SidebarMenuButton>

        {item.count != null && item.count > 0 && (
          <SidebarMenuBadge
            title={item.isReplyCount ? "WhatsApp replies awaiting your response" : undefined}
            className={cn(
              "gap-1 text-[10px] font-semibold",
              item.isReplyCount
                ? "bg-emerald-500 text-white"
                : active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "bg-sidebar-accent text-sidebar-foreground",
            )}
          >
            {item.isReplyCount && <MessageSquare className="size-2.5" />}
            {item.count}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            TC
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold leading-tight text-sidebar-foreground">TeleCRM</span>
            <span className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50">Dental Equipment</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>{renderItem({ id: "home", title: "Dashboard", icon: LayoutDashboard })}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-3 p-0">
          <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">{stages.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-2.5 px-2 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col items-start group-data-[collapsible=icon]:hidden">
                <span className="w-full truncate text-sm font-medium leading-tight">{displayName}</span>
                <span className="text-[10px] text-sidebar-foreground/60">{roleLabel}</span>
              </div>
              <ChevronDown className="ml-auto size-4 opacity-50 group-data-[collapsible=icon]:hidden" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <Phone className="mr-2 size-4" />
              My Calls Today
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <HelpCircle className="mr-2 size-4" />
              Help &amp; Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
