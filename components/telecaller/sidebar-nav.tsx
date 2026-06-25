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
  ChevronRight,
  Inbox,
  PhoneCall,
  LayoutDashboard,
  Briefcase,
  Activity,
  ClipboardCheck,
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

// Hoisted: identity-stable across renders, doesn't depend on props.
const HOME_OPTION = {
  id: "home",
  title: "Dashboard",
  subtitle: "Analytics & Overview",
  icon: LayoutDashboard,
  color: "bg-primary",
  textColor: "text-primary",
  borderColor: "border-primary",
} as const

export function SidebarNav({ activeView, onViewChange, queueCounts }: SidebarNavProps) {
  const homeOption = HOME_OPTION

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

  // Lean navigation (Amendment): the ~12-item lifecycle list overwhelmed reps, so
  // every status bucket (drip / no-response / idle / 6-month / re-qualify /
  // reactivation / archived) now lives behind the in-page segment switcher inside
  // Pipeline. The sidebar keeps only the genuinely-distinct work surfaces.
  // "New Lead" moved to a header button; "Qualification" is contextual (lead cockpit).
  // Each stage declares which roles can see it. null = all roles.
  const allStages = useMemo(
    () => [
      { id: "calls-due",      title: "Calls Due",      subtitle: "Today's call worklist",   icon: PhoneCall,    color: "bg-blue-500",   textColor: "text-blue-500",   borderColor: "border-blue-500",   count: queueCounts.callsDue, isAction: false, roles: ["telecaller"] as UserRole[] },
      { id: "pipeline",       title: "Pipeline",       subtitle: "Your full lead book",     icon: Inbox,        color: "bg-indigo-500", textColor: "text-indigo-500", borderColor: "border-indigo-500", count: queueCounts.pipeline, isAction: false, roles: null },
      { id: "sales-pipeline", title: "Sales Pipeline", subtitle: "Handed-over leads",       icon: Briefcase,    color: "bg-emerald-500", textColor: "text-emerald-500", borderColor: "border-emerald-500", count: null,                 isAction: false, roles: ["sale_staff", "coordinator", "sale_head", "manager", "admin"] as UserRole[] },
      { id: "flow-oversight", title: "Flow Oversight", subtitle: "Team analytics & health", icon: Activity,     color: "bg-amber-500",  textColor: "text-amber-500",  borderColor: "border-amber-500",  count: null,                 isAction: false, roles: ["manager", "admin"] as UserRole[] },
      { id: "approvals",      title: "Approvals",      subtitle: "Discount requests",       icon: ClipboardCheck, color: "bg-violet-500", textColor: "text-violet-500", borderColor: "border-violet-500", count: null,                 isAction: false, roles: ["manager", "admin"] as UserRole[] },
    ],
    [queueCounts],
  )

  // Manager/admin see everything. Other roles see only their permitted items.
  const lifecycleStages = useMemo(
    () => isManagerOrAbove
      ? allStages
      : allStages.filter((s) => s.roles === null || (role !== null && s.roles.includes(role))),
    [allStages, role, isManagerOrAbove],
  )

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
            TC
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">TeleCRM</span>
            <span className="text-[10px] text-sidebar-foreground/70 uppercase tracking-wide">Dental Equipment</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        {/* Home Dashboard */}
        <SidebarGroup className="py-3">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange(homeOption.id)}
                  isActive={activeView === homeOption.id}
                  tooltip={homeOption.title}
                  className={cn(
                    "h-auto py-2.5",
                    activeView === homeOption.id && "bg-sidebar-accent"
                  )}
                >
                  <div className={cn(
                    "flex size-8 items-center justify-center rounded-md",
                    activeView === homeOption.id ? homeOption.color : "bg-sidebar-accent",
                    activeView === homeOption.id ? "text-white" : homeOption.textColor
                  )}>
                    <homeOption.icon className="size-4" />
                  </div>
                  <div className="flex flex-col items-start gap-0 group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-medium">{homeOption.title}</span>
                    <span className="text-[10px] text-sidebar-foreground/60">{homeOption.subtitle}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Divider */}
        <div className="mx-3 border-t border-sidebar-border" />

        {/* Lead Lifecycle - Sequential Flow */}
        <SidebarGroup className="py-3">
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 px-2 mb-2">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-sidebar-border group-data-[collapsible=icon]:hidden" />
              
              <SidebarMenu className="gap-0">
                {lifecycleStages.map((stage, index) => (
                  <SidebarMenuItem key={stage.id} className="relative">
                    {/* Stage connector dot */}
                    <div 
                      className={cn(
                        "absolute left-2 top-1/2 -translate-y-1/2 size-3 rounded-full border-2 bg-sidebar z-10 group-data-[collapsible=icon]:hidden",
                        activeView === stage.id ? stage.borderColor : "border-sidebar-border"
                      )}
                    >
                      {activeView === stage.id && (
                        <div className={cn("absolute inset-0.5 rounded-full", stage.color)} />
                      )}
                    </div>
                    
                    <SidebarMenuButton
                      onClick={() => onViewChange(stage.id)}
                      isActive={activeView === stage.id}
                      tooltip={stage.title}
                      className={cn(
                        "h-auto py-2 pl-7 group-data-[collapsible=icon]:pl-2",
                        activeView === stage.id && "bg-sidebar-accent"
                      )}
                    >
                      <div className={cn(
                        "flex size-8 items-center justify-center rounded-md",
                        activeView === stage.id ? stage.color : "bg-sidebar-accent",
                        activeView === stage.id ? "text-white" : stage.textColor
                      )}>
                        <stage.icon className="size-4" />
                      </div>
                      <div className="flex flex-col items-start gap-0 group-data-[collapsible=icon]:hidden">
                        <span className="text-sm font-medium">{stage.title}</span>
                        <span className="text-[10px] text-sidebar-foreground/60">{stage.subtitle}</span>
                      </div>
                      {stage.isAction && (
                        <ChevronRight className="ml-auto size-4 opacity-50 group-data-[collapsible=icon]:hidden" />
                      )}
                    </SidebarMenuButton>
                    
                    {stage.count !== null && stage.count > 0 && (
                      <SidebarMenuBadge className={cn(
                        "text-[10px] font-semibold",
                        activeView === stage.id 
                          ? `${stage.color} text-white` 
                          : "bg-sidebar-accent text-sidebar-foreground"
                      )}>
                        {stage.count}
                      </SidebarMenuBadge>
                    )}
                    
                    {/* Arrow indicator between stages */}
                    {index < lifecycleStages.length - 1 && (
                      <div className="absolute left-[15px] -bottom-1 text-sidebar-foreground/30 group-data-[collapsible=icon]:hidden">
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="currentColor">
                          <path d="M5 8L0 0h10L5 8z" />
                        </svg>
                      </div>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 px-2 h-auto py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <Avatar className="size-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium">{displayName}</span>
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
              Help & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
