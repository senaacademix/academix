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

    const data: any = {};

    if (formData.has("institutionName")) {
        data.institutionName = formData.get("institutionName") as string;
    }
    if (formData.has("institutionLogo")) {
        data.institutionLogo = formData.get("institutionLogo") as string;
    }
    if (formData.has("institutionHeroImage")) {
        data.institutionHeroImage = formData.get("institutionHeroImage") as string;
    }
    if (formData.has("footerText")) {
        data.footerText = formData.get("footerText") as string;
    }
    if (formData.has("studentDailyLimit")) {
        const limitRaw = formData.get("studentDailyLimit");
        data.studentDailyLimit = limitRaw ? parseInt(limitRaw as string, 10) : null;
    }
    if (formData.has("limitAttendanceToCurrentWeek")) {
        const limitWeekRaw = formData.get("limitAttendanceToCurrentWeek");
        data.limitAttendanceToCurrentWeek = limitWeekRaw === "true";
    }
    if (formData.has("scheduleTitle")) {
        data.scheduleTitle = formData.get("scheduleTitle") as string || "Horario Académico";
    }
    if (formData.has("scheduleStartDate")) {
        const scheduleStartDateRaw = formData.get("scheduleStartDate");
        data.scheduleStartDate = scheduleStartDateRaw ? new Date(scheduleStartDateRaw as string + "T12:00:00") : null;
    }
    if (formData.has("scheduleEndDate")) {
        const scheduleEndDateRaw = formData.get("scheduleEndDate");
        data.scheduleEndDate = scheduleEndDateRaw ? new Date(scheduleEndDateRaw as string + "T12:00:00") : null;
    }
    if (formData.has("maxTeacherHours")) {
        const maxHoursRaw = formData.get("maxTeacherHours");
        data.maxTeacherHours = maxHoursRaw ? parseInt(maxHoursRaw as string, 10) : 40;
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


