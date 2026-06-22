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

    const rawData = {
        institutionName: formData.get("institutionName") as string,
        institutionLogo: formData.get("institutionLogo") as string,
        institutionHeroImage: formData.get("institutionHeroImage") as string,
        footerText: formData.get("footerText") as string,
    };

    const data: any = {};
    for (const [key, value] of Object.entries(rawData)) {
        if (value !== null) {
            data[key] = value;
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


