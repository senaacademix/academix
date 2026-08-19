"use client";

import * as React from "react";
import Image from "next/image";
import { SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { getRoleFromUser } from "@/features/auth/services/authService";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export function AppIdentity() {
  const { data: session, isPending } = authClient.useSession();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const role = getRoleFromUser(session?.user);

  const getRoleBadge = () => {
    switch (role) {
      case "admin":
        return { label: "Admin Panel", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
      case "teacher":
        return { label: "Panel Profesor", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
      case "student":
        return { label: "Panel Estudiante", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
      default:
        return { label: "AcademiX", color: "bg-primary/10 text-primary border-primary/20" };
    }
  };

  const badgeInfo = getRoleBadge();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div
          className={cn(
            "flex items-center transition-all duration-300 ease-in-out w-full border-b border-sidebar-border/60",
            isCollapsed
              ? "justify-center h-14 py-2"
              : "justify-start h-20 px-4 py-3 bg-sidebar/50 backdrop-blur-md"
          )}
        >
          <div className="flex items-center gap-3">
            {/* Logo Container con Glow */}
            <div
              className={cn(
                "relative flex items-center justify-center shrink-0 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-md shadow-primary/10 transition-transform duration-300 hover:scale-105",
                isCollapsed ? "h-9 w-9" : "h-11 w-11"
              )}
            >
              <Image
                src="/logo.png"
                alt="Logo"
                width={isCollapsed ? 26 : 32}
                height={isCollapsed ? 26 : 32}
                className="object-contain"
                priority
              />
            </div>

            {!isCollapsed && (
              isMounted && !isPending ? (
                <div className="flex flex-col items-start min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-black tracking-tight text-sidebar-foreground leading-tight">
                      Academi<span className="text-primary">X</span>
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <span
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      badgeInfo.color
                    )}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{badgeInfo.label}</span>
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <span className="h-4 w-24 animate-pulse rounded-lg bg-sidebar-accent" />
                  <span className="h-3 w-16 animate-pulse rounded-lg bg-sidebar-accent" />
                </div>
              )
            )}
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
