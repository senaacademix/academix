"use client"

import * as React from "react"
import Image from "next/image"
import { SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"
import { getRoleFromUser } from "@/features/auth/services/authService"
import { cn } from "@/lib/utils"

export function AppIdentity() {
  const { data: session, isPending } = authClient.useSession()

  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const role = getRoleFromUser(session?.user)

  const getRoleLabel = () => {
    switch (role) {
      case "admin":
        return "Admin Panel"
      case "teacher":
        return "Panel Profesor"
      case "student":
        return "Panel Estudiante"
      default:
        return "AcademiX"
    }
  }

  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div
          className={cn(
            "flex items-center transition-all duration-200 ease-in-out w-full",
            isCollapsed ? "justify-center h-12 py-2" : "justify-start h-16 border-b bg-sidebar px-4"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className={cn("relative flex items-center justify-center shrink-0 transition-all", isCollapsed ? "h-8 w-8" : "h-9 w-9")}>
              <Image 
                src="/logo.png" 
                alt="Logo" 
                width={isCollapsed ? 32 : 36} 
                height={isCollapsed ? 32 : 36} 
                className="object-contain" 
                priority
              />
            </div>

            {!isCollapsed && (
              isMounted && !isPending ? (
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-bold text-sidebar-foreground leading-tight whitespace-nowrap">{getRoleLabel()}</span>
                  <span className="text-[10px] text-muted-foreground leading-none mt-0.5">AcademiX</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="h-4 w-20 animate-pulse rounded bg-sidebar-accent" />
                  <span className="h-3 w-12 animate-pulse rounded bg-sidebar-accent" />
                </div>
              )
            )}
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
