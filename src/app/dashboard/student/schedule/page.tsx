import { ScheduleView } from "@/features/schedule/components/ScheduleView";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata = {
    title: "Mi Horario | AcademiX",
    description: "Visualiza el horario semanal de todas tus clases programadas.",
};

export default function StudentSchedulePage() {
    return (
        <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 min-h-screen">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Mi Horario</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Visualiza el horario semanal de todas tus clases programadas de acuerdo a tu grupo.
                </p>
            </div>
            <TooltipProvider>
                <ScheduleView />
            </TooltipProvider>
        </div>
    );
}
