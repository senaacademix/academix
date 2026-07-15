"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

import { settingsService } from "../services/settingsService";
import { revalidatePath } from "next/cache";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getSettingsAction() {
    return await settingsService.getSettings();
}

export async function updateSettingsAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
        throw new Error("Unauthorized");
    }

    const limitRaw = formData.get("studentDailyLimit");
    const studentDailyLimit = limitRaw ? parseInt(limitRaw as string, 10) : null;

    const limitWeekRaw = formData.get("limitAttendanceToCurrentWeek");
    const limitAttendanceToCurrentWeek = limitWeekRaw === "true";

    const maxHoursRaw = formData.get("maxTeacherHours");
    const maxTeacherHours = maxHoursRaw ? parseInt(maxHoursRaw as string, 10) : 40;

    const scheduleStartDateRaw = formData.get("scheduleStartDate");
    const scheduleStartDate = scheduleStartDateRaw ? new Date(scheduleStartDateRaw as string + "T12:00:00") : null;

    const scheduleEndDateRaw = formData.get("scheduleEndDate");
    const scheduleEndDate = scheduleEndDateRaw ? new Date(scheduleEndDateRaw as string + "T12:00:00") : null;

    const rawData = {
        institutionName: formData.get("institutionName") as string,
        institutionLogo: formData.get("institutionLogo") as string,
        institutionHeroImage: formData.get("institutionHeroImage") as string,
        footerText: formData.get("footerText") as string,
        studentDailyLimit: studentDailyLimit !== null && !isNaN(studentDailyLimit) ? studentDailyLimit : null,
        limitAttendanceToCurrentWeek: limitAttendanceToCurrentWeek,
        scheduleTitle: formData.get("scheduleTitle") as string || "Horario Académico",
        scheduleStartDate: scheduleStartDate,
        scheduleEndDate: scheduleEndDate,
        maxTeacherHours: maxTeacherHours,
    };

    const data: any = {};
    for (const [key, value] of Object.entries(rawData)) {
        if (value !== undefined && value !== null) {
            data[key] = value;
        } else if (value === null && (key === "scheduleStartDate" || key === "scheduleEndDate")) {
            data[key] = null;
        }
    }

    const result = await settingsService.updateSettings(data);

    // Audit log
    try {
        const { auditLogger } = await import("../services/auditLogger");
        await auditLogger.log({
            action: "UPDATE",
            entity: "SYSTEM",
            entityId: "settings",
            userId: session.user.id,
            userName: session.user.name || "Admin",
            userRole: session.user.role,
            description: "Configuración del sistema actualizada",
            success: true
        });
    } catch (error) {
        console.error("Failed to log settings update:", error);
    }

    revalidatePath("/");
    revalidatePath("/dashboard/admin/settings");
    return result;
}


