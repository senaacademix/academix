import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { StudentManager } from "@/features/teacher/components/StudentManager";
import { courseService } from "@/features/teacher/services/courseService";
import { TabsContent } from "@/components/ui/tabs";
import { Roulette } from "@/features/teacher/components/Roulette";
import { GroupGenerator } from "@/features/teacher/components/GroupGenerator";
import { GroupContentShare } from "@/features/teacher/components/GroupContentShare";
import { sharedContentService } from "@/features/teacher/services/sharedContentService";
import { GradesManager } from "@/features/teacher/components/GradesManager";
import { gradeService } from "@/features/teacher/services/gradeService";
import { CourseStatistics } from "@/features/teacher/components/CourseStatistics";

export default async function Page({ 
    params,
    searchParams 
}: { 
    params: Promise<{ courseId: string }>,
    searchParams: Promise<{ tab?: string }> 
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "teacher") {
        redirect("/signin");
    }

    const { courseId } = await params;
    const { tab } = await searchParams;
    const activeTab = tab || "students";

    const course = await courseService.getCourseById(courseId);

    if (!course) {
        return <div className="p-8 text-center font-bold">Curso no encontrado</div>;
    }

    const [
        studentsResult, 
        sharedContentsResult, 
        gradesDataResult, 
    ] = await Promise.allSettled([
        courseService.getCourseStudents(courseId),
        sharedContentService.getByCourse(courseId),
        gradeService.getCourseGradesData(courseId),
    ]);

    // Handle results with fallbacks
    const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
    const sharedContents = sharedContentsResult.status === 'fulfilled' ? sharedContentsResult.value : [];
    const gradesData = gradesDataResult.status === 'fulfilled' ? gradesDataResult.value : { students: [], activities: [], categories: [] };

    if (gradesDataResult.status === 'rejected') console.error("Error loading grades:", gradesDataResult.reason);

    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar flex flex-col min-h-0">
            <TabsContent value="students" className="mt-0 outline-none">
                <StudentManager 
                    courseId={courseId} 
                    initialStudents={students} 
                    courseTitle={course.title}
                />
            </TabsContent>
            <TabsContent value="roulette" className="mt-0 outline-none">
                <Roulette students={students} courseId={courseId} />
            </TabsContent>
            <TabsContent value="groups" className="mt-0 outline-none">
                <GroupGenerator students={students} />
            </TabsContent>

            <TabsContent value="grades" className="mt-0 outline-none">
                <GradesManager courseId={courseId} initialData={gradesData} courseTitle={course.title} />
            </TabsContent>
            <TabsContent value="stats" className="mt-0 outline-none">
                <CourseStatistics 
                    courseId={courseId}
                    courseTitle={course.title}
                    gradesData={gradesData}
                />
            </TabsContent>
            <TabsContent value="share" className="mt-0 outline-none">
                <GroupContentShare courseId={courseId} initialContent={sharedContents} />
            </TabsContent>
        </div>
    );
}
