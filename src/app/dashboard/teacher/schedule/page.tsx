import { ScheduleDashboard } from "@/features/schedule/components/ScheduleDashboard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Horario | AcademiX",
  description: "Visualiza tu horario de clases y gestiona tu disponibilidad semanal.",
};

export default function TeacherSchedulePage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8 min-h-screen">
      {/* AI Canvas Header Adaptativo al Tema Seleccionado */}
      <div className="relative rounded-3xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 backdrop-blur-2xl shadow-md dark:shadow-xl overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gestión de Horarios y Disponibilidad</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Horario y{" "}
            <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-primary dark:from-white dark:via-slate-200 dark:to-primary bg-clip-text text-transparent">
              Configuración Académica
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Visualiza tu horario de clases asignado, configura tus franjas de disponibilidad semanal y gestiona las materias que estás habilitado para dictar.
          </p>
        </div>
      </div>

      <TooltipProvider>
        <ScheduleDashboard />
      </TooltipProvider>
    </div>
  );
}
