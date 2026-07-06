"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { courseService } from "../../teacher/services/courseService";
import { toUTCStartOfDay } from "@/lib/dateUtils";
import { settingsService } from "@/features/admin/services/settingsService";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getScheduleViewAction() {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const settings = await settingsService.getSettings();
    const events = await prisma.scheduleEvent.findMany();

    if (!settings.schedulesPublished) {
        return {
            courses: [],
            events: events,
            scheduleTitle: settings.scheduleTitle,
            scheduleStartDate: settings.scheduleStartDate,
            scheduleEndDate: settings.scheduleEndDate
        };
    }

    const userId = session.user.id;
    const role = session.user.role;

    let courses: any[] = [];
    if (role === "teacher") {
        courses = await courseService.getTeacherCourses(userId);
    } else {
        courses = await courseService.getStudentCourses(userId);
    }

    // Retrieve program dates (start, end, title)
    let scheduleStartDate = settings.scheduleStartDate;
    let scheduleEndDate = settings.scheduleEndDate;
    let scheduleTitle = settings.scheduleTitle;

    if (role === "teacher") {
        const teacherUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { programs: true }
        });
        const firstProgram = teacherUser?.programs?.[0];
        if (firstProgram) {
            if (firstProgram.startDate) scheduleStartDate = firstProgram.startDate;
            if (firstProgram.endDate) scheduleEndDate = firstProgram.endDate;
            if (firstProgram.scheduleTitle) scheduleTitle = firstProgram.scheduleTitle;
        }
    } else {
        const studentUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { group: { include: { program: true } } }
        });
        if (studentUser?.group?.program) {
            if (studentUser.group.program.startDate) scheduleStartDate = studentUser.group.program.startDate;
            if (studentUser.group.program.endDate) scheduleEndDate = studentUser.group.program.endDate;
            if (studentUser.group.program.scheduleTitle) scheduleTitle = studentUser.group.program.scheduleTitle;
        } else {
            // Fallback: check program from any of their enrolled courses
            const courseIds = courses.map((c: any) => c.id);
            const program = await prisma.program.findFirst({
                where: {
                    groups: {
                        some: {
                            courses: {
                                some: {
                                    id: { in: courseIds }
                                }
                            }
                        }
                    }
                }
            });
            if (program) {
                if (program.startDate) scheduleStartDate = program.startDate;
                if (program.endDate) scheduleEndDate = program.endDate;
                if (program.scheduleTitle) scheduleTitle = program.scheduleTitle;
            }
        }
    }

    return {
        courses,
        events,
        scheduleTitle: scheduleTitle || "Horario Académico",
        scheduleStartDate,
        scheduleEndDate
    };
}
