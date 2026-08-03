"use client";

import { useEffect, useState } from "react";
import { getSettingsAction } from "@/features/admin/actions/settingsActions";
import { authClient } from "@/lib/auth-client";
import { getRoleFromUser } from "@/features/auth/services/authService";
import Link from "next/link";
import { formatName } from "@/lib/utils";
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
    <div className="w-full space-y-8 pb-12">
      {/* Banner Hero Estilo AI Canvas Adaptativo */}
      <section className="relative rounded-3xl overflow-hidden bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-8 sm:p-12 backdrop-blur-2xl shadow-xl dark:shadow-2xl dark:shadow-primary/5 transition-colors">
        {/* Background Grid & Glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#64748b10_1px,transparent_1px),linear-gradient(to_bottom,#64748b10_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 dark:bg-primary/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Panel Académico de {role === "teacher" ? "Profesor" : role === "admin" ? "Administrador" : "Estudiante"}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight"
          >
            ¡Hola, <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-primary dark:from-white dark:via-slate-200 dark:to-primary bg-clip-text text-transparent">{userName ? formatName(userName) : 'Docente'}</span>!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-600 dark:text-slate-400 text-sm sm:text-base capitalize flex items-center justify-center gap-2 font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{displayDate}</span>
            {settings.institutionName && (
              <>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{settings.institutionName}</span>
              </>
            )}
          </motion.p>
        </div>
      </section>

      {/* Quick Access Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Acceso Rápido</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Selecciona el módulo al que deseas acceder</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link key={index} href={item.url} className="group">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="relative rounded-3xl bg-white/90 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/80 p-6 hover:border-primary/50 dark:hover:border-slate-700 transition-all duration-300 backdrop-blur-xl shadow-sm hover:shadow-xl dark:shadow-lg dark:hover:shadow-2xl dark:hover:shadow-primary/5 flex items-start gap-5 overflow-hidden"
                >
                  <div className={`p-4 rounded-2xl border ${item.color} shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7" />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors flex items-center gap-2">
                        {item.title}
                      </h3>
                      <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
