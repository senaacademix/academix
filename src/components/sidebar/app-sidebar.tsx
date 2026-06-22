"use client"

import * as React from "react"
import { BookOpen, Calendar, BarChart, Users, FileText, Activity, ScrollText, Home, Wrench, ClipboardList, Settings2, GraduationCap, Building2 } from "lucide-react"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavUser } from "@/components/sidebar/nav-user"

import { authClient } from "@/lib/auth-client"
import { getRoleFromUser } from "@/features/auth/services/authService"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { AppIdentity } from "./app-identity"


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, isPending } = authClient.useSession()
  const [mounted, setMounted] = React.useState(false)

  const role = getRoleFromUser(session?.user)

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])


  // Prevent hydration mismatch by not rendering on server
  if (!mounted) {
    return null
  }

  if (isPending) {
    return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <AppIdentity />
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4 space-y-4">
            <div className="h-4 w-24 animate-pulse rounded bg-sidebar-accent" />
            <div className="h-4 w-32 animate-pulse rounded bg-sidebar-accent" />
            <div className="h-4 w-20 animate-pulse rounded bg-sidebar-accent" />
          </div>
        </SidebarContent>
        <SidebarFooter>
          <div className="h-12 w-full animate-pulse rounded bg-sidebar-accent" />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    )
  }

  const navMain =
    role === "admin"
      ? [
        {
          title: "Inicio",
          url: "/dashboard",
          icon: Home,
          isActive: false,
        },
        {
          title: "Programas de Formación",
          url: "/dashboard/admin/courses",
          icon: BookOpen,
          isActive: false,
        },
        {
          title: "Ambientes de Formación",
          url: "/dashboard/admin/environments",
          icon: Building2,
          isActive: false,
        },
        {
          title: "Banco de Profesores",
          url: "/dashboard/admin/teachers",
          icon: GraduationCap,
          isActive: false,
        },
        {
          title: "Grupos",
          url: "/dashboard/admin/users",
          icon: Users,
          isActive: false,
        },
        {
          title: "Programación de Horarios",
          url: "/dashboard/admin/schedule",
          icon: Calendar,
          isActive: false,
        },
        {
          title: "Configuración",
          url: "/dashboard/admin/settings",
          icon: Settings2,
          isActive: false,
        },
        {
          title: "Licencia de Uso",
          url: "/dashboard/license",
          icon: ScrollText,
          isActive: false,
        },
      ]
      : role === "teacher"
        ? [
          {
            title: "Inicio",
            url: "/dashboard",
            icon: Home,
            isActive: false,
          },
          {
            title: "Mis Grupos",
            url: "/dashboard/teacher",
            icon: Users,
            isActive: false,
          },
          {
            title: "Horario y Config.",
            url: "/dashboard/teacher/schedule",
            icon: Calendar,
            isActive: false,
          },
          {
            title: "Licencia de Uso",
            url: "/dashboard/license",
            icon: ScrollText,
            isActive: false,
          },
        ]
        : role === "student"
          ? [
            {
              title: "Inicio",
              url: "/dashboard",
              icon: Home,
              isActive: false,
            },
            {
              title: "Registro Académico",
              url: "/dashboard/student/records",
              icon: ClipboardList,
              isActive: false,
            },
            {
              title: "Calificaciones",
              url: "/dashboard/student/evaluations",
              icon: BarChart,
              isActive: false,
            },
            {
              title: "Horario",
              url: "/dashboard/student/schedule",
              icon: Calendar,
              isActive: false,
            },
          ]
          : []

  const user = {
    name: (session?.user as { name?: string } | null | undefined)?.name || "Usuario",
    email: (session?.user as { email?: string } | null | undefined)?.email || "m@example.com",
    avatar:
      (session?.user as { image?: string } | null | undefined)?.image || "/avatars/shadcn.jpg",
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="p-0">
        <AppIdentity />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
