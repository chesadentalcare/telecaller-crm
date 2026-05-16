"use client"

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
  UserPlus,
  Phone,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Inbox,
  PhoneCall,
  PhoneOff,
  Timer,
  Moon,
  Archive,
  CheckCircle2,
  Calendar,
  Video,
  LayoutDashboard,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface SidebarNavProps {
  activeView: string
  onViewChange: (view: string) => void
  queueCounts: {
    pipeline: number
    noResponse: number
    drip: number
    idle: number
    dormant: number
  }
}

export function SidebarNav({ activeView, onViewChange, queueCounts }: SidebarNavProps) {
  // Home/Dashboard option
  const homeOption = {
    id: "home",
    title: "Dashboard",
    subtitle: "Analytics & Overview",
    icon: LayoutDashboard,
    color: "bg-primary",
    textColor: "text-primary",
    borderColor: "border-primary",
  }

  // Lifecycle stages in order
  const lifecycleStages = [
    {
      id: "new-lead",
      title: "New Lead",
      subtitle: "Intake Form",
      icon: UserPlus,
      color: "bg-emerald-500",
      textColor: "text-emerald-500",
      borderColor: "border-emerald-500",
      count: null,
      isAction: true,
    },
    {
      id: "pipeline",
      title: "Pipeline",
      subtitle: "Active Leads",
      icon: Inbox,
      color: "bg-blue-500",
      textColor: "text-blue-500",
      borderColor: "border-blue-500",
      count: queueCounts.pipeline,
      isAction: false,
    },
    {
      id: "qualification",
      title: "Qualification",
      subtitle: "Rapid Qualify",
      icon: PhoneCall,
      color: "bg-violet-500",
      textColor: "text-violet-500",
      borderColor: "border-violet-500",
      count: null,
      isAction: true,
    },
    {
      id: "no-response",
      title: "No Response",
      subtitle: "4+ Failed Calls",
      icon: PhoneOff,
      color: "bg-red-500",
      textColor: "text-red-500",
      borderColor: "border-red-500",
      count: queueCounts.noResponse,
      isAction: false,
    },
    {
      id: "drip",
      title: "Drip Queue",
      subtitle: "Nurture Campaign",
      icon: Timer,
      color: "bg-amber-500",
      textColor: "text-amber-500",
      borderColor: "border-amber-500",
      count: queueCounts.drip,
      isAction: false,
    },
    {
      id: "idle",
      title: "Idle Queue",
      subtitle: "No Activity 7d",
      icon: Moon,
      color: "bg-slate-400",
      textColor: "text-slate-400",
      borderColor: "border-slate-400",
      count: queueCounts.idle,
      isAction: false,
    },
    {
      id: "dormant",
      title: "Dormant",
      subtitle: "No Activity 30d+",
      icon: Archive,
      color: "bg-slate-600",
      textColor: "text-slate-600",
      borderColor: "border-slate-600",
      count: queueCounts.dormant,
      isAction: false,
    },
  ]

  // Outcomes (exits from lifecycle)
  const outcomes = [
    {
      id: "converted",
      title: "Converted",
      icon: CheckCircle2,
      color: "text-emerald-500",
      count: 12,
    },
    {
      id: "meeting-scheduled",
      title: "Meetings",
      icon: Calendar,
      color: "text-blue-500",
      count: 5,
    },
    {
      id: "demo-booked",
      title: "Demos",
      icon: Video,
      color: "text-violet-500",
      count: 3,
    },
  ]

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
            Lead Lifecycle
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

        {/* Divider */}
        <div className="mx-3 my-2 border-t border-sidebar-border" />

        {/* Outcomes / Conversions */}
        <SidebarGroup className="py-2">
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 px-2">
            Today&apos;s Wins
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="mx-2 mt-2 grid grid-cols-3 gap-1 group-data-[collapsible=icon]:grid-cols-1">
              {outcomes.map((outcome) => (
                <div
                  key={outcome.id}
                  className="flex flex-col items-center justify-center rounded-md bg-sidebar-accent/50 p-2 text-center"
                >
                  <outcome.icon className={cn("size-4 mb-1", outcome.color)} />
                  <span className="text-sm font-bold text-sidebar-foreground">{outcome.count}</span>
                  <span className="text-[9px] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">{outcome.title}</span>
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Lifecycle Flow Diagram - Collapsed View */}
        <div className="mx-3 mt-3 rounded-lg bg-sidebar-accent/30 p-3 group-data-[collapsible=icon]:hidden">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-2">
            Flow Overview
          </div>
          <div className="flex items-center justify-between text-[9px]">
            <div className="flex flex-col items-center">
              <div className="size-6 rounded bg-emerald-500/20 flex items-center justify-center">
                <UserPlus className="size-3 text-emerald-500" />
              </div>
              <span className="mt-1 text-sidebar-foreground/60">In</span>
            </div>
            <ChevronRight className="size-3 text-sidebar-foreground/30" />
            <div className="flex flex-col items-center">
              <div className="size-6 rounded bg-blue-500/20 flex items-center justify-center">
                <PhoneCall className="size-3 text-blue-500" />
              </div>
              <span className="mt-1 text-sidebar-foreground/60">Call</span>
            </div>
            <ChevronRight className="size-3 text-sidebar-foreground/30" />
            <div className="flex flex-col items-center">
              <div className="size-6 rounded bg-amber-500/20 flex items-center justify-center">
                <Timer className="size-3 text-amber-500" />
              </div>
              <span className="mt-1 text-sidebar-foreground/60">Drip</span>
            </div>
            <ChevronRight className="size-3 text-sidebar-foreground/30" />
            <div className="flex flex-col items-center">
              <div className="size-6 rounded bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="size-3 text-emerald-500" />
              </div>
              <span className="mt-1 text-sidebar-foreground/60">Win</span>
            </div>
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 px-2 h-auto py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <Avatar className="size-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
                  PY
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium">Pappu Yadav</span>
                <span className="text-[10px] text-sidebar-foreground/60">Telecaller</span>
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
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
