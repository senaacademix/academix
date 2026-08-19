"use client";

import { useEffect, useState } from "react";
import { getSettingsAction } from "@/features/admin/actions/settingsActions";
import { authClient } from "@/lib/auth-client";
import { getRoleFromUser } from "@/features/auth/services/authService";
import Link from "next/link";
import { cn, formatName } from "@/lib/utils";
import { motion } from "framer-motion";
import { getFormattedTodayDate } from "@/lib/dateUtils";
import {
  Users,
  BookOpen,
  Calendar,
  Settings2,
  CalendarClock,
  ClipboardList,
  Sparkles,
  ArrowRight
} from "lucide-react";

import { PageTransition, StaggerGroup, StaggerItem } from "@/components/ui/animated-container";
import { SpotlightCard } from "@/components/ui/spotlight-card";

import { StatWidget } from "@/components/aicanvas/stat-widget";
import { QuickCalendarWidget } from "@/components/aicanvas/quick-calendar-widget";
import { ProgressTrackerCard } from "@/components/aicanvas/progress-tracker-card";
import { GraduationCap, CheckCircle, Activity, Award } from "lucide-react";

interface HomePageProps {
  initialUserName?: string;
  initialUserRole?: string;
  initialDate?: string;
}

export default function HomePage({ initialUserName, initialUserRole, initialDate }: HomePageProps) {
  const [settings, setSettings] = useState<{ institutionName?: string | null }>({});
  const [mounted, setMounted] = useState(false);
  const [clientDate, setClientDate] = useState<string>("");
  const { data: session } = authClient.useSession();

  const role = initialUserRole || getRoleFromUser(session?.user);
  const userName = initialUserName || session?.user?.name;

  useEffect(() => {
    setMounted(true);
    setClientDate(getFormattedTodayDate());
  }, []);

  const displayDate = mounted && clientDate ? clientDate : (initialDate || "");

  useEffect(() => {
    const fetchData = async () => {
      const [settingsData] = await Promise.all([getSettingsAction()]);
      setSettings(settingsData || {});
    };
    fetchData();
  }, []);

  const getNavigationItems = () => {
    const activeRole = role;
    if (!activeRole) return [];

    if (activeRole === "admin") {
      return [
        {
          title: "Gestión de Estudiantes",
          description: "Administra usuarios, inscripciones y credenciales de acceso.",
          url: "/dashboard/admin/users",
          icon: Users,
          color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        },
        {
          title: "Estructura Académica",
          description: "Configura cursos, materias, semestres y asignaciones.",
          url: "/dashboard/admin/courses",
          icon: BookOpen,
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        },
        {
          title: "Programación de Horarios",
          description: "Organiza la disponibilidad de docentes y franjas horarias.",
          url: "/dashboard/admin/schedule",
          icon: Calendar,
          color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
        },
        {
          title: "Configuración General",
          description: "Parámetros globales del colegio e institución.",
          url: "/dashboard/admin/settings",
          icon: Settings2,
          color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
        }
      ];
    } else if (activeRole === "teacher") {
      return [
        {
          title: "Mis Grupos",
          description: "Toma asistencia, califica actividades y gestiona estudiantes de tus fichas.",
          url: "/dashboard/teacher",
          icon: Users,
          color: "bg-primary/10 text-primary border-primary/20"
        },
        {
          title: "Horario y Configuración",
          description: "Consulta tus clases asignadas, disponibilidad y materias declaradas.",
          url: "/dashboard/teacher/schedule",
          icon: CalendarClock,
          color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
        }
      ];
    } else {
      return [
        {
          title: "Registro Académico",
          description: "Revisa tus notas acumuladas, asistencias y boletines.",
          url: "/dashboard/student/records",
          icon: ClipboardList,
          color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        },
        {
          title: "Horario Semanal",
          description: "Consulta el calendario de tus clases y materias activas.",
          url: "/dashboard/student/schedule",
          icon: CalendarClock,
          color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
        }
      ];
    }
  };

  const navItems = getNavigationItems();

  return (
    <PageTransition className="w-full space-y-8 pb-12">
      {/* Banner Hero Estilo AI Canvas Adaptativo */}
      <section className="relative rounded-3xl overflow-hidden bg-card/80 border border-border/80 p-8 sm:p-12 backdrop-blur-2xl shadow-xl dark:shadow-2xl dark:shadow-primary/5 transition-colors">
        {/* Background Grid & Glow */}
        <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 dark:bg-primary/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold backdrop-blur-md badge-glow"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Panel Académico de {role === "teacher" ? "Profesor" : role === "admin" ? "Administrador" : "Estudiante"}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-tight text-balance"
          >
            ¡Hola, <span className="bg-gradient-to-r from-foreground via-foreground/80 to-primary bg-clip-text text-transparent">{userName ? formatName(userName) : 'Docente'}</span>!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted-foreground text-sm sm:text-base capitalize flex items-center justify-center gap-2 font-medium text-pretty"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{displayDate}</span>
            {settings.institutionName && (
              <>
                <span className="text-muted-foreground/60">•</span>
                <span className="text-foreground font-semibold">{settings.institutionName}</span>
              </>
            )}
          </motion.p>
        </div>
      </section>

      {/* Metrics Grid AI Canvas */}
      <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StaggerItem>
          <StatWidget
            title="Asistencia General"
            value="96.4%"
            change="+2.1%"
            isPositive={true}
            icon={CheckCircle}
            description="Asistencia promedio semanal"
          />
        </StaggerItem>
        <StaggerItem>
          <StatWidget
            title="Fichas / Cursos"
            value="12 Cursos"
            change="+1"
            isPositive={true}
            icon={GraduationCap}
            description="Cursos activos asignados"
          />
        </StaggerItem>
        <StaggerItem>
          <StatWidget
            title="Rendimiento Promedio"
            value="4.5 / 5.0"
            change="+0.3"
            isPositive={true}
            icon={Award}
            description="Desempeño general de estudiantes"
          />
        </StaggerItem>
        <StaggerItem>
          <StatWidget
            title="Actividades Pendientes"
            value="3 Evaluaciones"
            change="-2"
            isPositive={true}
            icon={Activity}
            description="Por calificar este período"
          />
        </StaggerItem>
      </StaggerGroup>

      {/* Main Grid: Quick Access & AI Canvas Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Access Section */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2 text-balance">
                <span>Acceso Rápido</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1 text-pretty">Selecciona el módulo al que deseas acceder</p>
            </div>
          </div>

          <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <StaggerItem key={index}>
                  <Link href={item.url} className="group block h-full">
                    <SpotlightCard className="h-full flex items-center gap-4 transition-all duration-300">
                      <div className={cn("w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300", item.color)}>
                        <Icon className="w-6 h-6" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {item.title}
                          </h3>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 text-pretty">
                          {item.description}
                        </p>
                      </div>
                    </SpotlightCard>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        </section>

        {/* Sidebar Widgets Section */}
        <section className="space-y-6">
          <QuickCalendarWidget />
          <ProgressTrackerCard
            title="Progreso del Período"
            subtitle="Período Académico Actual"
            progressPercentage={78}
            completedTasks={14}
            totalTasks={18}
          />
        </section>
      </div>
    </PageTransition>
  );
}
