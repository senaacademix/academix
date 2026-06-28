import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AcademicManagement } from "@/features/admin/components/AcademicManagement";
import { getAllCoursesAdminAction, getAllUsersAction } from "@/app/admin-actions";

export default async function AdminCoursesPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard/student");
    }

    const [{ courses, total }, { users: allUsers }] = await Promise.all([
        getAllCoursesAdminAction({ limit: 100 }),
        getAllUsersAction({ role: "teacher", limit: 500 })
    ]);

    // Map courses to match UI expected types
    const mappedCourses = courses.map((course: any) => ({
        ...course,
        createdAt: new Date(course.createdAt),
        startDate: course.startDate ? new Date(course.startDate) : null,
        endDate: course.endDate ? new Date(course.endDate) : null,
    }));

    const mappedTeachers = allUsers.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
    }));

    return (
        <div className="p-4 sm:p-8">
            <AcademicManagement
                initialCourses={mappedCourses}
                teachers={mappedTeachers}
                totalCount={total}
            />
        </div>
    );
}
