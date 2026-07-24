import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TeacherDashboard } from "@/features/teacher/components/TeacherDashboard";
import { courseService } from "@/features/teacher/services/courseService";

import prisma from "@/lib/prisma";

import { getFormattedTodayDate } from "@/lib/dateUtils";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as any;
  const role = Array.isArray(user?.roles) ? user?.roles[0] : user?.role;

  if (!session || (role !== "teacher" && role !== "admin")) {
    redirect("/signin");
  }

  const courses = await courseService.getTeacherCourses(session.user.id);
  const groups = await courseService.getTeacherGroups(session.user.id);

  const reqHeaders = await headers();
  const timezone = reqHeaders.get("x-vercel-ip-timezone") || "America/Bogota";

  const currentDate = new Date().toISOString();
  const formattedDate = getFormattedTodayDate(timezone);

  return (
    <TeacherDashboard 
      courses={courses} 
      groups={groups}
      currentDate={currentDate} 
      teacherName={session.user.name}
      formattedDate={formattedDate}
    />
  );
}
