import { ScheduleDashboard } from "@/features/schedule/components/ScheduleDashboard";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata = {
    title: "Horario | AcademiX",
    description: "Visualiza tu horario de clases y gestiona tu disponibilidad semanal.",
};

export default function TeacherSchedulePage() {
    return (
        <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 min-h-screen">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Horario y Configuración Académica</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Visualiza tu horario, configura tu disponibilidad y declara las materias que dictas.
                </p>
            </div>
            <TooltipProvider>
                <ScheduleDashboard />
            </TooltipProvider>
        </div>
    );
}
