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

    if (!session || (session.user.role !== "admin" && session.user.role !== "observer")) {
        redirect("/dashboard/student");
    }

    const settings = await prisma.systemSettings.findUnique({ where: { id: "settings" } });

    return (
        <div className="absolute inset-0 overflow-hidden bg-background z-20">
            <ScheduleEventManagement isObserver={session.user.role === "observer"} />
        </div>
    );
}
