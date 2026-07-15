import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ScheduleEventManagement } from "@/features/admin/components/ScheduleEventManagement";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Gestión de Eventos y Festivos | AcademiX",
    description: "Configuración global de eventos especiales, festivos y fechas no lectivas de la institución.",
};

export default async function AdminEventsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard/student");
    }

    const settings = await prisma.systemSettings.findUnique({ where: { id: "settings" } });

    let scheduleStartDate = settings?.scheduleStartDate;
    let scheduleEndDate = settings?.scheduleEndDate;

    if (!scheduleStartDate || !scheduleEndDate) {
        const programs = await prisma.program.findMany({
            where: {
                startDate: { not: null },
                endDate: { not: null }
            },
            select: {
                startDate: true,
                endDate: true
            }
        });

        if (programs.length > 0) {
            const startDates = programs.map(p => new Date(p.startDate!).getTime());
            const endDates = programs.map(p => new Date(p.endDate!).getTime());
            scheduleStartDate = new Date(Math.min(...startDates));
            scheduleEndDate = new Date(Math.max(...endDates));
        } else {
            const currentYear = new Date().getFullYear();
            scheduleStartDate = new Date(currentYear, 0, 1);
            scheduleEndDate = new Date(currentYear, 11, 31);
        }
    }

    return (
        <div className="absolute inset-0 overflow-hidden bg-background z-20">
            <ScheduleEventManagement 
                isObserver={false} 
                scheduleStartDate={scheduleStartDate ? scheduleStartDate.toISOString() : null}
                scheduleEndDate={scheduleEndDate ? scheduleEndDate.toISOString() : null}
            />
        </div>
    );
}
