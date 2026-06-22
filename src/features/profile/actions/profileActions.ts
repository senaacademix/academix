"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getProfileAction() {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const { profileService } = await import("../services/profileService");
    return await profileService.getProfile(session.user.id);
}

export async function updateProfileAction(formData: FormData) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const identificacion = formData.get("identificacion") as string;
    const nombres = formData.get("nombres") as string;
    const apellido = formData.get("apellido") as string;
    const telefono = formData.get("telefono") as string | null;
    const dataProcessingConsent = formData.get("dataProcessingConsent") === "true";

    const { profileService } = await import("../services/profileService");
    await profileService.upsertProfile(session.user.id, {
        identificacion,
        nombres,
        apellido,
        telefono: telefono || undefined,
        dataProcessingConsent,
        dataProcessingConsentDate: dataProcessingConsent ? new Date() : undefined
    });

    revalidatePath("/");
}

export async function checkIfPasswordIsDocAction() {
    const session = await getSession();
    if (!session?.user) {
        return false;
    }

    if (session.user.role !== "student") {
        return false;
    }

    const studentId = session.user.id;

    const student = await prisma.user.findUnique({
        where: { id: studentId },
        include: {
            profile: true,
            accounts: {
                where: { providerId: "credential" }
            }
        }
    });

    if (!student || !student.profile?.identificacion || student.accounts.length === 0) {
        return false;
    }

    const docNumber = student.profile.identificacion.trim();
    const hashedPassword = student.accounts[0].password;

    if (!hashedPassword) {
        return false;
    }

    const { verifyPassword } = await import("better-auth/crypto");
    try {
        const isMatch = await verifyPassword({
            hash: hashedPassword,
            password: docNumber
        });
        return isMatch;
    } catch (e) {
        console.error("[Profile] Error verifying password against identification:", e);
        return false;
    }
}

export async function changeUserPasswordAction(data: { currentPassword?: string; newPassword: string; skipVerification?: boolean }) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    if (data.newPassword.length < 8) {
        throw new Error("La nueva contraseña debe tener al menos 8 caracteres");
    }

    const userId = session.user.id;

    if (!data.skipVerification) {
        if (!data.currentPassword) {
            throw new Error("La contraseña actual es obligatoria");
        }

        const account = await prisma.account.findFirst({
            where: {
                userId,
                providerId: "credential"
            }
        });

        if (!account || !account.password) {
            throw new Error("No se encontró una cuenta con credenciales");
        }

        const { verifyPassword } = await import("better-auth/crypto");
        const isMatch = await verifyPassword({
            hash: account.password,
            password: data.currentPassword
        });

        if (!isMatch) {
            throw new Error("La contraseña actual es incorrecta");
        }
    }

    const { hashPassword } = await import("better-auth/crypto");
    const hashedPassword = await hashPassword(data.newPassword);

    await prisma.account.updateMany({
        where: {
            userId,
            providerId: "credential"
        },
        data: {
            password: hashedPassword
        }
    });

    revalidatePath("/");
    return { success: true };
}

