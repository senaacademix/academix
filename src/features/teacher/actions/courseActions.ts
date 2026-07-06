"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { courseService } from "../services/courseService";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { parseISOAsUTC } from "@/lib/dateUtils";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function createCourseAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
        throw new Error("Unauthorized");
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const externalUrl = formData.get("externalUrl") as string;
    const docProjectIdRaw = formData.get("docProjectId") as string;
    const schedulesStr = formData.get("schedules") as string;
    const periodId = (formData.get("periodId") as string) || undefined;
    const badge = (formData.get("badge") as string) || undefined;

    // Parse schedules if provided
    let schedules;
    if (schedulesStr) {
        try {
            schedules = JSON.parse(schedulesStr);
        } catch (e) {
            console.error("Failed to parse schedules", e);
        }
    }

    const weeklyHoursRaw = formData.get("weeklyHours") as string;
    const weeklyHours = weeklyHoursRaw ? parseFloat(weeklyHoursRaw) : 0;

    const docProjectId = docProjectIdRaw === "none" ? undefined : (docProjectIdRaw || undefined);

    const course = await courseService.createCourse({
        title,
        description,
        externalUrl: externalUrl || undefined,
        docProjectId,
        periodId,
        schedules,
        weeklyHours,
        badge,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.logCourseCreate(
        course.id,
        title,
        session.user.id,
        session.user.name || "Usuario"
    );

    revalidatePath("/dashboard/teacher");
}

export async function cloneCourseAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
        throw new Error("Unauthorized");
    }

    const sourceCourseId = formData.get("sourceCourseId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const externalUrl = formData.get("externalUrl") as string;
    const docProjectIdRaw = formData.get("docProjectId") as string;
    const schedulesStr = formData.get("schedules") as string;

    const docProjectId = docProjectIdRaw === "none" ? undefined : (docProjectIdRaw || undefined);

    // Parse schedules if provided
    let schedules;
    if (schedulesStr) {
        try {
            schedules = JSON.parse(schedulesStr);
        } catch (e) {
            console.error("Failed to parse schedules", e);
        }
    }

    const periodId = (formData.get("periodId") as string) || undefined;

    const course = await courseService.cloneCourse(sourceCourseId, {
        title,
        description,
        externalUrl: externalUrl || undefined,
        docProjectId,
        periodId,
        schedules,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.logCourseCreate(
        course.id,
        title,
        session.user.id,
        session.user.name || "Usuario"
    );

    revalidatePath("/dashboard/teacher");
}

export async function updateCourseAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
        throw new Error("Unauthorized");
    }

    const courseId = formData.get("courseId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const externalUrl = formData.get("externalUrl") as string;
    const docProjectIdRaw = formData.get("docProjectId") as string;
    const schedulesStr = formData.get("schedules") as string;
    const badge = formData.get("badge") as string;

    const weeklyHoursRaw = formData.get("weeklyHours") as string;
    const weeklyHours = weeklyHoursRaw ? parseFloat(weeklyHoursRaw) : 0;

    const docProjectId = docProjectIdRaw === "none" ? null : (docProjectIdRaw || undefined);

    // Parse schedules if provided
    let schedules;
    if (schedulesStr) {
        try {
            schedules = JSON.parse(schedulesStr);
        } catch (e) {
            console.error("Failed to parse schedules", e);
        }
    }

    const periodId = (formData.get("periodId") as string) || undefined;

    await courseService.updateCourse(courseId, {
        title,
        description,
        externalUrl: externalUrl === "none" ? null : (externalUrl || undefined),
        docProjectId,
        periodId: periodId === "none" ? null : (periodId || undefined),
        schedules,
        weeklyHours,
        badge: badge || null,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.logCourseUpdate(
        courseId,
        title,
        session.user.id,
        session.user.name || "Profesor",
        { title, description, externalUrl }
    );

    revalidatePath("/dashboard/teacher");
    revalidatePath("/dashboard/admin");
}

export async function deleteCourseAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
        throw new Error("Unauthorized");
    }

    const courseId = formData.get("courseId") as string;
    const confirmText = formData.get("confirmText") as string;

    if (confirmText !== "ELIMINAR") {
        throw new Error("Confirmación incorrecta");
    }

    // Get course info before deletion
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true, teacherId: true }
    });

    await courseService.deleteCourse(courseId);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.logCourseDelete(
        courseId,
        course?.title || "Materia",
        session.user.id,
        session.user.name || "Profesor"
    );

    revalidatePath("/dashboard/teacher");
    revalidatePath("/dashboard/admin");
}


