import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getProgramsAction } from "@/features/admin/actions/academicActions";
import { getEnvironmentsAction } from "@/features/admin/actions/environmentActions";
import { SchedulePlanning } from "@/features/admin/components/SchedulePlanning";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Programación de Horarios | AcademiX",
    description: "Tablero de distribución horaria y gestor de asignación de cursos y profesores.",
};

export default async function AdminSchedulePage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard/student");
    }

    const programs = await getProgramsAction();
    const environments = await getEnvironmentsAction();
    const settings = await prisma.systemSettings.findUnique({ where: { id: "settings" } });

    // Map programs/groups to match the frontend typescript interface
    const mappedPrograms = programs.map((program: any) => ({
        id: program.id,
        name: program.name,
        description: program.description,
        teachers: program.teachers.map((t: any) => ({
            id: t.id,
            name: t.name,
            email: t.email,
            availabilityLocked: t.availabilityLocked,
            qualifiedCoursesLocked: t.qualifiedCoursesLocked,
            availabilities: t.availabilities || [],
            qualifiedCourses: t.qualifiedCourses || []
        })),
        periods: program.periods.map((period: any) => ({
            id: period.id,
            name: period.name,
            courses: period.courses.map((c: any) => ({
                id: c.id,
                title: c.title,
                groupId: c.groupId,
                periodId: c.periodId
            }))
        })),
        groups: program.groups.map((group: any) => ({
            id: group.id,
            name: group.name,
            description: group.description,
            environmentId: group.environmentId,
            environment: group.environment ? {
                id: group.environment.id,
                name: group.environment.name,
                capacity: group.environment.capacity,
                location: group.environment.location,
                resources: group.environment.resources
            } : null,
            startTime: group.startTime,
            endTime: group.endTime,
            periodId: group.periodId,
            period: group.period ? {
                id: group.period.id,
                name: group.period.name,
                courses: group.period.courses.map((c: any) => ({
                    id: c.id,
                    title: c.title,
                    groupId: c.groupId
                }))
            } : null,
            courses: group.courses.map((c: any) => ({
                id: c.id,
                title: c.title,
                teacherId: c.teacherId,
                teacher: c.teacher ? {
                    id: c.teacher.id,
                    name: c.teacher.name,
                    email: c.teacher.email
                } : null,
                schedules: c.schedules.map((s: any) => ({
                    id: s.id,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime
                }))
            }))
        }))
    }));

    const draftTeachers = await prisma.user.findMany({
        where: {
            role: "teacher",
            OR: [
                { availabilityLocked: false },
                { qualifiedCoursesLocked: false }
            ]
        },
        select: { id: true, name: true, email: true }
    });

    return (
        <div className="absolute inset-0 overflow-hidden bg-background z-20">
            <SchedulePlanning 
                initialPrograms={mappedPrograms} 
                initialEnvironments={environments} 
                initialSchedulesPublished={settings?.schedulesPublished ?? false}
                initialScheduleTitle={settings?.scheduleTitle ?? "Horario Académico"}
                initialScheduleStartDate={settings?.scheduleStartDate ?? null}
                initialScheduleEndDate={settings?.scheduleEndDate ?? null}
                draftTeachers={draftTeachers}
            />
        </div>
    );
}
