import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TeacherBank } from "@/features/admin/components/TeacherBank";
import { getAllUsersAction } from "@/app/admin-actions";

export default async function AdminTeachersPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard/student");
    }

    const { users: allUsers, total } = await getAllUsersAction({ role: "teacher", limit: 500 });

    const mappedTeachers = allUsers.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: new Date(user.createdAt),
        profile: user.profile ? {
            identificacion: user.profile.identificacion,
            nombres: user.profile.nombres,
            apellido: user.profile.apellido,
            telefono: user.profile.telefono,
        } : null,
        availabilityLocked: user.availabilityLocked ?? false,
        qualifiedCoursesLocked: user.qualifiedCoursesLocked ?? false,
        programs: (user.programs ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
        })),
        qualifiedCourses: (user.qualifiedCourses ?? []).map((c: any) => ({
            id: c.id,
            title: c.title,
            schedules: (c.schedules ?? []).map((s: any) => ({
                id: s.id,
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime,
                endTime: s.endTime,
            })),
            group: c.group ? { id: c.group.id, name: c.group.name } : null,
            period: c.period ? {
                id: c.period.id,
                name: c.period.name,
                program: c.period.program ? { id: c.period.program.id, name: c.period.program.name } : null,
            } : null,
        })),
        coursesTaught: (user.coursesTaught ?? []).map((c: any) => ({
            id: c.id,
            title: c.title,
            schedules: (c.schedules ?? []).map((s: any) => ({
                id: s.id,
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime,
                endTime: s.endTime,
            })),
            group: c.group ? { id: c.group.id, name: c.group.name } : null,
            period: c.period ? {
                id: c.period.id,
                name: c.period.name,
                program: c.period.program ? { id: c.period.program.id, name: c.period.program.name } : null,
            } : null,
        })),
        availabilities: (user.availabilities ?? []).map((a: any) => ({
            id: a.id,
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
        })),
    }));

    return (
        <div className="p-8">
            <TeacherBank initialTeachers={mappedTeachers} totalCount={total} />
        </div>
    );
}

