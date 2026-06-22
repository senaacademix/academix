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
            events: [],
            scheduleTitle: settings.scheduleTitle,
            scheduleStartDate: settings.scheduleStartDate,
            scheduleEndDate: settings.scheduleEndDate
        };
    }

    const userId = session.user.id;
    const role = session.user.role;

    let courses = [];
    if (role === "teacher") {
        courses = await courseService.getTeacherCourses(userId);
    } else {
        courses = await courseService.getStudentCourses(userId);
    }

    return {
        courses,
        events,
        scheduleTitle: settings.scheduleTitle,
        scheduleStartDate: settings.scheduleStartDate,
        scheduleEndDate: settings.scheduleEndDate
    };
}
