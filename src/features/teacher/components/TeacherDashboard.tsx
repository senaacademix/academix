"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatName } from "@/lib/utils";
import { motion } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { getFormattedTodayDate } from "@/lib/dateUtils";
import { Sparkles, Users } from "lucide-react";

const GroupManager = dynamic(
  () => import("./GroupManager").then((m) => ({ default: m.GroupManager })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <LoadingSpinner className="w-10 h-10 text-primary" />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse">
          Cargando panel del profesor...
        </span>
      </div>
    ),
  }
);

interface TeacherDashboardProps {
  courses: any[];
  groups: any[];
  currentDate?: string;
  teacherName: string;
  formattedDate?: string;
  scheduleStartDate?: string | null;
  scheduleEndDate?: string | null;
}

export function TeacherDashboard({
  courses,
  groups,
  currentDate,
  teacherName,
  formattedDate,
  scheduleStartDate,
  scheduleEndDate
}: TeacherDashboardProps) {
  const { data: session } = authClient.useSession();
  const [mounted, setMounted] = useState(false);
  const [clientDate, setClientDate] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    setClientDate(getFormattedTodayDate());
  }, []);

  const displayDate = mounted && clientDate ? clientDate : (formattedDate || "");

  return (
    <div className="flex-1 space-y-6 sm:space-y-8 p-4 sm:p-6 md:p-8 overflow-x-hidden w-full max-w-full min-w-0">
      {/* AI Canvas Header Banner (Adaptativo Modo Claro/Oscuro) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-3xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 backdrop-blur-2xl shadow-md dark:shadow-xl overflow-hidden transition-colors"
      >
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 dark:bg-primary/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Panel de Docente</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ¡Hola,{" "}
              <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-primary dark:from-white dark:via-slate-200 dark:to-primary bg-clip-text text-transparent">
                {teacherName ? formatName(teacherName) : "Profesor"}
              </span>
              !
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 capitalize flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{displayDate}</span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span>Gestiona tus grupos y revisa el progreso académico</span>
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-sm">
              <div className="p-2 rounded-xl bg-primary/15 text-primary">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                  {groups?.length || 0}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                  Grupos Asignados
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Group Manager Container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <GroupManager
          groups={groups}
          scheduleStartDate={scheduleStartDate}
          scheduleEndDate={scheduleEndDate}
        />
      </motion.div>
    </div>
  );
}
