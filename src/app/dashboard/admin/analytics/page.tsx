import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getProgramsAction } from "@/features/admin/actions/academicActions";
import { getEnvironmentsAction } from "@/features/admin/actions/environmentActions";
import { AdvancedAnalyticsView } from "@/features/admin/components/AdvancedAnalyticsView";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Reportes y Analítica Avanzada | AcademiX",
    description: "Tablero interactivo de análisis horaria, carga de instructores y ocupación de aulas.",
};

export default async function AdminAnalyticsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard/student");
    }

    const programs = await getProgramsAction();
    const environments = await getEnvironmentsAction();

    // Map programs/groups to match the frontend AdvancedAnalyticsView data structures
    const mappedPrograms = programs.map((program: any) => ({
        id: program.id,
        name: program.name,
        description: program.description,
        maxTeacherHours: program.maxTeacherHours,
        startDate: program.startDate ? program.startDate.toISOString() : null,
        endDate: program.endDate ? program.endDate.toISOString() : null,
        teachers: program.teachers.map((t: any) => ({
            id: t.id,
            name: t.name,
            email: t.email,
        })),
        periods: program.periods.map((period: any) => ({
            id: period.id,
            name: period.name,
        })),
        groups: program.groups.map((group: any) => ({
            id: group.id,
            name: group.name,
            description: group.description,
            environmentId: group.environmentId,
            environment: group.environment ? {
                id: group.environment.id,
                name: group.environment.name,
            } : null,
            startTime: group.startTime,
            endTime: group.endTime,
            periodId: group.periodId,
            period: group.period ? {
                id: group.period.id,
                name: group.period.name,
            } : null,
            courses: group.courses.map((c: any) => ({
                id: c.id,
                title: c.title,
                teacherId: c.teacherId,
                weeklyHours: c.weeklyHours,
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
        })),
        environments: program.environments ? program.environments.map((env: any) => ({
            id: env.id,
            name: env.name,
            capacity: env.capacity,
            location: env.location,
            resources: env.resources,
            programId: env.programId
        })) : []
    }));

    return (
        <div className="w-full flex-1 flex flex-col bg-background relative overflow-hidden">
            {/* Background gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[35%] h-[35%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
            
            <AdvancedAnalyticsView 
                programs={mappedPrograms} 
                environments={environments} 
                isObserver={false}
            />
        </div>
    );
}
